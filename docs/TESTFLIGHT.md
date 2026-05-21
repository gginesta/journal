# TestFlight Owner Checklist

Use this checklist to prepare the first private iPhone beta for the owner and spouse. This is a beta-readiness guide, not an App Store launch checklist.

## Build Identity

- App name: Photo Gratitude Journal.
- Platform: iPhone only.
- Minimum OS: iOS 17.0.
- Bundle id: `com.guill.PhotoGratitudeJournal`.
- iCloud container: `iCloud.com.guill.PhotoGratitudeJournal`.
- Current Xcode values: `MARKETING_VERSION = 0.1.0`, `CURRENT_PROJECT_VERSION = 1`.
- For each TestFlight upload, increment `CURRENT_PROJECT_VERSION`; change `MARKETING_VERSION` only for a named milestone.

## Apple Developer Setup

- Confirm Apple Developer Program membership is active.
- Create or verify the App Store Connect app record for `com.guill.PhotoGratitudeJournal`.
- Assign the app to the correct team in Xcode Signing & Capabilities.
- Enable iCloud with CloudKit for the app id.
- Attach the private CloudKit container `iCloud.com.guill.PhotoGratitudeJournal`.
- Confirm the entitlement file still references the same iCloud container.
- Keep Push Notifications off unless a future remote-notification feature is added.

## Signing And Archive

- Open `PhotoGratitudeJournal.xcodeproj` on macOS with Xcode 16 or later.
- Select the `PhotoGratitudeJournal` scheme and an iOS device destination.
- Confirm automatic signing resolves for the app target.
- Run the unit tests before archiving.
- Archive with `Product > Archive`.
- Validate the archive in Organizer.
- Distribute through App Store Connect for TestFlight.

## App Store Connect

- Wait for build processing to complete.
- Add internal testers: owner first, spouse second after owner smoke test passes.
- Add concise beta notes:
  - Create today's entry with one or two photos.
  - Add three nice things, people tags, and optional Little Details.
  - Browse Memories, Calendar, and Memory Lane.
  - Use Settings > Beta > Send beta feedback for notes after testing.
  - Report crashes, lost data, broken filters, confusing copy, and photo issues.
- Do not invite external testers until the owner/spouse loop is stable.

## Privacy Caveats

- Journal content is local-first and intended to sync only through the user's private iCloud database.
- There is no custom account backend and no shared public journal data.
- Photos are imported into app-local storage; testers should not use irreplaceable-only photos during the first beta.
- People tags are private labels, not contacts or social profiles.
- Premium and StoreKit surfaces are scaffolded; do not treat purchase behavior as production-ready in this beta.
- App Store privacy labels and legal links are not final for App Store submission.

## Spouse Testing Flow

1. Owner installs the first TestFlight build and completes the smoke test in `docs/QA_TESTFLIGHT.md`.
2. Owner confirms a new entry can be created, reopened, filtered by person, and seen in Calendar.
3. Owner invites spouse as an internal tester.
4. Spouse installs on their own iPhone and creates at least two days of entries.
5. Spouse tests photo import, people tags, Little Details, Memories filtering, Calendar, and app relaunch.
6. Owner records feedback with build number, device model, iOS version, and reproduction steps.

## Stop-Ship Issues

- App cannot launch after a clean install.
- Entry creation, photo import, or save loses data.
- CloudKit entitlement, signing, or bundle id prevents TestFlight upload.
- Memories or Entry Detail crashes when opening a saved entry.
- Delete-all or privacy flows remove data unexpectedly.
