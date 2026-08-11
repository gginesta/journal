# Contributing

This is currently a private product-build repository. Keep contributions focused, testable, and aligned with the core idea: a simple photo-led gratitude journal.

Before starting meaningful work, read:

- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/CURRENT_STATUS.md`
- `docs/WEB_APP.md` for web/Supabase work
- `docs/QA_TESTFLIGHT.md` for manual QA expectations

## Development Rules

- Keep the app local-first and privacy-preserving.
- Do not add a custom backend without a product decision.
- Keep core journaling free.
- For the current beta, treat `web/` as the active product path and the iOS app as the native roadmap path.
- Never commit secrets, service-role keys, database passwords, Supabase management tokens, or tester private data.
- Keep demo mode and authenticated Supabase mode separate.
- Prefer SwiftUI-native state and small focused views.
- Put pure product logic in services that can be unit tested.
- Store photos as files and keep SwiftData records lightweight.
- Preserve owner/editor/viewer semantics for household workspaces.
- Update the beta version when shipping tester-visible web changes.
- Changes touching a SPEC-numbered rule (`docs/SPEC.md`) must update SPEC.md, the `spec/fixtures/` file, and both platforms' conformance tests in the same PR.

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

For web changes, run from `web/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

For Supabase/Auth/Storage changes, also update or review:

- `docs/WEB_APP.md`
- `docs/SUPABASE_AUTH_EMAILS.md` if email copy changes
- `docs/QA_TESTFLIGHT.md`
- relevant migrations under `web/supabase/migrations`

## Documentation

Update documentation whenever behavior changes:

- `README.md` for setup and product overview.
- `docs/ARCHITECTURE.md` for structure or data-flow changes.
- `docs/PROJECT_CONTEXT.md` for product/strategy/operational context changes.
- `docs/CURRENT_STATUS.md` for beta-state changes.
- `docs/ROADMAP.md` for planning changes.
- `CHANGELOG.md` for notable user-facing or engineering changes.
