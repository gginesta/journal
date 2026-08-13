# TestFlight Owner Checklist

Use this checklist to prepare the first private iPhone beta for the owner and spouse. This is a beta-readiness guide, not an App Store launch checklist.

## Build Identity

- App name: Photo Gratitude Journal.
- Platform: iPhone only.
- Minimum OS: iOS 17.0.
- Bundle id: `com.guill.PhotoGratitudeJournal`.
- iCloud container: `iCloud.com.guill.PhotoGratitudeJournal`.
- Current Xcode values: `MARKETING_VERSION = 0.3.0`, `CURRENT_PROJECT_VERSION = 2`.
- For each TestFlight upload, increment `CURRENT_PROJECT_VERSION`; change `MARKETING_VERSION` only for a named milestone, and keep it equal to the web `package.json` version (the Version check workflow enforces this).

## Apple Developer Setup

- Confirm Apple Developer Program membership is active.
- Create or verify the App Store Connect app record for `com.guill.PhotoGratitudeJournal`.
- Assign the app to the correct team in Xcode Signing & Capabilities.
- Fill in the Apple team id: `PhotoGratitudeJournal.xcodeproj/project.pbxproj` has four empty `DEVELOPMENT_TEAM = "";` entries (app target Debug + Release, test target Debug + Release) that must all be set to the owner's team id before archiving.
- App icon: `Assets.xcassets/AppIcon.appiconset` ships a 1024 px PNG generated from the web PWA mark (`web/public/icon.svg`). If the mark changes, re-export a 1024×1024 opaque PNG from that SVG and replace `AppIcon.png`.
- Enable iCloud with CloudKit for the app id.
- Attach the private CloudKit container `iCloud.com.guill.PhotoGratitudeJournal`.
- Confirm the entitlement file still references the same iCloud container.
- Keep Push Notifications off unless a future remote-notification feature is added. (The `UIBackgroundModes` `remote-notification` entry was removed from Info.plist accordingly; if look-back notifications ever ship, re-add it together with the `aps-environment` entitlement.)

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
  - Preview and remove photos.
  - Add three nice things, people tags, and optional Little Details.
  - Browse and search Memories, Calendar, and Memory Lane.
  - Check onboarding, cadence, reminders, and Settings.
  - Use Settings > Beta > Send beta feedback for notes after testing.
  - Report crashes, lost data, broken filters, confusing copy, and photo issues.
- Do not invite external testers until the owner/spouse loop is stable.

## Privacy Caveats

- Journal content is local-first and intended to sync only through the user's private iCloud database.
- There is no custom account backend and no shared public journal data.
- Photos are imported into app-local storage; testers should still avoid using irreplaceable-only photos during the first beta.
- People tags are private labels, not contacts or social profiles.
- Premium/paywall UI is hidden for the beta behind `EntitlementService.showPremiumUI` (nothing is gated and the paywall shows no StoreKit price — an App Review rejection risk). Re-enable it together with the `.storekit` configuration when gating actually lands.
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
