create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('personal', 'household')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  invite_email text,
  invitation_state text not null default 'accepted' check (invitation_state in ('invited', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.person_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color_hex text not null default '#7C6F64',
  sort_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  prompt text not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  local_date date not null,
  mood text not null default 'good' check (mood in ('low', 'quiet', 'good', 'bright', 'glowing')),
  note text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, local_date)
);

create table public.journal_sessions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  kind text not null check (kind in ('morning', 'evening', 'anytime')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.journal_sessions(id) on delete cascade,
  prompt_id uuid references public.prompt_templates(id) on delete set null,
  prompt_title text not null,
  prompt_text text not null,
  prompt_order integer not null default 0,
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photo_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  width integer,
  height integer,
  byte_size integer,
  created_at timestamptz not null default now()
);

create table public.memory_details (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  text text not null,
  category text not null default 'note' check (category in ('phrase', 'favorite', 'routine', 'milestone', 'quote', 'note')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entry_person_tags (
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  person_tag_id uuid not null references public.person_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, person_tag_id)
);

create table public.detail_person_tags (
  detail_id uuid not null references public.memory_details(id) on delete cascade,
  person_tag_id uuid not null references public.person_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (detail_id, person_tag_id)
);

create table public.reminder_preferences (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  cadence text not null default 'evening' check (cadence in ('evening', 'once_daily', 'morning_evening', 'anytime')),
  reminders_enabled boolean not null default false,
  evening_time time not null default '21:00',
  morning_time time not null default '08:30',
  updated_at timestamptz not null default now()
);

create index workspace_members_user_id_idx on public.workspace_members(user_id);
create unique index person_tags_workspace_lower_name_idx on public.person_tags(workspace_id, lower(name));
create index person_tags_workspace_idx on public.person_tags(workspace_id, sort_order);
create index prompt_templates_workspace_idx on public.prompt_templates(workspace_id, sort_order);
create index journal_entries_workspace_date_idx on public.journal_entries(workspace_id, local_date desc);
create index journal_sessions_entry_idx on public.journal_sessions(entry_id);
create index prompt_responses_session_idx on public.prompt_responses(session_id, prompt_order);
create index photo_attachments_entry_idx on public.photo_attachments(entry_id, sort_order);
create index memory_details_entry_idx on public.memory_details(entry_id, sort_order);
create index entry_person_tags_person_idx on public.entry_person_tags(person_tag_id, entry_id);
create index detail_person_tags_person_idx on public.detail_person_tags(person_tag_id, detail_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger workspaces_touch_updated_at before update on public.workspaces for each row execute function public.touch_updated_at();
create trigger person_tags_touch_updated_at before update on public.person_tags for each row execute function public.touch_updated_at();
create trigger prompt_templates_touch_updated_at before update on public.prompt_templates for each row execute function public.touch_updated_at();
create trigger journal_entries_touch_updated_at before update on public.journal_entries for each row execute function public.touch_updated_at();
create trigger journal_sessions_touch_updated_at before update on public.journal_sessions for each row execute function public.touch_updated_at();
create trigger prompt_responses_touch_updated_at before update on public.prompt_responses for each row execute function public.touch_updated_at();
create trigger memory_details_touch_updated_at before update on public.memory_details for each row execute function public.touch_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
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
      and invitation_state = 'accepted'
  );
$$;

create or replace function public.can_edit_workspace(target_workspace_id uuid)
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
      and invitation_state = 'accepted'
      and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
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
      and invitation_state = 'accepted'
      and role = 'owner'
  );
$$;

