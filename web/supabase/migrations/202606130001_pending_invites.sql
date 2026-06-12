-- Pending-invite consent flow.
--
-- Invitees no longer get instant access: inviting a registered account
-- creates a workspace_members row in state 'invited', which the invitee must
-- accept (or decline) before membership activates. Inviting an email with no
-- account records a row in the new workspace_invites table; when that person
-- signs up, handle_new_user converts it into an 'invited' membership. Both
-- paths return an identical "invited" row to the caller, which closes the
-- account-existence oracle left open by 202606120002.

-- 1. Email invites for addresses that have no account yet.
create table public.workspace_invites (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, email)
);

alter table public.workspace_invites enable row level security;

create policy workspace_invites_member_select on public.workspace_invites
  for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy workspace_invites_owner_insert on public.workspace_invites
  for insert to authenticated with check ((select public.is_workspace_owner(workspace_id)));
create policy workspace_invites_owner_update on public.workspace_invites
  for update to authenticated using ((select public.is_workspace_owner(workspace_id))) with check ((select public.is_workspace_owner(workspace_id)));
create policy workspace_invites_owner_delete on public.workspace_invites
  for delete to authenticated using ((select public.is_workspace_owner(workspace_id)));

-- 2. Invitees can see their own membership rows (any state) and the name of
-- the workspace they were invited to.
create or replace function public.has_workspace_membership_row(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
  );
$$;

revoke execute on function public.has_workspace_membership_row(uuid) from public;
grant execute on function public.has_workspace_membership_row(uuid) to authenticated;

create policy workspace_members_self_select on public.workspace_members
  for select to authenticated using (user_id = (select auth.uid()));
create policy workspaces_any_membership_select on public.workspaces
  for select to authenticated using ((select public.has_workspace_membership_row(id)));

-- 3. Invites create pending memberships instead of instant access.
create or replace function public.invite_workspace_member(target_workspace_id uuid, target_email text, target_role text)
returns table (
  workspace_id uuid,
  user_id uuid,
  role text,
  invite_email text,
  invitation_state text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  normalized_email text;
  target_user_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  if not (select public.is_workspace_owner(target_workspace_id)) then
    raise exception 'Only workspace owners can manage household members';
  end if;

  normalized_email := lower(btrim(coalesce(target_email, '')));
  if normalized_email = '' or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required';
  end if;

  if target_role not in ('owner', 'editor', 'viewer') then
    raise exception 'Unsupported workspace role';
  end if;

  select profiles.id
  into target_user_id
  from public.profiles
  where lower(profiles.email) = normalized_email
  limit 1;

  if target_user_id is null then
    -- No account yet: record the invite by email. The response shape is
    -- identical to the known-account path so the caller learns nothing
    -- about account existence.
    insert into public.workspace_invites (workspace_id, email, role, invited_by)
    values (target_workspace_id, normalized_email, target_role, (select auth.uid()))
    on conflict (workspace_id, email) do update set role = excluded.role;

    return query
      select target_workspace_id, null::uuid, target_role, normalized_email, 'invited'::text, now();
    return;
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'You are already a member of this workspace';
  end if;

  return query
    insert into public.workspace_members (workspace_id, user_id, role, invite_email, invitation_state)
    values (target_workspace_id, target_user_id, target_role, normalized_email, 'invited')
    on conflict (workspace_id, user_id) do update
      set role = excluded.role,
          invite_email = coalesce(public.workspace_members.invite_email, excluded.invite_email),
          -- Re-inviting never downgrades an accepted member back to invited.
          invitation_state = public.workspace_members.invitation_state
    returning
      public.workspace_members.workspace_id,
      public.workspace_members.user_id,
      public.workspace_members.role,
      public.workspace_members.invite_email,
      public.workspace_members.invitation_state,
      public.workspace_members.created_at;
end;
$$;

revoke execute on function public.invite_workspace_member(uuid, text, text) from public;
grant execute on function public.invite_workspace_member(uuid, text, text) to authenticated;

-- 4. New signups pick up invites recorded against their email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  personal_workspace_id uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;

  insert into public.workspaces (name, kind, created_by)
  values ('My journal', 'personal', new.id)
  returning id into personal_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (personal_workspace_id, new.id, 'owner');

  perform public.seed_workspace_defaults(personal_workspace_id);

  insert into public.workspace_members (workspace_id, user_id, role, invite_email, invitation_state)
  select wi.workspace_id, new.id, wi.role, wi.email, 'invited'
  from public.workspace_invites wi
  where wi.email = lower(coalesce(new.email, ''))
  on conflict (workspace_id, user_id) do nothing;

  delete from public.workspace_invites where email = lower(coalesce(new.email, ''));

  return new;
end;
$$;

-- 5. Invitees accept or decline their own pending invite.
create or replace function public.respond_to_workspace_invite(target_workspace_id uuid, accept boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  if accept then
    update public.workspace_members
    set invitation_state = 'accepted'
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and invitation_state = 'invited';
  else
    delete from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
      and invitation_state = 'invited';
  end if;

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'No pending invite for this workspace';
  end if;
  return accept;
end;
$$;

revoke execute on function public.respond_to_workspace_invite(uuid, boolean) from public;
grant execute on function public.respond_to_workspace_invite(uuid, boolean) to authenticated;
