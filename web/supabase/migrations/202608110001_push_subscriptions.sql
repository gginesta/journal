-- Working reminders: Web Push subscriptions + reminder timezone.
--
-- push_subscriptions stores one Web Push endpoint per browser/device. Rows are
-- personal — a user manages only their own devices — but carry the workspace
-- whose reminder preferences they follow, so the dispatch route can join
-- reminder_preferences to subscriptions by workspace.
--
-- reminder_preferences.timezone records the IANA zone the reminder times were
-- chosen in. Null (legacy rows, clients that could not resolve a zone) is
-- treated as UTC by the dispatcher.

alter table public.reminder_preferences
  add column timezone text;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index push_subscriptions_workspace_idx on public.push_subscriptions(workspace_id);

create trigger push_subscriptions_touch_updated_at before update on public.push_subscriptions for each row execute function public.touch_updated_at();

alter table public.push_subscriptions enable row level security;

-- Users manage only their own subscription rows. Inserts and updates must also
-- point at a workspace the user actually belongs to.
create policy push_subscriptions_self_select on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_subscriptions_self_insert on public.push_subscriptions for insert to authenticated with check (
  user_id = (select auth.uid())
  and (select public.is_workspace_member(workspace_id))
);
create policy push_subscriptions_self_update on public.push_subscriptions for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (select public.is_workspace_member(workspace_id))
);
create policy push_subscriptions_self_delete on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
