# Contributing

This is currently a private product-build repository. Keep contributions focused, testable, and aligned with the core idea: a simple photo-led gratitude journal.

## Development Rules

- Keep the app local-first and privacy-preserving.
- Do not add a custom backend without a product decision.
- Keep core journaling free.
- Prefer SwiftUI-native state and small focused views.
- Put pure product logic in services that can be unit tested.
- Store photos as files and keep SwiftData records lightweight.

## Before Opening A Pull Request

On a Mac with Xcode 16+:

```bash
xcodebuild \
  -project PhotoGratitudeJournal.xcodeproj \
  -scheme PhotoGratitudeJournal \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  test
```

Also verify:

- The app launches to Today.
- A text-only entry counts as complete.
- A photo-only entry counts as complete.
- Prompt editing works.
- Calendar and Timeline show the created entry.

## Documentation

Update documentation whenever behavior changes:

- `README.md` for setup and product overview.
- `docs/ARCHITECTURE.md` for structure or data-flow changes.
- `docs/ROADMAP.md` for planning changes.
- `CHANGELOG.md` for notable user-facing or engineering changes.
