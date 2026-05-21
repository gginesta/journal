# Roadmap

## v0.1.0 - Bootstrap

- Greenfield SwiftUI project.
- SwiftData model layer with CloudKit-ready configuration.
- Today, Timeline, Calendar, Insights, Settings, Entry Detail, Prompt Editor, and Paywall screens.
- Photo import and thumbnail storage.
- Default prompts and custom prompt editing.
- Completion and streak logic.
- Basic Memory Lane.
- Reminder, privacy lock, Premium, export, and delete scaffolds.
- Unit tests for core logic.

## v0.2.0 - First Mac Validation

- Build and test on a Mac with Xcode 16+.
- Fix compile issues found by the first real simulator run.
- Add UI tests for onboarding, first entry creation, photo import, prompt editing, calendar navigation, and paywall restore.
- Add preview fixtures for main screens.
- Replace placeholder app icon with a designed icon.

## v0.3.0 - Product Polish

- Add onboarding for reminder cadence, iCloud sync expectations, and privacy.
- Improve empty states, date formatting, and Dynamic Type behavior.
- Add photo preview and delete flows.
- Add richer prompt-template management, including reorder support.
- Add Settings controls for reminder times.

## v0.4.0 - Premium Foundations

- Configure StoreKit product metadata and local StoreKit testing.
- Gate Premium-only app lock, advanced insights, richer nostalgia, export, themes, and widgets.
- Add restore purchase error and success states.
- Add yearly subscription copy and legal links.

## v0.5.0 - Widgets And Nostalgia

- Add WidgetKit extension.
- Add daily prompt, streak, and Memory Lane widgets.
- Create a minimal app group payload that does not expose full journal data.
- Add optional look-back notifications for Premium users.

## v1.0.0 - Launch Candidate

- Complete privacy review.
- Verify CloudKit migration and sync behavior across devices.
- Add App Store screenshots and metadata.
- Validate StoreKit production configuration.
- Complete accessibility pass.
- Run manual QA on small and large iPhones, light/dark mode, Dynamic Type, offline mode, no-photo entries, multiple photos, and multi-year memory data.
