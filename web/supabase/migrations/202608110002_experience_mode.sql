-- Simple/Full experience mode (SPEC-7): a per-user presentation preference.
--
-- The mode changes only which UI surfaces render — never data, the sync
-- protocol, or the entry model. It lives on the per-user profiles table (not
-- per-workspace): an invited viewer must pick their own density, which is
-- exactly why workspace-scoped reminder_preferences would be the wrong home.
--
-- New users start in 'simple' (the column default keeps the "under a minute"
-- promise structural); everyone who signed up before this migration is
-- grandfathered into 'full' by the backfill below.

alter table public.profiles
  add column experience_mode text not null default 'simple'
  check (experience_mode in ('simple', 'full'));

-- Grandfather existing users: they already know the everything-experience.
update public.profiles set experience_mode = 'full';

-- Writes go through POST /api/profile as the signed-in user. The required
-- self-update RLS policy (profiles_self_update: id = (select auth.uid()) for
-- both using and with check) already exists in 202605210001_initial_schema.sql
-- alongside profiles_self_select, and authenticated already holds table-level
-- update on public.profiles, so no new policy or grant is needed here.