create or replace function public.entry_workspace_id(target_entry_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id from public.journal_entries where id = target_entry_id;
$$;

create or replace function public.prompt_template_workspace_id(target_prompt_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id from public.prompt_templates where id = target_prompt_id;
$$;

create or replace function public.person_tag_workspace_id(target_person_tag_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id from public.person_tags where id = target_person_tag_id;
$$;

create or replace function public.session_workspace_id(target_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select journal_entries.workspace_id
  from public.journal_sessions
  join public.journal_entries on journal_entries.id = journal_sessions.entry_id
  where journal_sessions.id = target_session_id;
$$;

create or replace function public.detail_workspace_id(target_detail_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select journal_entries.workspace_id
  from public.memory_details
  join public.journal_entries on journal_entries.id = memory_details.entry_id
  where memory_details.id = target_detail_id;
$$;

create or replace function public.storage_workspace_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(object_name))[1];
  if first_segment is null then
    return null;
  end if;

  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.seed_workspace_defaults(target_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.person_tags (workspace_id, name, color_hex, sort_order, is_default)
  values
    (target_workspace_id, 'Me', '#5B8DEF', 0, true),
    (target_workspace_id, 'Kid 1', '#F4A261', 1, true),
    (target_workspace_id, 'Kid 2', '#2A9D8F', 2, true),
    (target_workspace_id, 'Partner', '#E76F51', 3, true),
    (target_workspace_id, 'Family', '#7C6F64', 4, true)
  on conflict do nothing;

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

create or replace function public.create_workspace(workspace_name text, workspace_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(btrim(workspace_name), '') is null then
    raise exception 'Workspace name is required';
  end if;

  if workspace_kind not in ('personal', 'household') then
    raise exception 'Unsupported workspace kind';
  end if;

  insert into public.workspaces (name, kind, created_by)
  values (btrim(workspace_name), workspace_kind, (select auth.uid()))
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, (select auth.uid()), 'owner');

  perform public.seed_workspace_defaults(new_workspace_id);
  return new_workspace_id;
end;
$$;

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
  return new;
end;
$$;

create or replace function public.prevent_last_workspace_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner'
      and old.invitation_state = 'accepted'
      and not exists (
        select 1
        from public.workspace_members
        where workspace_id = old.workspace_id
          and user_id <> old.user_id
          and role = 'owner'
          and invitation_state = 'accepted'
      )
    then
      raise exception 'A workspace must keep at least one accepted owner';
    end if;

    return old;
  end if;

  if old.role = 'owner'
    and old.invitation_state = 'accepted'
    and (
      new.role is distinct from 'owner'
      or new.invitation_state is distinct from 'accepted'
      or new.workspace_id is distinct from old.workspace_id
      or new.user_id is distinct from old.user_id
    )
    and not exists (
      select 1
      from public.workspace_members
      where workspace_id = old.workspace_id
        and user_id <> old.user_id
        and role = 'owner'
        and invitation_state = 'accepted'
    )
  then
    raise exception 'A workspace must keep at least one accepted owner';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger workspace_members_keep_owner
before update or delete on public.workspace_members
for each row execute function public.prevent_last_workspace_owner_removal();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.person_tags enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_sessions enable row level security;
alter table public.prompt_responses enable row level security;
alter table public.photo_attachments enable row level security;
alter table public.memory_details enable row level security;
alter table public.entry_person_tags enable row level security;
alter table public.detail_person_tags enable row level security;
alter table public.reminder_preferences enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy workspaces_member_select on public.workspaces for select to authenticated using ((select public.is_workspace_member(id)));
create policy workspaces_owner_update on public.workspaces for update to authenticated using ((select public.is_workspace_owner(id))) with check ((select public.is_workspace_owner(id)));

create policy workspace_members_member_select on public.workspace_members for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy workspace_members_owner_insert on public.workspace_members for insert to authenticated with check ((select public.is_workspace_owner(workspace_id)));
create policy workspace_members_owner_update on public.workspace_members for update to authenticated using ((select public.is_workspace_owner(workspace_id))) with check ((select public.is_workspace_owner(workspace_id)));
create policy workspace_members_owner_delete on public.workspace_members for delete to authenticated using ((select public.is_workspace_owner(workspace_id)));

create policy person_tags_member_select on public.person_tags for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy person_tags_editor_insert on public.person_tags for insert to authenticated with check ((select public.can_edit_workspace(workspace_id)));
create policy person_tags_editor_update on public.person_tags for update to authenticated using ((select public.can_edit_workspace(workspace_id))) with check ((select public.can_edit_workspace(workspace_id)));
create policy person_tags_editor_delete on public.person_tags for delete to authenticated using ((select public.can_edit_workspace(workspace_id)));

create policy prompt_templates_member_select on public.prompt_templates for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy prompt_templates_editor_insert on public.prompt_templates for insert to authenticated with check ((select public.can_edit_workspace(workspace_id)));
create policy prompt_templates_editor_update on public.prompt_templates for update to authenticated using ((select public.can_edit_workspace(workspace_id))) with check ((select public.can_edit_workspace(workspace_id)));
create policy prompt_templates_editor_delete on public.prompt_templates for delete to authenticated using ((select public.can_edit_workspace(workspace_id)));

create policy journal_entries_member_select on public.journal_entries for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy journal_entries_editor_insert on public.journal_entries for insert to authenticated with check ((select public.can_edit_workspace(workspace_id)));
create policy journal_entries_editor_update on public.journal_entries for update to authenticated using ((select public.can_edit_workspace(workspace_id))) with check ((select public.can_edit_workspace(workspace_id)));
create policy journal_entries_editor_delete on public.journal_entries for delete to authenticated using ((select public.can_edit_workspace(workspace_id)));

create policy journal_sessions_member_select on public.journal_sessions for select to authenticated using ((select public.is_workspace_member(public.entry_workspace_id(entry_id))));
create policy journal_sessions_editor_insert on public.journal_sessions for insert to authenticated with check ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));
create policy journal_sessions_editor_update on public.journal_sessions for update to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id)))) with check ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));
create policy journal_sessions_editor_delete on public.journal_sessions for delete to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));

