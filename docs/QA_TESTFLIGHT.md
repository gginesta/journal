# Beta Manual QA Checklist

Use this checklist for the consolidated Guided Gratitude Memory System beta. Run the web/Supabase pass before inviting additional household testers. Run the TestFlight/native pass on the exact TestFlight build before inviting the spouse tester, then repeat the core flows on the spouse device.

Record before testing:

- Surface tested: Web demo / Web Supabase / TestFlight
- App version/build number: web `0.2.9` or TestFlight marketing version/build:
- Device model:
- OS/browser version:
- Tester:
- Date:

## Web/Supabase Beta Setup

- Open the deployed web app in a clean browser profile.
- Confirm demo mode is not being used for real beta data.
- Open Settings > Beta and confirm app version `0.2.9` is visible.
- Login with an email magic link.
- Confirm the default personal workspace appears.
- Create or open a household workspace.
- Repeat core checks with a second authenticated account that is an accepted workspace member.
- Confirm demo localStorage from prior UX review does not overwrite authenticated Supabase data.
- Keep notes that identify which account and workspace role performed each sharing or sync action.

## Install And Launch / First Open

- Install from TestFlight on a clean device or after deleting the app.
- Launch the app.
- Confirm Today is the first useful screen.
- Confirm the private beta welcome card appears on first launch and can be dismissed.
- On web, confirm first-run onboarding appears for a clean profile and can be replayed from Settings.
- Force quit and relaunch.
- Confirm there is no crash, blank screen, or signing/iCloud warning that blocks use.

## Balanced Onboarding

- Complete onboarding as solo/self with a personal name or tag.
- Complete onboarding as family with partner and child names.
- Complete onboarding with custom people/themes such as friends, travel, or work wins.
- Confirm family/kid examples are useful but not mandatory or dominant.
- Confirm created names/tags appear as private chips in Today, Memories filters, and Settings.
- Skip onboarding and confirm Today still works with sensible defaults.
- Replay onboarding from Settings and confirm it does not duplicate existing tags unnecessarily.

## Today Entry

- Create today's entry with no photo and at least one nice thing.
- Reopen Today and confirm the text remains.
- Add one photo.
- Add a second photo if the UI allows it.
- Preview each added photo if the UI offers preview.
- Remove one attached photo and confirm the entry still behaves correctly.
- Create or leave a photo-only entry and confirm the UI treats it as a kept memory without forcing reflection text.
- Reload after photo add/remove and confirm thumbnails, hero image, and completion copy remain correct.
- Confirm the beta one-or-two photo limit is explained without blocking text-only journaling.
- Try importing a photo, cancelling, and returning to Today.
- Edit or remove a prompt response.
- Confirm a photo-only or light-text entry still feels accepted by the UI.
- Use a Gratitude Guide suggestion if present.
- Edit the inserted suggestion before saving and confirm the edited text is what appears later.
- Force quit, relaunch, and confirm the entry persists.

## Gratitude Guide And Prompt Packs

- Confirm guide suggestions are optional and do not block free writing.
- Check at least three moods or contexts, including a hard-day/low mood if supported.
- Confirm relationship/family suggestions appear only when appropriate and do not erase solo/self framing.
- Confirm selected suggestions append to editable reflection text rather than replacing existing user text unexpectedly.
- Confirm prompt edits in Settings affect future entries without changing historical prompt text.

## People Tags

- Add default people tags such as Me, child, partner, and family where available.
- Add a custom person/theme tag if the UI supports it.
- Remove a tag and confirm it no longer appears on the entry.
- Reopen the entry detail and confirm tags are still attached.
- Confirm tags read as private labels, not contacts or public profiles.

## Little Details

- Add at least two Little Details.
- Tag one detail to one person and another detail to multiple people.
- Tag one detail to a custom theme/person where available.
- Edit a detail.
- Remove a detail.
- Reopen the entry detail and confirm remaining details and tag assignments persist.

## Little Details Repository

