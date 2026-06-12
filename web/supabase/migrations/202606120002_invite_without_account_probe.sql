-- Stop the invite flow from explicitly confirming which emails have accounts.
--
-- invite_workspace_member previously raised a distinct error ("That person
-- needs to sign in once...") when no profile matched the email, which let any
-- workspace owner probe for registered addresses. It now returns an empty
-- result instead; the API responds the same way for unknown emails as for any
-- invite that produced no immediate membership.
--
-- Residual: with today's instant-add semantics a successful add still reveals
-- that the account exists (the member appears in the list). Full closure is
-- the pending-invite consent flow, which records invites by email without
-- confirming account existence to the inviter.
--
-- This migration also fixes a latent bug in the original function: the
-- RETURNS TABLE out-parameters (workspace_id, user_id, role) made the
-- "on conflict (workspace_id, user_id)" clause ambiguous, so every invite of
-- a registered user failed with 'column reference "workspace_id" is
-- ambiguous'. The variable_conflict pragma resolves embedded SQL references
-- to columns.

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
    -- No account probe: report nothing rather than a distinct error.
    return;
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