create policy prompt_responses_member_select on public.prompt_responses for select to authenticated using ((select public.is_workspace_member(public.session_workspace_id(session_id))));
create policy prompt_responses_editor_insert on public.prompt_responses for insert to authenticated with check (
  (select public.can_edit_workspace(public.session_workspace_id(session_id)))
  and (
    prompt_id is null
    or public.prompt_template_workspace_id(prompt_id) = public.session_workspace_id(session_id)
  )
);
create policy prompt_responses_editor_update on public.prompt_responses for update to authenticated using ((select public.can_edit_workspace(public.session_workspace_id(session_id)))) with check (
  (select public.can_edit_workspace(public.session_workspace_id(session_id)))
  and (
    prompt_id is null
    or public.prompt_template_workspace_id(prompt_id) = public.session_workspace_id(session_id)
  )
);
create policy prompt_responses_editor_delete on public.prompt_responses for delete to authenticated using ((select public.can_edit_workspace(public.session_workspace_id(session_id))));

create policy photo_attachments_member_select on public.photo_attachments for select to authenticated using ((select public.is_workspace_member(public.entry_workspace_id(entry_id))));
create policy photo_attachments_editor_insert on public.photo_attachments for insert to authenticated with check (
  (select public.can_edit_workspace(public.entry_workspace_id(entry_id)))
  and public.storage_workspace_id(storage_path) = public.entry_workspace_id(entry_id)
  and public.storage_workspace_id(thumbnail_path) = public.entry_workspace_id(entry_id)
);
create policy photo_attachments_editor_update on public.photo_attachments for update to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id)))) with check (
  (select public.can_edit_workspace(public.entry_workspace_id(entry_id)))
  and public.storage_workspace_id(storage_path) = public.entry_workspace_id(entry_id)
  and public.storage_workspace_id(thumbnail_path) = public.entry_workspace_id(entry_id)
);
create policy photo_attachments_editor_delete on public.photo_attachments for delete to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));

create policy memory_details_member_select on public.memory_details for select to authenticated using ((select public.is_workspace_member(public.entry_workspace_id(entry_id))));
create policy memory_details_editor_insert on public.memory_details for insert to authenticated with check ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));
create policy memory_details_editor_update on public.memory_details for update to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id)))) with check ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));
create policy memory_details_editor_delete on public.memory_details for delete to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));

create policy entry_person_tags_member_select on public.entry_person_tags for select to authenticated using ((select public.is_workspace_member(public.entry_workspace_id(entry_id))));
create policy entry_person_tags_editor_insert on public.entry_person_tags for insert to authenticated with check (
  (select public.can_edit_workspace(public.entry_workspace_id(entry_id)))
  and public.person_tag_workspace_id(person_tag_id) = public.entry_workspace_id(entry_id)
);
create policy entry_person_tags_editor_update on public.entry_person_tags for update to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id)))) with check (
  (select public.can_edit_workspace(public.entry_workspace_id(entry_id)))
  and public.person_tag_workspace_id(person_tag_id) = public.entry_workspace_id(entry_id)
);
create policy entry_person_tags_editor_delete on public.entry_person_tags for delete to authenticated using ((select public.can_edit_workspace(public.entry_workspace_id(entry_id))));

