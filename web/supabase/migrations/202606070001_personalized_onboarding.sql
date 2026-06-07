-- Personalized onboarding: stop seeding generic placeholder person tags.
--
-- New workspaces previously received generic person tags (Me, Kid 1, Kid 2,
-- Partner, Family) before the user told the app anything about themselves. The
-- redesigned onboarding now collects real names and creates the tags itself, so
-- a new workspace should start with zero person tags.
--
-- Redefining seed_workspace_defaults() in place updates BOTH callers
-- automatically: handle_new_user() (signup trigger) and create_workspace().
-- Neither caller needs editing because both call this function by name.
create or replace function public.seed_workspace_defaults(target_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Person tags are intentionally NOT seeded anymore. Onboarding creates the
  -- real, named tags so users never see "Kid 1" / "Partner" placeholders.

  insert into public.prompt_templates (workspace_id, title, prompt, sort_order, is_default)
  values
    (target_workspace_id, 'Nice things', 'What are 3 nice things that happened today?', 0, true),
    (target_workspace_id, 'Smile', 'What made you smile?', 1, true),
    (target_workspace_id, 'Remember', 'What do you want to remember from today?', 2, true);

  insert into public.reminder_preferences (workspace_id)
  values (target_workspace_id)
  on conflict do nothing;
end;
$$;

revoke execute on function public.seed_workspace_defaults(uuid) from public;

-- One-time cleanup of generic defaults on existing accounts.
-- Only removes the four generic placeholder tags, and only when they have never
-- been attached to an entry or a little detail, so we never destroy real data.
-- Idempotent: the not-exists guards make re-running safe.
delete from public.person_tags pt
where pt.is_default = true
  and lower(pt.name) in ('kid 1', 'kid 2', 'partner', 'family')
  and not exists (
    select 1 from public.entry_person_tags ept where ept.person_tag_id = pt.id
  )
  and not exists (
    select 1 from public.detail_person_tags dpt where dpt.person_tag_id = pt.id
  );
