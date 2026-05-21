# TestFlight Manual QA Checklist

Run this checklist on the exact TestFlight build before inviting the spouse tester, then repeat the core flows on the spouse device.

Record before testing:

- Build number:
- Device model:
- iOS version:
- Tester:
- Date:

## Install And Launch

- Install from TestFlight on a clean device or after deleting the app.
- Launch the app.
- Confirm Today is the first useful screen.
- Confirm the private beta welcome card appears on first launch and can be dismissed.
- Force quit and relaunch.
- Confirm there is no crash, blank screen, or signing/iCloud warning that blocks use.

## Today Entry

- Create today's entry with no photo and at least one nice thing.
- Reopen Today and confirm the text remains.
- Add one photo.
- Add a second photo if the UI allows it.
- Edit or remove a prompt response.
- Confirm a photo-only or light-text entry still feels accepted by the UI.
- Force quit, relaunch, and confirm the entry persists.

## People Tags

- Add default people tags such as Me, child, partner, and family where available.
- Add a custom person tag if the UI supports it.
- Remove a tag and confirm it no longer appears on the entry.
- Reopen the entry detail and confirm tags are still attached.
- Confirm tags read as private labels, not contacts.

## Little Details

- Add at least two Little Details.
- Tag one detail to one person and another detail to multiple people.
- Edit a detail.
- Remove a detail.
- Reopen the entry detail and confirm remaining details and tag assignments persist.

## Memories

- Open Memories.
- Confirm saved entries render as photo-first cards where photos exist.
- Open an entry from Memories.
- Filter by a person tag.
- Confirm entries and Little Details associated with that person are discoverable.
- Clear the filter and confirm the broader list returns.

## Calendar And Memory Lane

- Open Calendar and move between months if controls are present.
- Confirm days with entries are visually distinct.
- Open an entry from Calendar.
- Open Memory Lane.
- Confirm any look-back card opens the correct entry.
- Confirm empty or low-data states are calm and not broken.

## Settings And Privacy

- Review reminder settings and request notification permission only if expected.
- Confirm iCloud/private sync copy is understandable.
- Review app lock, export, delete-all, and Premium surfaces without assuming production readiness.
- Open Settings > Beta and confirm the build number is visible.
- Tap Send beta feedback and confirm it opens a mail draft or the system handles unavailable Mail gracefully.
- Do not run delete-all on a tester's only useful beta dataset unless explicitly testing deletion.

## Regression Pass

- Relaunch the app after every major flow.
- Rotate text size using iOS Settings if practical and check for obvious clipping.
- Test offline mode by enabling Airplane Mode, creating an entry, relaunching, then disabling Airplane Mode.
- Watch for crashes, missing photos, duplicated entries, broken filters, stuck loading states, or confusing saved-state copy.

## Pass Criteria

- Owner can create and revisit today's memory with photos, people tags, and Little Details.
- Owner can browse by Memories, Calendar, and Memory Lane.
- Spouse can install the build and complete the same core loop.
- No stop-ship issue from `docs/TESTFLIGHT.md` is present.
