\set ON_ERROR_STOP on
-- Two users; the auth trigger creates profiles (and any seeded workspace).
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner@example.com', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'viewer@example.com', '{}');

-- Owner creates a household workspace.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select public.create_workspace('Test household', 'household') as ws_id \gset
reset role;

-- Add second user as viewer.
insert into public.workspace_members (workspace_id, user_id, role, invitation_state)
values (:'ws_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'viewer', 'accepted');

-- Owner needs a person tag and prompt for fk references.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into public.person_tags (id, workspace_id, name, color_hex, sort_order)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', :'ws_id', 'Me', '#8aa29e', 0);
insert into public.prompt_templates (id, workspace_id, title, prompt, sort_order)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', :'ws_id', 'Nice thing', 'One nice thing?', 0);

-- TEST 1: full entry sync applies atomically.
select public.sync_journal_entry(jsonb_build_object(
  'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'workspace_id', :'ws_id',
  'local_date', '2026-06-12',
  'mood', 'good',
  'note', 'A good day',
  'created_at', '2026-06-12T20:00:00Z',
  'updated_at', '2026-06-12T20:00:00Z',
  'base_updated_at', null,
  'person_tag_ids', jsonb_build_array('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'sessions', jsonb_build_array(jsonb_build_object(
    'id', 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'kind', 'evening',
    'responses', jsonb_build_array(jsonb_build_object(
      'id', '99999999-9999-4999-8999-999999999999',
      'prompt_id', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'prompt_title', 'Nice thing',
      'prompt_text', 'One nice thing?',
      'prompt_order', 0,
      'text', 'Coffee on the porch'
    ))
  )),
  'details', jsonb_build_array(jsonb_build_object(
    'id', '88888888-8888-4888-8888-888888888888',
    'text', 'Said "pasghetti" again',
    'category', 'phrase',
    'sort_order', 0,
    'person_tag_ids', jsonb_build_array('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
  )),
  'photos', jsonb_build_array(jsonb_build_object(
    'id', '77777777-7777-4777-8777-777777777777',
    'storage_path', :'ws_id' || '/2026-06-12/77777777-7777-4777-8777-777777777777.jpg',
    'thumbnail_path', :'ws_id' || '/2026-06-12/77777777-7777-4777-8777-777777777777-thumb.jpg',
    'caption', 'Porch light',
    'sort_order', 0,
    'byte_size', 12345
  ))
)) as test1_apply;

select 'rowcounts' as check,
  (select count(*) from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') as entries,
  (select count(*) from public.journal_sessions) as sessions,
  (select count(*) from public.prompt_responses) as responses,
  (select count(*) from public.memory_details) as details,
  (select count(*) from public.detail_person_tags) as detail_tags,
  (select count(*) from public.entry_person_tags) as entry_tags,
  (select count(*) from public.photo_attachments) as photos;

-- TEST 2: stale baseline is refused.
select (public.sync_journal_entry(jsonb_build_object(
  'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'workspace_id', :'ws_id',
  'local_date', '2026-06-12',
  'mood', 'low',
  'note', 'Stale overwrite attempt',
  'updated_at', '2026-06-12T20:05:00Z',
  'base_updated_at', '2026-06-10T00:00:00Z',
  'person_tag_ids', '[]'::jsonb,
  'sessions', '[]'::jsonb,
  'details', '[]'::jsonb,
  'photos', '[]'::jsonb
))->>'status') as test2_expect_stale;

select note as test2_note_unchanged from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

-- TEST 3: a failing rewrite rolls back and leaves prior state intact.
-- (invalid detail category violates the check constraint mid-function)
do $$
begin
  perform public.sync_journal_entry(jsonb_build_object(
    'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'workspace_id', (select workspace_id from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
    'local_date', '2026-06-12',
    'mood', 'bright',
    'note', 'Partial failure attempt',
    'updated_at', '2026-06-12T23:00:00Z',
    'base_updated_at', (select updated_at from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text,
    'person_tag_ids', '[]'::jsonb,
    'sessions', '[]'::jsonb,
    'details', jsonb_build_array(jsonb_build_object(
      'id', '66666666-6666-4666-8666-666666666666',
      'text', 'bad category',
      'category', 'not-a-category',
      'sort_order', 0,
      'person_tag_ids', '[]'::jsonb
    )),
    'photos', '[]'::jsonb
  ));
  raise exception 'test3 FAILED: invalid category was accepted';
exception
  when check_violation then
    raise notice 'test3 ok: rewrite rejected with check violation';
end;
$$;

select 'test3 post-failure state' as check,
  (select note from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') as note_still,
  (select count(*) from public.prompt_responses) as responses_still,
  (select count(*) from public.photo_attachments) as photos_still,
  (select count(*) from public.memory_details) as details_still;

-- TEST 4: a viewer cannot write through the RPC.
set request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
begin
  perform public.sync_journal_entry(jsonb_build_object(
    'id', '55555555-5555-4555-8555-555555555555',
    'workspace_id', (select workspace_id from public.workspace_members where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and role = 'viewer' limit 1),
    'local_date', '2026-06-13',
    'mood', 'good',
    'note', 'viewer write',
    'updated_at', '2026-06-13T20:00:00Z',
    'base_updated_at', null,
    'person_tag_ids', '[]'::jsonb,
    'sessions', '[]'::jsonb,
    'details', '[]'::jsonb,
    'photos', '[]'::jsonb
  ));
  raise exception 'test4 FAILED: viewer write was accepted';
exception
  when raise_exception then
    raise notice 'test4 ok: viewer write refused (%)', sqlerrm;
end;
$$;

-- TEST 5: same-baseline second sync is accepted (no false stale).
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select (public.sync_journal_entry(jsonb_build_object(
  'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'workspace_id', (select workspace_id from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  'local_date', '2026-06-12',
  'mood', 'bright',
  'note', 'Second honest save',
  'updated_at', '2026-06-12T23:30:00Z',
  'base_updated_at', (select updated_at from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text,
  'person_tag_ids', '[]'::jsonb,
  'sessions', '[]'::jsonb,
  'details', '[]'::jsonb,
  'photos', '[]'::jsonb
))->>'status') as test5_expect_applied;

select note as test5_note_updated from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

-- TEST 6: inviting a registered email adds the member.
-- Regression guard: the original function failed every known-email invite
-- with 'column reference "workspace_id" is ambiguous'.
select role as test6_expect_editor
from public.invite_workspace_member(
  (select wm.workspace_id from public.workspace_members wm
   where wm.user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' limit 1),
  'viewer@example.com',
  'editor'
);

-- TEST 7: an unknown email gets the same invited-row response as a known one
-- (no account probe) and records a pending email invite.
select user_id as test7_expect_null_user, invitation_state as test7_expect_invited
from public.invite_workspace_member(:'ws_id', 'nobody@example.com', 'editor');

select count(*) as test7_invite_recorded from public.workspace_invites where email = 'nobody@example.com';

-- TEST 8: inviting a registered account creates a pending membership the
-- invitee can see (but no workspace data access until accepted).
reset role;
insert into auth.users (id, email, raw_user_meta_data)
values ('cccccccc-1111-4ccc-8ccc-cccccccccccc', 'invitee@example.com', '{}');

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select invitation_state as test8_expect_invited
from public.invite_workspace_member(:'ws_id', 'invitee@example.com', 'editor');

set request.jwt.claim.sub = 'cccccccc-1111-4ccc-8ccc-cccccccccccc';
select 'test8 invitee view' as check,
  (select count(*) from public.journal_entries where workspace_id = :'ws_id') as entries_hidden_expect_0,
  (select count(*) from public.workspace_members where workspace_id = :'ws_id' and user_id = 'cccccccc-1111-4ccc-8ccc-cccccccccccc') as own_row_expect_1,
  (select count(*) from public.workspaces where id = :'ws_id') as workspace_name_visible_expect_1;

-- TEST 9: accepting the invite activates membership and read access.
select public.respond_to_workspace_invite(:'ws_id', true) as test9_accept;
select 'test9 after accept' as check,
  (select invitation_state from public.workspace_members where workspace_id = :'ws_id' and user_id = 'cccccccc-1111-4ccc-8ccc-cccccccccccc') as state_expect_accepted,
  (select count(*) > 0 from public.journal_entries where workspace_id = :'ws_id') as entries_visible_expect_t;

-- TEST 10: signing up with an email that has a pending invite converts it
-- into an invited membership.
reset role;
insert into auth.users (id, email, raw_user_meta_data)
values ('dddddddd-1111-4ddd-8ddd-dddddddddddd', 'nobody@example.com', '{}');

select 'test10 signup conversion' as check,
  (select invitation_state from public.workspace_members where user_id = 'dddddddd-1111-4ddd-8ddd-dddddddddddd' and workspace_id = :'ws_id') as state_expect_invited,
  (select count(*) from public.workspace_invites where email = 'nobody@example.com') as invite_cleared_expect_0;

-- TEST 11: per-person sessions — two members keep separate reflections on
-- the same day.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select (public.sync_journal_entry(jsonb_build_object(
  'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'workspace_id', :'ws_id',
  'local_date', '2026-06-12',
  'mood', 'bright',
  'note', 'Shared day',
  'updated_at', '2026-06-13T08:00:00Z',
  'base_updated_at', (select updated_at from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text,
  'person_tag_ids', '[]'::jsonb,
  'sessions', jsonb_build_array(jsonb_build_object(
    'id', '11111111-aaaa-4aaa-8aaa-111111111111',
    'kind', 'evening',
    'responses', jsonb_build_array(jsonb_build_object(
      'id', '11111111-bbbb-4bbb-8bbb-111111111111',
      'prompt_id', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'prompt_title', 'Nice thing', 'prompt_text', 'One nice thing?', 'prompt_order', 0,
      'text', 'Owner reflection'
    ))
  )),
  'details', '[]'::jsonb,
  'photos', '[]'::jsonb
))->>'status') as test11_owner_sync;

set request.jwt.claim.sub = 'cccccccc-1111-4ccc-8ccc-cccccccccccc';
select (public.sync_journal_entry(jsonb_build_object(
  'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'workspace_id', :'ws_id',
  'local_date', '2026-06-12',
  'mood', 'bright',
  'note', 'Shared day',
  'updated_at', '2026-06-13T08:05:00Z',
  'base_updated_at', (select updated_at from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text,
  'person_tag_ids', '[]'::jsonb,
  'sessions', jsonb_build_array(jsonb_build_object(
    'id', '22222222-aaaa-4aaa-8aaa-222222222222',
    'kind', 'evening',
    'responses', jsonb_build_array(jsonb_build_object(
      'id', '22222222-bbbb-4bbb-8bbb-222222222222',
      'prompt_id', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'prompt_title', 'Nice thing', 'prompt_text', 'One nice thing?', 'prompt_order', 0,
      'text', 'Partner reflection'
    ))
  )),
  'details', '[]'::jsonb,
  'photos', '[]'::jsonb
))->>'status') as test11_partner_sync;

select 'test11 both sections kept' as check,
  (select count(*) from public.journal_sessions where entry_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') as sessions_expect_2,
  (select count(*) from public.journal_sessions where entry_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') as owner_session_expect_1,
  (select count(*) from public.journal_sessions where entry_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and created_by = 'cccccccc-1111-4ccc-8ccc-cccccccccccc') as partner_session_expect_1;

-- TEST 12: the owner resyncing their section leaves the partner's intact.
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select (public.sync_journal_entry(jsonb_build_object(
  'id', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'workspace_id', :'ws_id',
  'local_date', '2026-06-12',
  'mood', 'glowing',
  'note', 'Shared day, edited',
  'updated_at', '2026-06-13T08:10:00Z',
  'base_updated_at', (select updated_at from public.journal_entries where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text,
  'person_tag_ids', '[]'::jsonb,
  'sessions', jsonb_build_array(jsonb_build_object(
    'id', '11111111-aaaa-4aaa-8aaa-111111111111',
    'kind', 'evening',
    'responses', jsonb_build_array(jsonb_build_object(
      'id', '11111111-bbbb-4bbb-8bbb-111111111111',
      'prompt_id', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      'prompt_title', 'Nice thing', 'prompt_text', 'One nice thing?', 'prompt_order', 0,
      'text', 'Owner reflection, edited'
    ))
  )),
  'details', '[]'::jsonb,
  'photos', '[]'::jsonb
))->>'status') as test12_owner_resync;

select 'test12 partner survives' as check,
  (select text from public.prompt_responses where id = '22222222-bbbb-4bbb-8bbb-222222222222') as partner_text_expect_kept,
  (select text from public.prompt_responses where id = '11111111-bbbb-4bbb-8bbb-111111111111') as owner_text_expect_edited;
