-- Per-person day sections.
--
-- Each household member's reflections live in their own journal_sessions
-- rows. Sync rewrites only the calling user's sessions (plus unowned legacy
-- rows, which the first syncing author adopts), so two members editing the
-- same day never touch each other's responses. Shared entry fields (mood,
-- note, photos, tags, details) keep the existing stale-write guard.

alter table public.journal_sessions
  add column created_by uuid references auth.users(id) on delete set null;

create or replace function public.sync_journal_entry(entry jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry_id uuid := (entry->>'id')::uuid;
  v_workspace_id uuid := (entry->>'workspace_id')::uuid;
  v_base_updated_at timestamptz := nullif(entry->>'base_updated_at', '')::timestamptz;
  v_existing_updated_at timestamptz;
  v_final_updated_at timestamptz;
  v_exists boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  if not (select public.can_edit_workspace(v_workspace_id)) then
    raise exception 'Editor access is required to sync this workspace';
  end if;

  select journal_entries.updated_at
  into v_existing_updated_at
  from public.journal_entries
  where journal_entries.id = v_entry_id
    and journal_entries.workspace_id = v_workspace_id;
  v_exists := found;

  if v_exists then
    if v_base_updated_at is not null and v_existing_updated_at > v_base_updated_at then
      return jsonb_build_object('status', 'stale', 'server_updated_at', v_existing_updated_at);
    end if;

    update public.journal_entries
    set local_date = (entry->>'local_date')::date,
        mood = entry->>'mood',
        note = coalesce(entry->>'note', '')
    where journal_entries.id = v_entry_id
    returning journal_entries.updated_at into v_final_updated_at;
  else
    insert into public.journal_entries (id, workspace_id, local_date, mood, note, created_by, created_at, updated_at)
    values (
      v_entry_id,
      v_workspace_id,
      (entry->>'local_date')::date,
      entry->>'mood',
      coalesce(entry->>'note', ''),
      (select auth.uid()),
      coalesce(nullif(entry->>'created_at', '')::timestamptz, now()),
      coalesce(nullif(entry->>'updated_at', '')::timestamptz, now())
    )
    returning journal_entries.updated_at into v_final_updated_at;
  end if;

  delete from public.entry_person_tags where entry_id = v_entry_id;
  insert into public.entry_person_tags (entry_id, person_tag_id)
  select v_entry_id, tag.value::uuid
  from jsonb_array_elements_text(coalesce(entry->'person_tag_ids', '[]'::jsonb)) as tag;

  -- Per-person scope: rewrite only the caller's sessions, adopting unowned
  -- legacy rows. Other members' sessions are untouched.
  -- (prompt_responses cascade from journal_sessions.)
  delete from public.journal_sessions
  where entry_id = v_entry_id
    and (created_by = (select auth.uid()) or created_by is null);

  insert into public.journal_sessions (id, entry_id, kind, created_by)
  select (s.value->>'id')::uuid, v_entry_id, s.value->>'kind', (select auth.uid())
  from jsonb_array_elements(coalesce(entry->'sessions', '[]'::jsonb)) as s;

  insert into public.prompt_responses (id, session_id, prompt_id, prompt_title, prompt_text, prompt_order, text)
  select
    (r.value->>'id')::uuid,
    (s.value->>'id')::uuid,
    nullif(r.value->>'prompt_id', '')::uuid,
    coalesce(r.value->>'prompt_title', ''),
    coalesce(r.value->>'prompt_text', ''),
    coalesce((r.value->>'prompt_order')::integer, 0),
    coalesce(r.value->>'text', '')
  from jsonb_array_elements(coalesce(entry->'sessions', '[]'::jsonb)) as s
  cross join lateral jsonb_array_elements(coalesce(s.value->'responses', '[]'::jsonb)) as r;

  delete from public.memory_details where entry_id = v_entry_id;
  insert into public.memory_details (id, entry_id, text, category, sort_order)
  select
    (d.value->>'id')::uuid,
    v_entry_id,
    coalesce(d.value->>'text', ''),
    d.value->>'category',
    coalesce((d.value->>'sort_order')::integer, 0)
  from jsonb_array_elements(coalesce(entry->'details', '[]'::jsonb)) as d;

  insert into public.detail_person_tags (detail_id, person_tag_id)
  select (d.value->>'id')::uuid, tag.value::uuid
  from jsonb_array_elements(coalesce(entry->'details', '[]'::jsonb)) as d
  cross join lateral jsonb_array_elements_text(coalesce(d.value->'person_tag_ids', '[]'::jsonb)) as tag;

  delete from public.photo_attachments where entry_id = v_entry_id;
  insert into public.photo_attachments (id, entry_id, storage_path, thumbnail_path, caption, sort_order, byte_size)
  select
    (p.value->>'id')::uuid,
    v_entry_id,
    p.value->>'storage_path',
    p.value->>'thumbnail_path',
    coalesce(p.value->>'caption', ''),
    coalesce((p.value->>'sort_order')::integer, 0),
    nullif(p.value->>'byte_size', '')::integer
  from jsonb_array_elements(coalesce(entry->'photos', '[]'::jsonb)) as p;

  return jsonb_build_object('status', 'applied', 'server_updated_at', v_final_updated_at);
end;
$$;

revoke execute on function public.sync_journal_entry(jsonb) from public;
grant execute on function public.sync_journal_entry(jsonb) to authenticated;
