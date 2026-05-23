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
    raise exception 'That person needs to sign in once before they can be invited';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'You are already a member of this workspace';
  end if;

  return query
    insert into public.workspace_members (workspace_id, user_id, role, invite_email, invitation_state)
    values (target_workspace_id, target_user_id, target_role, normalized_email, 'accepted')
    on conflict (workspace_id, user_id) do update
      set role = excluded.role,
          invite_email = coalesce(public.workspace_members.invite_email, excluded.invite_email),
          invitation_state = 'accepted'
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
