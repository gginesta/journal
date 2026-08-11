# Current Status

Last updated: 2026-08-11.

## Summary

Photo Gratitude Journal is in private web beta preparation. The current beta is functional and ready for Stephanie to test, but **deploying current `main` to production requires applying the pending Supabase migrations first** (see Pending Operator Actions below) — the sync route now depends on the `sync_journal_entry` RPC created by those migrations.

The June 2026 audit cycle (`AUDIT.md`, `AUDIT_UX.md`) landed transactional sync, stale-write conflict guards, a pending-invite consent flow, per-person day sections, delta sync, archive paging, and a full accessibility/UX overhaul. The 2026-08 audit produced `docs/IMPROVEMENT_PLAN.md`, whose execution waves 0-5 have all landed on branch `claude/project-audit-plan-gl1g72`: web hygiene/perf/trust/reminders, the Simple/Full experience toggle on web, and the iOS P0 foundations + P1 logic parity + P2 experience parity + P3 premium-hidden TestFlight prep. The iOS app is code-complete for the first TestFlight build; only owner-side steps remain (signing team, manual QA, archive/upload — see Pending Operator Actions).

The active app version is:

```text
0.2.12
```

The live URL is:

```text
https://journal-gginestas-projects.vercel.app
```

## What Is Done

- Next.js web app under `web/`.
- Public private-beta homepage at `/`.
- Interactive journal app at `/app`.
- Supabase magic-link sign-in at `/login`.
- Supabase Postgres schema and RLS migrations.
- Private Supabase Storage buckets for journal photos and thumbnails.
- Vercel production deployment from `main`.
- Demo mode for local UX review.
- Personal and household workspaces.
- Owner/editor/viewer role model.
- Household member invite route using `public.invite_workspace_member`.
- Daily Today flow.
- Text-only, photo-only, and mixed memory completion.
- One-or-two photo behavior.
- Balanced onboarding for solo, partner, family, and custom themes.
- Private people/theme tags.
- Gratitude Guide deterministic prompt suggestions.
- Little Details capture and repository-style retrieval.
- First-memory celebration.
- Progressive Memory Lane and early empty-state guidance.
- Memories, Calendar, Insights, Settings.
- JSON export and delete workspace entries.
- App version visibility in Settings > Beta.
- Mobile overflow regression checks.
- Desktop/mobile Playwright E2E.
- Transactional per-entry sync (`sync_journal_entry` RPC) with a stale-write conflict guard.
- Per-person day sections for shared households (each member's reflections are their own).
- Pending-invite consent flow (accept/decline banner, invites for emails without accounts).
- Client delta sync and on-demand archive paging (12-month eager window + anniversary slices).
- Sync payload runtime validation with size caps; batched signed photo URLs; structured server logging.
- Accessibility pass: zero axe violations across 8 surfaces, WCAG AA chip colors, 44 px touch targets, ritual-first mobile Today.
- Simple/Full experience toggle (SPEC-7) on web and iOS, driven by the shared `spec/fixtures/experience-mode.json` fixture with conformance tests on both platforms.
- iOS experience parity (Wave 5): Gratitude Guide (deterministic mood-aware starters, wire-format parity with web), early Memory Lane milestone guidance, first-memory celebration, entry editing from `EntryDetailView` (photos, responses, people, details, mood), and Premium/paywall UI hidden for the beta behind `EntitlementService.showPremiumUI`.

## What Is Deployed

Vercel is connected to GitHub and deploys `main`.

Production app:

```text
https://journal-gginestas-projects.vercel.app
```

Routes:

- `/`: public private-beta homepage
- `/app`: journal app
- `/login`: magic-link login
- `/auth/callback`: Supabase Auth callback

## What Was Recently Added

Version `0.2.12` added (the June audit-execution work, recorded late):

- transactional entry sync with stale-write conflict handling
- pending-invite consent flow and a fix for the invite function that failed for every registered user
- per-person day sections in shared households
- delta sync, 12-month eager window, and archive paging
- the full accessibility/UX overhaul (see `AUDIT_UX.md`)
- SwiftLint in iOS CI; Playwright E2E in web CI

Version `0.2.11` added:

- redesigned, warmer first-run onboarding with real-name personalization (no generic `Kid 1` / `Partner` placeholders)
- optional reminder-cadence step inside onboarding
- short "you've joined" welcome for members invited into a populated household
- stopped seeding generic placeholder person tags for new workspaces, plus a migration that removes unused generic defaults from existing accounts
- person-tag deletions now persist through workspace sync

Version `0.2.10` added:

- first-memory celebration
- early Memory Lane milestone guidance
- context-aware Little Details nudge
- warmer shared-journal copy
- product-specific login sent-state copy
- Supabase magic-link template documentation
- public homepage and homepage E2E coverage

Version `0.2.9` added:

- mobile onboarding and login layout polish
- no email overflow in onboarding
- mobile overflow guard tests

Version `0.2.8` added:

- progressive Memory Lane look-back targets for young accounts

## Verification Status

Latest verified commands from `web/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Latest expected test state:

- Unit tests: all pass.
- E2E tests: desktop and mobile pass.
- Vercel: green on `main`.

## Pending Operator Actions

These require the Supabase dashboard (owner access) and block deploying current `main`:

1. Apply the pending migrations from `web/supabase/migrations/`, in order, in the SQL editor:
   - `202606070001_personalized_onboarding.sql` (confirm — likely applied with the 0.2.11 deploy, but unrecorded)
   - `202606120001_transactional_entry_sync.sql` (**required** — the sync route calls its `sync_journal_entry` RPC)
   - `202606120002_invite_without_account_probe.sql` (**required** — fixes invites of registered users)
   - `202606130001_pending_invites.sql`
   - `202606130002_per_person_sessions.sql`
   - `202608110001_push_subscriptions.sql` (**required for working reminders** — push subscriptions table plus `reminder_preferences.timezone`)
   - `202608110002_experience_mode.sql` (**required for the Simple/Full toggle** — adds `profiles.experience_mode`, defaulting new users to Simple and backfilling existing users to Full)
2. Apply the magic-link email template per `docs/SUPABASE_AUTH_EMAILS.md` if not already done.
3. For Web Push reminders: generate VAPID keys (`node web/scripts/generate-vapid-keys.mjs`) and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel (see docs/WEB_APP.md "Reminders / Web Push").
4. Record completion here (move each item to "Applied and verified" below).

For the iOS TestFlight build (needs the owner's Mac + Apple account; the code side of waves 4-5 is done):

1. Set the Apple team id in the four empty `DEVELOPMENT_TEAM = "";` entries in `PhotoGratitudeJournal.xcodeproj/project.pbxproj` (see `docs/TESTFLIGHT.md`).
2. Confirm iOS CI is green on this branch (`xcodebuild test` on macos-15 runs the SPEC conformance tests, including the new SPEC-7 experience-mode tests — this container cannot run Xcode).
3. Run the manual QA pass per `docs/QA_TESTFLIGHT.md` (Premium surfaces should be unreachable; the beta ships with them hidden).
4. Bump `CURRENT_PROJECT_VERSION`, archive, upload, and smoke-test per `docs/TESTFLIGHT.md`, then invite Stephanie.

## Supabase Status

Applied and verified:

- `202605210001_initial_schema.sql`
- `202605230001_workspace_member_invites.sql`

Written in the repo but **not yet recorded as applied** (see Pending Operator Actions):

- `202606070001_personalized_onboarding.sql`
- `202606120001_transactional_entry_sync.sql`
- `202606120002_invite_without_account_probe.sql`
- `202606130001_pending_invites.sql`
- `202606130002_per_person_sessions.sql`
- `202608110001_push_subscriptions.sql`
- `202608110002_experience_mode.sql`

Verified invite function state:

- `public.invite_workspace_member(uuid,text,text)` exists.
- It is `SECURITY DEFINER`.
- `authenticated` can execute it.
- `public` cannot execute it.
- Required Journal tables/functions still read cleanly.

Supabase Auth:

- Email magic-link auth is enabled.
- Redirects include local and production callback URLs.
- Production app URL callback is configured.
- Actual email template still needs to match `docs/SUPABASE_AUTH_EMAILS.md` if not already applied.

Storage:

- `journal-photos` bucket exists and is private.
- `journal-thumbnails` bucket exists and is private.

## Immediate Remaining Work

### Blocking For Wider Beta

- Real two-account household QA with Guillermo and Stephanie.
- Confirm Stephanie can access the shared household workspace after being added.
- Confirm accepted member photo previews load.
- Confirm viewer/editor/owner behavior with real accounts.

### Not Blocking Stephanie's First Test

- Apply the polished Supabase Auth email template if not already done.
- Add more formal tester feedback capture.

Resolved since last update: conflict handling for simultaneous household edits shipped twice over (stale-write guard + per-person day sections).

## Stephanie Test Script

Use the live URL:

```text
https://journal-gginestas-projects.vercel.app
```

Ask Stephanie to test on iPhone first.

1. Open the URL.
2. Confirm the homepage feels clear and trustworthy.
3. Sign in with magic link.
4. Confirm Settings > Beta shows the current version from `web/package.json`.
5. Complete onboarding as family/kids, partner, or whichever feels natural.
6. Add one photo or one line in Today.
7. Confirm the first-memory celebration appears.
8. Add a Little Detail.
9. Tag the detail to a person.
10. Open Memories and search for the detail.
11. Open Calendar.
12. Check Memory Lane.
13. After Guillermo adds her to a household workspace, confirm she can switch to it and see shared memories.

## Feedback To Capture

For every issue:

- app version
- device
- browser
- account email
- workspace name and role
- what she expected
- what happened
- screenshot if visual
- whether it happened after refresh

## Current Product Decisions

Decided:

- Web/Supabase is the active beta path.
- iOS remains on roadmap.
- Core journaling is free.
- Billing is deferred.
- AI is deferred.
- Family is important but not the only framing.
- Little Details are part of core memory capture.
- People tags are private labels, not social profiles.

Still open:

- Final product/app name.
- Final icon/brand identity.
- Whether app lock is free or Premium in native.
- Long-term backend: Supabase-only, iCloud-only, or hybrid.
- Whether expanded prompt packs become Premium.
- How to handle concurrent edits elegantly.
- Whether to add Stripe later.
