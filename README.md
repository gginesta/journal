# Photo Gratitude Journal

Photo Gratitude Journal is a polished, photo-first journal for ending the day with one or two photos and a few positive reflections. The default ritual asks for three nice things that happened today, but users can customize prompts and choose an evening-only, once-daily, morning/evening, or anytime cadence.

The product goal is simple: make a private, beautiful photo journal that helps people notice good moments and rediscover them later through streaks, a calendar, private people tags, optional Little Details, and automatic nostalgia views.

## Current Status

This repository contains the first iOS app scaffold and a production web beta:

- SwiftUI iPhone app targeting iOS 17+.
- Next.js web app under `web/` for PC/mobile browser testing, Supabase-backed private sync, and Vercel deployment. This is the active private beta path.
- Public web homepage at `/` for private beta testers, with research-backed positioning and CTAs into the demo/beta app.
- SwiftData models configured for CloudKit private database sync.
- Photo import with `PhotosPicker`, app-local protected file storage, and thumbnails.
- Today, Timeline, Calendar, Insights, Settings, Prompt Editor, Entry Detail, and Premium screens.
- Local notification reminder service.
- Face ID/passcode app-lock service scaffold.
- StoreKit 2 yearly Premium entitlement scaffold.
- JSON export and delete-all controls.
- Unit tests for completion rules, streaks, Memory Lane matching, and prompt defaults.
- GitHub Actions workflow for macOS simulator tests.

The web beta is deployed and ready for private household testing. The iOS code is ready for first validation on a Mac with Xcode, but this Windows workspace cannot run `xcodebuild`, `xcrun`, or iOS Simulator.

For the fastest orientation, read [Project Context](docs/PROJECT_CONTEXT.md) and [Current Status](docs/CURRENT_STATUS.md). Future Codex sessions should start with [AGENTS.md](AGENTS.md).

## Requirements

- macOS with Xcode 16 or later.
- iOS 17+ simulator or device.
- Apple Developer account for CloudKit, iCloud entitlements, device testing, and StoreKit product configuration.

## Getting Started

1. Clone the repository.
2. Open `PhotoGratitudeJournal.xcodeproj` in Xcode.
3. Select the `PhotoGratitudeJournal` scheme.
4. Set your development team in Signing & Capabilities.
5. Enable iCloud with CloudKit using container `iCloud.com.guill.PhotoGratitudeJournal`.
6. Run tests on an iPhone simulator:

```bash
xcodebuild \
  -project PhotoGratitudeJournal.xcodeproj \
  -scheme PhotoGratitudeJournal \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  test
```

If your installed simulator has a different name, list available devices with:

```bash
xcrun simctl list devices available
```

## Web Beta

The browser app lives in `web/` and is the fastest way to test the product from a PC, iPad browser, or iPhone browser before TestFlight is ready. The current web beta app version is sourced from `web/package.json` and visible in Settings > Beta.

The web root `/` is the public private-beta homepage. It explains the product loop, cites the evidence-informed gratitude/savoring/photo-memory/reminiscence basis, and links into `/app`. The actual journal experience remains at `/app`; authenticated beta sign-in remains at `/login`.

```powershell
cd web
copy .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Keep `NEXT_PUBLIC_DEMO_MODE=true` for local UX review without Supabase. For the private shared-family beta, deploy `web/` on Vercel, apply the Supabase migration in `web/supabase/migrations`, and use [Web App Operations](docs/WEB_APP.md) as the setup checklist.

When filing beta notes, include the app version shown in Settings > Beta, browser/device, workspace role, and whether the pass used demo mode or authenticated Supabase mode.

## Product Shape

- Default evening ritual with editable prompts and optional 1-2 photos.
- Evidence-informed public homepage that positions the ritual carefully without clinical or medical claims.
- Flexible cadence: once daily, morning/evening, or anytime entries.
- Photo-first Today and Timeline experiences.
- Streaks, calendar browsing, mood tracking, and automatic Memory Lane look-backs.
- Private people tagging so family memories can be browsed by child or loved one.
- Optional Little Details for tiny phases, personal milestones, routines, favorites, and quotes.
- First-memory celebration and early Memory Lane guidance so the beta feels rewarding before a large archive exists.
- First-run beta guidance and Settings feedback flow for the private TestFlight loop.
- Generous free tier with yearly Premium unlocks for widgets, advanced insights, export, app lock, themes, and richer nostalgia.

## Project Structure

- `PhotoGratitudeJournal/App`: app shell, routing, theme, and SwiftData container setup.
- `PhotoGratitudeJournal/Models`: SwiftData entities and shared product types.
- `PhotoGratitudeJournal/Services`: persistence helpers, streaks, Memory Lane, photos, reminders, privacy, export, and StoreKit.
- `PhotoGratitudeJournal/Views`: SwiftUI screens and reusable components.
- `PhotoGratitudeJournalTests`: unit tests for core app logic.
- `web`: Next.js, Supabase, and Vercel web beta.
- `docs`: architecture, roadmap, and release/versioning notes.

## Capabilities

Before shipping on device, configure:

- iCloud with CloudKit using container `iCloud.com.guill.PhotoGratitudeJournal`.
- In-app purchases with yearly product id `photo.gratitude.journal.premium.yearly`.
- App Groups when a WidgetKit extension is added.

The current app schedules local notifications only; remote push notifications are not part of v1.

## Documentation

- [Codex Handoff Guide](AGENTS.md)
- [Documentation Index](docs/INDEX.md)
- [Project Context](docs/PROJECT_CONTEXT.md)
- [Current Status](docs/CURRENT_STATUS.md)
- [Product Requirements](docs/PRD.md)
- [Design Direction](docs/DESIGN.md)
- [v0.3 Design Goal](docs/GOAL_V0_3_DESIGN_SYSTEM.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Web App Operations](docs/WEB_APP.md)
- [Supabase Auth Email Templates](docs/SUPABASE_AUTH_EMAILS.md)
- [Roadmap](docs/ROADMAP.md)
- [Versioning](docs/VERSIONING.md)
- [TestFlight Owner Checklist](docs/TESTFLIGHT.md)
- [TestFlight Manual QA](docs/QA_TESTFLIGHT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Future-Agent Quick Start

If you are opening this repository in a new Codex session, read these in order:

1. `AGENTS.md`
2. `docs/INDEX.md`
3. `docs/PROJECT_CONTEXT.md`
4. `docs/CURRENT_STATUS.md`
5. `docs/WEB_APP.md`
6. `docs/QA_TESTFLIGHT.md`

Do not commit secrets. Supabase credentials, database passwords, service-role keys, and management tokens belong only in private environment configuration.
