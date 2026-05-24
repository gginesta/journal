# Architecture

For current beta status and implementation priorities, read `docs/PROJECT_CONTEXT.md`, `docs/CURRENT_STATUS.md`, and `docs/WEB_APP.md` before changing architectural direction.

Photo Gratitude Journal is a local-first SwiftUI app with Apple-native storage, privacy, and monetization primitives. The app should stay small, calm, and heavily biased toward preserving the user's private memories.

## App Shell

- `RootAppView` owns the five-tab shell: Today, Timeline, Calendar, Insights, and Settings.
- Each tab uses its own `NavigationStack` through `RouterPath`, which keeps navigation state independent by tab.
- Routes are lightweight enum cases. Views are created in `withAppRoutes()` rather than stored in navigation state.

## Web Shell

- The Next.js web beta uses `/` as a static public homepage for private beta testers.
- `/app` owns the interactive journal experience in demo mode or authenticated Supabase mode.
- `/login` owns email magic-link sign-in when Supabase mode is enabled.
- The homepage is evidence-informed product positioning only; it should not create journal data, require Supabase state, or make clinical claims.
- First-memory celebration, early Memory Lane empty-state guidance, shared-journal copy, and Little Details nudges are implemented as small web helpers/components so copy and visibility rules stay testable outside the large journal component.
- Supabase Auth email copy is tracked in `web/src/lib/auth-email-copy.ts` and documented in `docs/SUPABASE_AUTH_EMAILS.md`; the Supabase dashboard remains the place where the template is applied.

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
- Planned people-tagging models:
  - `PersonTag`
  - `JournalEntryPersonTag`
  - Optional `PhotoAttachmentPersonTag` if photo-level tagging is needed.
- Planned Little Details model:
  - `MemoryDetail`
  - `MemoryDetailPersonTag`
- CloudKit sync is intended to use the user's private iCloud database only. There is no custom backend and no shared public journal data.

## Photos

- `PhotosPicker` imports images selected by the user.
- `PhotoStore` copies images into the app's Application Support directory and generates thumbnails.
- Photo files use protected file attributes where supported.
- SwiftData stores references to app-local filenames, not raw image blobs.

## People Tags

- People tags are private user-created labels for children, family members, friends, or other recurring memory subjects.
- Tags should be stored as SwiftData entities and synced only through the user's private iCloud database.
- Entry-level tagging should ship first because it keeps the daily ritual light.
- Photo-level tagging can follow if users need to distinguish people across multiple photos in a single entry.
- Memories filtering should query by tag without exposing tags outside the app.

## Little Details

- Little Details are optional structured notes attached to an entry, such as phrases, current favorites, routines, quotes, and milestones.
- They should not require a people tag, so the feature works for both family-centered and self-focused journaling.
- When linked to a `PersonTag`, Little Details can power future views like "Kid 1 phrases" or "Kid 1 favorites over time."
- Detail-to-person tagging should be many-to-many so a single detail can belong to Me, a child, partner, family, or any custom tag.
- The model should preserve the original text and category used at capture time.
- Little Details should sync only through the user's private iCloud database.

## Core Logic

- A day is complete when it has at least one non-empty response or at least one photo.
- `StreakCalculator` computes current streak, longest streak, and completed day count from complete entries.
- `MemoryLane` progressively searches for useful look-backs as the archive grows: yesterday, 3 days ago, 1 week, 2 weeks, 1 month, 3 months, 6 months, then 1/2/3 year anniversaries. If no target matches, it can fall back to the most recent complete older entry.
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