- Open the Little Details repository or details mode if present.
- Add a detail from the repository flow with a selected category.
- Attach the detail to a person/theme tag and save it to today or another visible date.
- Search for unique text from that detail.
- Filter by category.
- Filter by person/theme tag.
- Open the related memory or entry detail and confirm the detail appears there.
- Edit the repository-created detail, reload, and confirm the edit persists.
- Delete a test detail, reload, and confirm it does not return.

## Memories

- Open Memories.
- Confirm saved entries render as photo-first cards where photos exist.
- Open an entry from Memories.
- Filter by a person tag.
- Search for a word from a prompt response.
- Search for a word from a Little Detail.
- Toggle any photo/text filters if present.
- Confirm entries and Little Details associated with that person are discoverable.
- Clear the filter and confirm the broader list returns.
- Open a memory detail and confirm photos, reflections, people, and Little Details are grouped clearly.

## Calendar And Memory Lane

- Open Calendar and move between months if controls are present.
- Confirm days with entries are visually distinct.
- Open an entry from Calendar.
- Open Memory Lane.
- Confirm any look-back card opens the correct entry.
- With a young account, confirm Memory Lane can show early value from yesterday, 3 days ago, 1 week ago, or a recent kept memory instead of only waiting for year-old data.
- With seeded older data, confirm 1 month, 3 month, 6 month, and yearly look-backs appear when available.
- Confirm empty or low-data states are calm and not broken.

## Settings And Privacy

- Confirm cadence/reminder controls match the onboarding choices if onboarding is present.
- Update reminder time if controls are present.
- Review reminder settings and request notification permission only if expected.
- Confirm iCloud/private sync copy is understandable.
- Review app lock, export, delete-all, and Premium surfaces without assuming production readiness.
- On web, confirm workspace switching, prompt editing, people/theme tags, replay onboarding, export, delete workspace entries, and sign out are understandable.
- Open Settings > Beta and confirm the build number is visible.
- Tap Send beta feedback and confirm it opens a mail draft or the system handles unavailable Mail gracefully.
- Do not run delete-all on a tester's only useful beta dataset unless explicitly testing deletion.

## Supabase Access Control

- Account A owner can create, edit, and delete journal content in its workspace.
- Account B accepted member can read shared workspace content.
- Viewer role can read but cannot write entries, photos, prompts, tags, reminders, Little Details, member rows, or Storage objects.
- Editor role can write journal content but cannot manage workspace membership.
- Non-member cannot read workspace rows, journal rows, member rows, Little Details, or private photo objects.
- A workspace cannot be left without at least one accepted owner.
- Private photo paths are scoped under the workspace id and malformed paths fail closed.
- Accepted members can load signed photo previews for the shared workspace.
- Non-members cannot load signed photo previews or infer private Storage object paths.

## Supabase Sync Safety

- In Supabase mode, create an entry, reload, and confirm server data returns.
- In a separate demo profile, create conflicting demo-only content, then log in with a real account and confirm authenticated data is not replaced by demo localStorage.
- With two accepted member accounts, edit different fields on the same entry and record whether the latest saved state is understandable.
- Temporarily disconnect network during an edit, reconnect, reload, and confirm the app does not duplicate entries or drop already-saved server data.
- Confirm photo metadata appears only after upload succeeds; failed photo uploads should not leave broken permanent records.

## Regression Pass

- Relaunch the app after every major flow.
- Rotate text size using iOS Settings if practical and check for obvious clipping.
- Test offline mode by enabling Airplane Mode, creating an entry, relaunching, then disabling Airplane Mode.
- Watch for crashes, missing photos, duplicated entries, broken filters, stuck loading states, or confusing saved-state copy.

## Pass Criteria

- Owner can create and revisit today's memory with photos, people/theme tags, Gratitude Guide text, and Little Details.
- Settings > Beta shows the tested app version and QA notes include it.
- Solo/self, family, and custom onboarding paths all feel valid.
- Little Details are retrievable from both entry detail and repository/search surfaces.
- Supabase beta data remains private to accepted workspace members and roles behave as documented.
- Owner can browse by Memories, Calendar, and Memory Lane.
- Spouse can install the build and complete the same core loop.
- No stop-ship issue from `docs/TESTFLIGHT.md` is present.
