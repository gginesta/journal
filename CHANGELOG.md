# Changelog

All notable changes to Photo Gratitude Journal will be documented here.

## [Unreleased]

### Added

- Added a full product requirements document.
- Added design direction and UX ownership documentation.
- Expanded the roadmap into milestone-based execution steps with acceptance criteria.
- Clarified branching, CI, and release version-control workflow.
- Added a durable v0.3 design-system goal document for long-running Codex work.
- Began the v0.3 photo-first design pass with reusable design components, Today ritual refinements, Memories browsing, and Calendar polish.
- Updated iOS CI to run on `codex/**` implementation branches.
- Added PC design-review prototype coverage for private people tags and optional Little Details.
- Added TestFlight owner setup and manual QA checklists for the private beta.
- Added first-run beta guidance, Settings feedback affordance, and beta version labeling.
- Added a durable working-beta roadmap goal for photo management, onboarding, Memories search, and hardening.
- Added working-beta onboarding, cadence-aware entry creation, reminder controls, photo preview/removal, Memories search/filtering, Entry Detail polish, Calendar low-data guidance, and Memory Lane fallback states.
- Bumped the iOS beta to `0.2.0 (2)` for the next TestFlight upload.
- Added a Next.js/Supabase web beta prototype under `web/` with demo-mode journaling, responsive Today/Memories/Calendar/Insights/Settings, people tags, Little Details, Memory Lane, entry detail modal, PWA metadata, Supabase RLS migration, web docs, Web CI, and Chromium desktop/mobile E2E coverage.
- Added authenticated Supabase autosave routes for the web beta, including workspace state sync, private photo Storage upload, signed photo previews, workspace creation, and workspace-entry deletion.
- Added a smoother web first-run onboarding flow with a three-step product tour, personal memory-focus choice, starter checklist, direct first-entry affordance, and replay control in Settings.
- Expanded web onboarding with friendly name collection for self, partner, and children so generic people tags become personal immediately.

## [0.1.0] - 2026-05-21

### Added

- Created the SwiftUI iOS app scaffold.
- Added SwiftData models for entries, sessions, prompts, responses, photos, and reminder configuration.
- Added CloudKit private database configuration.
- Added Today, Timeline, Calendar, Insights, Settings, Prompt Editor, Entry Detail, and Paywall views.
- Added photo import, app-local photo storage, and thumbnail generation.
- Added default prompt seeding and editable prompt support.
- Added completion, streak, and Memory Lane logic.
- Added reminder scheduling, privacy lock, StoreKit Premium, export, and delete scaffolds.
- Added unit tests for completion rules, streak calculation, Memory Lane matching, and prompt seeding.
- Added project documentation, roadmap, versioning guidance, and macOS CI workflow.
