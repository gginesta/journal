# Photo Gratitude Journal

Photo Gratitude Journal is a polished, photo-first journal for ending the day with one or two photos and a few positive reflections. The default ritual asks for three nice things that happened today, but users can customize prompts and choose an evening-only, once-daily, morning/evening, or anytime cadence.

The product goal is simple: make a private, beautiful photo journal that helps people notice good moments and rediscover them later through streaks, a calendar, private people tags, optional Little Details, and automatic nostalgia views.

## Current Status

This repository contains the first iOS app scaffold and a production web beta:

- SwiftUI iPhone app targeting iOS 17+.
- Next.js web app under `web/` for PC/mobile browser testing, Supabase-backed private sync, and Vercel deployment.
- SwiftData models configured for CloudKit private database sync.
- Photo import with `PhotosPicker`, app-local protected file storage, and thumbnails.
- Today, Timeline, Calendar, Insights, Settings, Prompt Editor, Entry Detail, and Premium screens.
- Local notification reminder service.
- Face ID/passcode app-lock service scaffold.
- StoreKit 2 yearly Premium entitlement scaffold.
- JSON export and delete-all controls.
- Unit tests for completion rules, streaks, Memory Lane matching, and prompt defaults.
- GitHub Actions workflow for macOS simulator tests.

The code is ready for first validation on a Mac with Xcode. This Windows workspace cannot run `xcodebuild`, `xcrun`, or iOS Simulator.

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

The browser app lives in `web/` and is the fastest way to test the product from a PC, iPad browser, or iPhone browser before TestFlight is ready. The current web beta app version is `0.2.9`, sourced from `web/package.json` and visible in Settings > Beta.

```powershell
cd web
copy .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Keep `NEXT_PUBLIC_DEMO_MODE=true` for local UX review without Supabase. For the private shared-family beta, deploy `web/` on Vercel, apply the Supabase migration in `web/supabase/migrations`, and use [Web App Operations](docs/WEB_APP.md) as the setup checklist.

When filing beta notes, include app version `0.2.9`, browser/device, workspace role, and whether the pass used demo mode or authenticated Supabase mode.

## Product Shape

- Default evening ritual with editable prompts and optional 1-2 photos.
- Flexible cadence: once daily, morning/evening, or anytime entries.
- Photo-first Today and Timeline experiences.
- Streaks, calendar browsing, mood tracking, and automatic Memory Lane look-backs.
- Private people tagging so family memories can be browsed by child or loved one.
- Optional Little Details for tiny phases, personal milestones, routines, favorites, and quotes.
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

- [Product Requirements](docs/PRD.md)
- [Design Direction](docs/DESIGN.md)
- [v0.3 Design Goal](docs/GOAL_V0_3_DESIGN_SYSTEM.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Web App Operations](docs/WEB_APP.md)
- [Roadmap](docs/ROADMAP.md)
- [Versioning](docs/VERSIONING.md)
- [TestFlight Owner Checklist](docs/TESTFLIGHT.md)
- [TestFlight Manual QA](docs/QA_TESTFLIGHT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
