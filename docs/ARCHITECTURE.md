# Architecture

Photo Gratitude Journal is a local-first SwiftUI app with Apple-native storage, privacy, and monetization primitives. The app should stay small, calm, and heavily biased toward preserving the user's private memories.

## App Shell

- `RootAppView` owns the five-tab shell: Today, Timeline, Calendar, Insights, and Settings.
- Each tab uses its own `NavigationStack` through `RouterPath`, which keeps navigation state independent by tab.
- Routes are lightweight enum cases. Views are created in `withAppRoutes()` rather than stored in navigation state.

## Persistence

- SwiftData is the app persistence layer.
- `AppModelContainer` configures the model schema and CloudKit private database sync.
- SwiftData models currently include:
  - `JournalEntry`
  - `JournalSession`
  - `PromptTemplate`
  - `PromptResponse`
  - `PhotoAttachment`
  - `ReminderConfig`
- CloudKit sync is intended to use the user's private iCloud database only. There is no custom backend and no shared public journal data.

## Photos

- `PhotosPicker` imports images selected by the user.
- `PhotoStore` copies images into the app's Application Support directory and generates thumbnails.
- Photo files use protected file attributes where supported.
- SwiftData stores references to app-local filenames, not raw image blobs.

## Core Logic

- A day is complete when it has at least one non-empty response or at least one photo.
- `StreakCalculator` computes current streak, longest streak, and completed day count from complete entries.
- `MemoryLane` searches for entries from 1 month, 1 year, 2 years, and 3 years ago, falling back to the closest entry within plus or minus 3 days.
- `PromptSeeder` creates the default prompt set on first launch.

## Premium

- StoreKit 2 is represented by `EntitlementService`.
- The planned yearly product id is `photo.gratitude.journal.premium.yearly`.
- Premium features should be gated at the view/service boundary, not by hiding underlying user data.
- Core journaling must remain free.

## Privacy

- `PrivacyLockService` uses LocalAuthentication for Face ID/passcode app lock.
- Export and delete controls live in Settings.
- Delete-all removes SwiftData entries and associated local photo files.
- Future widget data must use a deliberately limited app group payload rather than exposing full journal contents.

## Testing Strategy

- Keep pure logic in small services and test it with regular XCTest.
- Use UI tests once the first simulator build passes on macOS.
- CI should run simulator tests on macOS through GitHub Actions.
