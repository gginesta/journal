# Changelog

All notable changes to Photo Gratitude Journal will be documented here.

## [0.3.0] - 2026-08-13

The five-wave improvement plan (`docs/IMPROVEMENT_PLAN.md`), reviewed and merged as one release. Web and iOS now share the same version number, and the Version check workflow fails CI if they diverge.

### Added

- Simple/Full experience mode on web and iOS, driven by the shared `spec/fixtures/experience-mode.json` fixture with SPEC conformance tests on both platforms.
- iOS parity features: Gratitude Guide with mood mapping, early Memory Lane look-backs, first-memory celebration, entry editing from the detail screen, and TestFlight preparation (Premium UI hidden for the beta).
- Web performance core: faster bootstrap and interaction paths from Wave 1, plus the Wave 2 trust and loop fixes (out-of-band photo upload, calendar backfill).
- The app version now also appears in the login page footer, so the deployed version can be checked without signing in.

### Fixed

- Reminders enabled during onboarding now record the device timezone, so they fire on local time instead of UTC.
- A sync payload without a timezone no longer clears the stored reminder timezone (protects against older tabs reverting reminders to UTC).
- A second household member on a shared device can now enable reminder notifications (the push-subscription write previously failed against the first member's row).
- iOS Memories search no longer matches internal category names ("note", "quote"), aligning its results with web search.

## [0.2.12] - 2026-08-11

Catch-up release recording the 2026-06-11 to 2026-06-13 audit-execution work (see `AUDIT.md` and `AUDIT_UX.md` for the full findings and execution logs).

### Changed

- Restructured mobile Today after the UX audit: ritual-first layout at 4.2 viewports deep (down from 6.5), with Pick-me-up, Gratitude Guide, and discovery content behind a "More for today" disclosure shown after completion. The duplicate "Today's prompts" snapshot is now desktop-only.
- Darkened the brand rose from `#c7455c` to `#ad3145` and reworked person-tag chip colors so all text meets WCAG AA contrast (`web/src/lib/tag-colors.ts`).
- Replaced the whole-journal sync payload with per-entry delta sync: only entries whose content changed since the last server acknowledgement are posted.
- Journal bootstrap now eagerly loads the last 12 months plus anniversary windows (instead of a silent 100-entry cap), with older memories loaded on demand through `GET /api/journal/entries` paging.
- Split the 3,700-line `JournalApp` component into per-view modules under `web/src/components/journal/`.
- Text-only memories render a text-first card instead of an oversized photo placeholder; Memories stat pills sit in a single row on mobile; photo guidance retires after the first kept photo.

### Fixed

- Entry sync is now transactional: a single `sync_journal_entry` RPC replaces the delete-then-reinsert sequence, so a partial failure can no longer destroy entry data.
- Concurrent household edits are guarded: syncs carry a `base_updated_at` baseline and stale writes return a conflict surfaced inline on Today instead of silently clobbering the other member's changes.
- Fixed the workspace invite function, which failed for every registered user due to an ambiguous column reference — the household invite flow could never have completed before this fix.
- Removed the account-existence oracle from invites: inviting a registered and an unregistered email now return identical responses.
- Guarded demo-mode localStorage writes against quota errors so a full disk no longer crashes the app.
- Labeled all journaling textareas, Settings inputs, and selects for assistive tech; onboarding sits in a labeled dialog landmark; all touch targets meet 44 px. Axe scans across 8 surfaces report zero violations.
- Surfaced iOS persistence failures to the user instead of silently swallowing them (`try?` cleanup), and moved iOS photo compression off the main thread.

### Added

- Pending-invite consent flow: invited members now see an accept/decline banner instead of being silently added, backed by a `workspace_invites` table for emails without accounts.
- Per-person day sections: each household member writes their own reflections for a shared day; sync only rewrites the caller's own sessions, and other members' sections render read-only.
- Runtime validation and size caps for sync payloads.
- Batched signed-URL creation for photo previews (one Storage call per page load).
- Structured server-side logging for API failures.
- Regression tests for the sync route (12 tests), sync validation (8 tests), and a local Postgres harness that applies all migrations and exercises the sync RPC end to end.
- SwiftLint in iOS CI; Playwright E2E now runs in web CI on `main`, `claude/**`, and `codex/**` branches.
- `docs/IMPROVEMENT_PLAN.md`: the 2026-08 full-project audit and improvement plan (UX, performance, Simple/Full mode, iPhone path).

## [0.2.11] - 2026-06-07

### Changed

- Redesigned the web first-run onboarding into a warmer, guided flow that collects real names (no "Kid 1 / Kid 2 / Partner" placeholders), adds an optional reminder-cadence step, and ends with a first-memory nudge. New workspaces no longer seed generic placeholder person tags; the personalization step creates the real, named tags instead. Members invited into an already-populated household now get a short welcome instead of the setup flow. Bumped the web beta to `0.2.11`.

### Fixed

- Person-tag removals now persist: workspace sync reconciles deletions for tags that are absent from the synced state and not attached to any entry or detail, so cleaned-up tags no longer reappear on reload. Unattached tag deletion in a shared household remains last-writer-wins for now (a known beta limitation).
- Added a migration that stops seeding generic placeholder person tags for new accounts and removes unused generic defaults (`Kid 1`, `Kid 2`, `Partner`, `Family`) from existing accounts when they are not referenced by any memory.

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
- Added a public science-backed web homepage for private beta testers, with research citation cards, privacy framing, demo/beta CTA routing, and desktop/mobile E2E coverage.
- Added first-memory celebration, early Memory Lane milestone guidance, context-aware Little Details nudges, shared-journal copy, and tracked Supabase magic-link email copy with unit coverage.
- Added canonical project context, current beta status, documentation index, Codex handoff guidance, and GitHub issue/PR templates for future development continuity.

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