create policy detail_person_tags_member_select on public.detail_person_tags for select to authenticated using ((select public.is_workspace_member(public.detail_workspace_id(detail_id))));
create policy detail_person_tags_editor_insert on public.detail_person_tags for insert to authenticated with check (
  (select public.can_edit_workspace(public.detail_workspace_id(detail_id)))
  and public.person_tag_workspace_id(person_tag_id) = public.detail_workspace_id(detail_id)
);
create policy detail_person_tags_editor_update on public.detail_person_tags for update to authenticated using ((select public.can_edit_workspace(public.detail_workspace_id(detail_id)))) with check (
  (select public.can_edit_workspace(public.detail_workspace_id(detail_id)))
  and public.person_tag_workspace_id(person_tag_id) = public.detail_workspace_id(detail_id)
);
create policy detail_person_tags_editor_delete on public.detail_person_tags for delete to authenticated using ((select public.can_edit_workspace(public.detail_workspace_id(detail_id))));

create policy reminder_preferences_member_select on public.reminder_preferences for select to authenticated using ((select public.is_workspace_member(workspace_id)));
create policy reminder_preferences_editor_insert on public.reminder_preferences for insert to authenticated with check ((select public.can_edit_workspace(workspace_id)));
create policy reminder_preferences_editor_update on public.reminder_preferences for update to authenticated using ((select public.can_edit_workspace(workspace_id))) with check ((select public.can_edit_workspace(workspace_id)));
create policy reminder_preferences_editor_delete on public.reminder_preferences for delete to authenticated using ((select public.can_edit_workspace(workspace_id)));

insert into storage.buckets (id, name, public)
values ('journal-photos', 'journal-photos', false),
       ('journal-thumbnails', 'journal-thumbnails', false)
on conflict (id) do nothing;

create policy journal_photos_member_select on storage.objects
for select to authenticated using (
  bucket_id in ('journal-photos', 'journal-thumbnails')
  and (select public.is_workspace_member(public.storage_workspace_id(name)))
);

create policy journal_photos_editor_insert on storage.objects
for insert to authenticated with check (
  bucket_id in ('journal-photos', 'journal-thumbnails')
  and (select public.can_edit_workspace(public.storage_workspace_id(name)))
);

create policy journal_photos_editor_update on storage.objects
for update to authenticated using (
  bucket_id in ('journal-photos', 'journal-thumbnails')
  and (select public.can_edit_workspace(public.storage_workspace_id(name)))
) with check (
  bucket_id in ('journal-photos', 'journal-thumbnails')
  and (select public.can_edit_workspace(public.storage_workspace_id(name)))
);

create policy journal_photos_editor_delete on storage.objects
for delete to authenticated using (
  bucket_id in ('journal-photos', 'journal-thumbnails')
  and (select public.can_edit_workspace(public.storage_workspace_id(name)))
);

revoke execute on function public.touch_updated_at() from public;
revoke execute on function public.seed_workspace_defaults(uuid) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.prevent_last_workspace_owner_removal() from public;
revoke execute on function public.create_workspace(text, text) from public;
revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.can_edit_workspace(uuid) from public;
revoke execute on function public.is_workspace_owner(uuid) from public;
revoke execute on function public.entry_workspace_id(uuid) from public;
revoke execute on function public.prompt_template_workspace_id(uuid) from public;
revoke execute on function public.person_tag_workspace_id(uuid) from public;
revoke execute on function public.session_workspace_id(uuid) from public;
revoke execute on function public.detail_workspace_id(uuid) from public;
revoke execute on function public.storage_workspace_id(text) from public;

grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.entry_workspace_id(uuid) to authenticated;
grant execute on function public.prompt_template_workspace_id(uuid) to authenticated;
grant execute on function public.person_tag_workspace_id(uuid) to authenticated;
grant execute on function public.session_workspace_id(uuid) to authenticated;
grant execute on function public.detail_workspace_id(uuid) to authenticated;
grant execute on function public.storage_workspace_id(text) to authenticated;
