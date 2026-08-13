# Photo Gratitude Journal — Full Project Audit & Improvement Plan

**Date:** 2026-08-10 · **Repo state:** branch `claude/project-audit-plan-gl1g72`, last commit 2026-06-12 (`2b6cf75`) · **Web version:** 0.2.11 · **iOS version:** 0.2.0 (build 2)

---

## 1. Context

This plan answers four questions for the Photo Gratitude Journal project (Next.js/Supabase web beta + SwiftUI iOS app):

- **(a)** How to improve UX/UI and functionality
- **(b)** How to improve performance
- **(c)** How to build a user-facing **Simple vs Full** mode toggle
- **(d)** How to ship the **iPhone version** (decision: finish the existing native SwiftUI app, not a web wrapper)

Owner decisions locked in for this plan: native SwiftUI for iPhone; Simple/Full is a **user-facing Settings toggle**; **web is the priority platform**; deliverable is this plan document (no code changes yet).

Method: three parallel deep-exploration passes (documentation/status, web app, iOS app) covering every doc, all 7 Supabase migrations, every web route/component/lib module, and all 33 Swift files. Findings below carry file references so they can be independently verified.

**Deliberate non-goals** (so intentional omissions aren't read as gaps): no billing/Stripe/StoreKit activation in the beta (per `AGENTS.md` guardrail — premium is *hidden*, not built, until the PRD gating question is decided); no Android; no AI journaling; no state-management or framework rewrites; no virtualization/pagination framework; no external observability SaaS; no iOS↔Supabase sync in the first TestFlight (see §6.1); demo-mode localStorage stays unencrypted (accepted in the prior audit).

---

## 2. Current state: what's done, what's missing

### 2.1 What's genuinely done (verified in code, not just claimed)

**Web (`web/`, v0.2.11, deployed on Vercel, ~11.2k LOC):**
- Full journaling loop: Today ritual (photo hero ≤2 photos, "three nice things", extra prompts, mood, people tags, Little Details in 6 categories), Memories with search/filters + Little Details repository, Calendar, Insights (streaks + mood distribution), 10-target Memory Lane ladder with progressive unlock guidance.
- Household model: personal/household workspaces, owner/editor/viewer roles enforced by **both** RLS and API-route checks, email invites with a pending-consent flow (3 migrations of hardening), last-owner protection, per-person day sections.
- Sync: transactional `sync_journal_entry` RPC with optimistic-concurrency stale-write guard, client delta sync (800 ms debounce, abort/monotonic-ID guards), 12-month eager window + anniversary slices + archive paging (120/page), batched signed-URL creation.
- Safety/quality: runtime sync-payload validation with size caps, demo-mode localStorage quota guard, 78 unit tests + 10 Playwright E2E tests (×2 viewports) in CI, axe-clean across 8 surfaces (0 violations after the June UX pass), WCAG-AA-corrected tag chip colors.
- Demo mode (`NEXT_PUBLIC_DEMO_MODE`) running the whole app on localStorage; public research-cited homepage; magic-link auth; JSON export; delete-all; PWA manifest.

**iOS (`PhotoGratitudeJournal/`, ~5.2k LOC, dormant since 2026-05-21 apart from one error-handling pass):**
- Real working app, not a stub: 5 tabs (Today/Memories/Calendar/Insights/Settings), onboarding, entry detail, prompt editor, paywall; SwiftData models CloudKit-correctly shaped (`.private` DB, optional to-manys, explicit inverses); photo import with 420 px thumbnails and file protection; real `UNCalendarNotificationTrigger` reminders; centralized persistence error surfacing; 13 unit tests; SwiftLint + `xcodebuild test` CI on macos-15. Zero TODO/FIXME markers.

**Process/docs:** Two prior evidence-based audits (`AUDIT.md` — repo, `AUDIT_UX.md` — UX) were executed almost completely: 20/21 repo-audit tasks and 9/9 UX tasks done, with measured before/after (Today depth 6.5 → 4.2 viewports; axe violations → 0). Documentation set (15 docs + PRD + roadmap + runbooks) is unusually strong for a project this size.

### 2.2 What's missing or broken (the gaps this plan addresses)

**Web — functional gaps:**
- **Reminders never fire.** Cadence/times are stored in `reminder_preferences` but no notification is ever scheduled — no Notification API, no service worker, no scheduled function. `reminders_enabled` is written and never read.
- **Thumbnails are generated, stored, backfilled — and never served.** Every grid card and 76 px chip downloads the full 1600 px JPEG (`web/src/lib/bootstrap.ts:288-297` signs only `storage_path`; `thumbnail_path` is carried but unused).
- No premium/billing on web (deliberate deferral, but Insights promises "Premium insights" with no path).
- Dead surface: `journal_entries.note` (full column + sync + validation, no UI), `photo_attachments.width/height` never populated, workspace rename (RLS policy exists, no UI), `next/image` remotePatterns config with `next/image` never used.
- Workspace switching does `window.location.reload()`; only the active workspace is loaded.
- Demo mode **fails open**: `isDemoMode()` returns true unless the env var is exactly `"false"` (`web/src/lib/supabase/env.ts:5-7`); an authenticated user with zero workspaces silently gets demo fixture data (`bootstrap.ts:123,175`).
- No middleware.ts, so the "middleware handles refresh" comment in `lib/supabase/server.ts:30` is false — session cookies aren't refreshed on server-component navigations.

**iOS — blockers and drift (detailed in §6):**
- Version bug: `Resources/Info.plist` hard-codes `1.0 (1)`, so Settings shows the wrong version to testers.
- Missing signing team, missing app icon, `aps-environment` entitlement absent while `remote-notification` background mode is declared (CloudKit push won't deliver).
- App lock state not persisted and no re-lock on backgrounding.
- Premium gates nothing; paywall shows no price; no `.storekit` config.
- **Five confirmed logic drifts from web** (streak rule, Memory Lane ladder, generic person-tag seeding that web deliberately removed, incompatible enum wire formats, missing detail categories). No shared spec exists; parity is maintained by hand and has already broken.
- No `VersionedSchema`/`SchemaMigrationPlan` — future model changes risk destructive migration.
- Entire workspace/sharing/accounts layer absent (CloudKit private only, no identity).

**Documentation/process drift (from the docs exploration):**
- `AGENTS.md` still says v0.2.10; `CHANGELOG.md` omits the entire June audit-execution week; `docs/CURRENT_STATUS.md` is stale (2026-06-07); `docs/WEB_APP.md` lists 2 of 7 migrations and describes the pre-audit sync architecture; the deploy-blocking migration list lives only inside `AUDIT.md`, which no other doc links to.
- **Operator actions still pending:** migrations `202606120001` through `202606130002` must be applied in Supabase before deploying `main`; Supabase magic-link email template not confirmed applied.
- Version never bumped after tester-visible UX changes (contradicts `CONTRIBUTING.md` policy).
- Two prior-audit residuals: `@supabase/ssr` 0.6→0.12 upgrade deferred (needs live magic-link QA), demo mode depends on remote Unsplash images.

---

## 3. Plan A — UX/UI and functionality improvements

*(Priority: web first, per owner decision. Ordered by impact within tiers.)*

### Tier 1 — Close the loop on promises the product already makes

1. **Make reminders real (web).** The product's core ritual is time-anchored ("end the day"), and the settings UI already collects cadence + times. Implement Web Push: a small service worker + `PushSubscription` stored per user/workspace + a Vercel Cron (or Supabase scheduled Edge Function) that sends the evening/morning nudge. Respect `reminders_enabled`. Fallback tier: calendar-file (ICS) download for users who decline push. Files: new `web/src/sw.ts` (or `public/sw.js`), new `push_subscriptions` table + migration, new cron route, Settings wiring in `SettingsView.tsx`.
2. **Entry editing from the past (web parity with its own modal).** Confirm `EntryDetailModal` editing covers all fields (mood, tags, details, captions) and add "jump to date" from Calendar so backfilling a missed day is first-class. (iOS: see §6 — detail view is read-only today.)
3. **Fix demo-mode fail-open.** Flip the default: demo only when `NEXT_PUBLIC_DEMO_MODE === "true"`. Never silently serve demo fixtures to an authenticated user (`bootstrap.ts:123,175` should show an explicit "no workspace" recovery screen instead). This is a trust bug, not a feature.
4. **In-app "what's new"/version bump discipline.** Bump to 0.2.12 with the June changes; add a tiny changelog surface in Settings > Beta so testers can see what changed (the CHANGELOG content already exists, it's just unpublished).

### Tier 2 — Polish the core loop

5. **Photo experience upgrades:** captions editable after save; drag-to-reorder the two photos (populate the existing `sort_order`); populate `width`/`height` on upload to kill layout shift; use the (already-generated) thumbnails everywhere except the full-screen viewer (see §4 perf).
6. **Memories quality-of-life:** date-range filter alongside person/type filters; "on this day" quick jump; keyboard navigation for the entry modal; a small text-search debounce (currently re-scans per keystroke).
7. **Workspace UX:** rename workspace (policy already exists in RLS); switch workspaces without a full page reload (load target workspace data via the existing `GET /api/journal/entries` + a new bootstrap-lite endpoint).
8. **Mood arc in Insights:** mood-over-time sparkline from data already loaded; keep the "premium insights" note honest by either shipping a v1 free chart or removing the tease.
9. **Onboarding polish:** the versioned onboarding is good; add a "shared household" preview step for invitees (currently welcome-only variant) showing what the inviter will/won't see (per-person sections are a real privacy nuance worth explaining).

### Tier 3 — Trust, a11y, and consistency

10. **Color-token drift cleanup:** Tailwind rose is `#ad3145` (WCAG-corrected) but `globals.css --rose`, `layout.tsx` themeColor, and `manifest.webmanifest` still use old `#c7455c`. Single-source the palette.
11. **Wire the axe walkthrough into CI** (`web/scripts/ux-walkthrough.mjs` exists but is manual and hardcodes a mismatched port) — run the axe pass on the two most-changed surfaces per PR to keep the hard-won 0-violations state.
12. **Replace Unsplash remote images in demo fixtures** with small bundled assets (repo tone doc discourages remote-image dependence; also removes a network dependency from E2E).
13. **Offline resilience:** the app already detects offline and retries; add localStorage draft persistence for the authenticated mode's *unsaved* Today text so a tab crash mid-ritual never loses the evening's writing.

### Tier 4 — Documentation & process (prerequisite hygiene, cheap)

14. **One doc-sync pass:** update `AGENTS.md` version refs, `CHANGELOG.md`, `docs/CURRENT_STATUS.md`, `docs/WEB_APP.md` (migration list + current sync architecture), link `AUDIT.md`/`AUDIT_UX.md` from `docs/INDEX.md` and `README.md`, remove "Windows workspace" framing, fix `docs/VERSIONING.md` branch conventions.
15. **Apply pending operator actions:** run migrations 4–7 in Supabase before the next production deploy; apply the magic-link email template; then record both in `docs/CURRENT_STATUS.md`.
16. **Complete the last audit task:** `@supabase/ssr` 0.6→0.12 (needs one live magic-link QA pass), and add `middleware.ts` for session refresh while at it.

---

## 4. Plan B — Performance improvements

*(Ordered by measured impact; the biggest wins are images and sync-loop CPU, not framework changes. Explicit non-goals for a 2-user beta stay non-goals: no virtualization framework, no state-management rewrite, no Next major upgrade.)*

### P1 — Serve the thumbnails that already exist (largest single win)
Every grid card, chip, and Memory Lane tile currently downloads the full 1600 px JPEG. The 420 px thumbnails are already generated, stored, and backfillable (`scripts/regenerate-thumbnails.mjs`).
- Sign `thumbnail_path` alongside `storage_path` in `createPhotoUrlMap` (`web/src/lib/bootstrap.ts:288-297`), add `thumbnailUrl` to the photo type, and use it in `MemoriesView`, Memory Lane tiles, calendar markers, and pick-me-up cards; keep full-res only for `PhotoHero` and the full-screen modal (lazy).
- Expected effect: ~10–20× less image bytes on Memories/Today for a photo-heavy journal.

### P2 — Stop serializing photo bytes on every keystroke
`serializeEntryForSync` includes `previewUrl` (base64 data URL) in the dirty-check (`web/src/lib/journal-sync-delta.ts:20`), so each 800 ms debounce tick JSON-stringifies megabytes.
- Exclude `previewUrl` from the dirty-check serialization; compare photos by `(id, caption, sortOrder, hasNewData)` and carry base64 only for genuinely new photos in the POST body.
- Also narrow the sync effect: it currently re-sends `people`+`prompts`+`reminders` on every sync and over-triggers via unstable array identities from `useMemo`. Delta-gate those three the same way entries are gated.

### P3 — Upload photos out-of-band from text sync
Photos travel as base64 inside the JSON sync payload (up to ~8 MB decoded × 10). Move photo upload to a dedicated endpoint (or direct-to-Storage signed upload) that runs when a photo is added, leaving text sync small and fast; sync then references `storage_path`. This also fixes the orphaned-object risk noted in the prior audit by making photo upload idempotent/reconciled.

### P4 — Server-side round-trip reductions
- Parallelize `createPhotoUrlMap()` and `loadMemberProfiles()` with the main `Promise.all` in `bootstrap.ts:212-214` (they're sequential today).
- Create the Supabase server client **once per request** and pass it down — the sync route currently constructs it 6+ times per request (each with a fresh `cookies()` await).
- Skip person-tag deletion reconciliation (3 queries) when the people payload hash hasn't changed.
- Parallelize per-entry `rpc("sync_journal_entry")` calls with a small concurrency cap (they're sequential `await`s in a loop today) — safe because entries are independent rows.

### P5 — Client CPU: memoize the hot pure functions
`streakSummary` + `memoryLaneMatches` run unmemoized on every `TodayView` render (`TodayView.tsx:71-72`); `memoryLaneMatches` is 10 targets × full entry scan. Wrap in `useMemo` keyed on `entries`. Same for `searchEntries`/`listMemoryDetails` in `MemoriesView` (add a 150 ms input debounce).

### P6 — Code-splitting the five views
Everything ships in one client chunk (`/app` first-load JS 196 kB and growing). `next/dynamic` for `SettingsView`, `InsightsView`, `CalendarView`, `Onboarding`, and `EntryDetailModal` (Today + Memories stay eager as the daily path). Low risk, keeps the daily ritual chunk lean as features grow.

### P7 — Signed-URL policy
7-day signed URLs are embedded in server-rendered HTML — long-lived quasi-bearer links and stale after a week. Drop to 24 h (bootstrap re-signs on every load anyway) and re-sign on archive-page fetches.

### P8 — iOS performance (bundled into §6 phases)
Thumbnail generation runs synchronously on the main actor (`PhotoStore.swift`); `StoredPhotoImage` decodes from disk on every body evaluation with no cache. Move thumbnailing off-main and add a small `NSCache` keyed by filename.

### Measurement gate (so this plan is checkable)
Before/after per item: Lighthouse mobile on `/app` (demo fixture + a 200-entry seeded fixture), transferred bytes on Memories, sync POST payload size for a text-only edit on a 2-photo entry, and React Profiler flame for a keystroke in Today. Record results in the PR descriptions.

---

## 5. Plan C — Simple vs Full mode (user-facing toggle)

**Design principle:** the toggle changes only which UI surfaces render. It never changes data, the sync protocol, or the entry model. Everything created in Full stays stored, still appears read-only where it already renders (entry detail, search), and returns fully editable when the user switches back. Mode is presentation-only — the API/sync layer is untouched.

**Product cut:** Simple = the thesis's first two clauses ("Today helps you notice; Memories helps you rediscover") with exactly one input surface: photo + three lines + done. Full = the current everything-experience including the third clause ("Little Details makes small things searchable") and all analysis/customization surfaces.

### 5.1 Capability map (the single source of truth; goes verbatim into `docs/SPEC.md`)

| Feature key | Surface | Simple | Full | Rationale |
|---|---|---|---|---|
| `todayTab`, `memoriesTab`, `settingsTab` | Tabs | ✅ | ✅ | Core loop + must stay reachable to toggle back |
| `calendarTab`, `insightsTab` | Tabs | ❌ | ✅ | Analysis surfaces |
| `photoHero`, `threeNiceThings`, `completionCard` | Today | ✅ | ✅ | The ritual itself |
| `streakPill` | Today | ✅ | ✅ | Read-only, zero input cost |
| `moodPicker` | Today | ❌ | ✅ | Entry keeps default mood (already today's behavior) |
| `peopleTags`, `littleDetailsPanel` | Today | ❌ | ✅ | Existing data still renders in entry detail + stays searchable |
| `gratitudeGuide`, `pickMeUpMemory`, `promptSnapshot` | Today aside | ❌ | ✅ | |
| `memoryLanePanel` | Today aside | ✅ | ✅ | The one aside kept in Simple: read-only, and it's the rediscovery payoff that makes the 1-minute ritual worth repeating |
| `memoriesSearch` | Memories | ✅ | ✅ | Search still matches details/people text (pure logic, unchanged) |
| `memoriesFilters`, `detailsRepository` | Memories | ❌ | ✅ | Repository management is Full |
| `promptEditor`, `peopleTagEditor` | Settings | ❌ | ✅ | |
| `remindersSection`, `workspacesSection`, `dataExport`, Beta/Account, `experienceToggle` | Settings | ✅ | ✅ | Cadence shapes the ritual; sharing is account plumbing (hiding it would strand invited members); trust features never gate |
| Onboarding, first-memory celebration, starter guide | Overlays | ✅ | ✅ | First-run moments apply to both |

**Default: new users start in Simple** — it makes the "under a minute" promise structural (the same instinct behind the June Today-restructure). The onboarding's final step mentions Full ("Want moods, people tags, and Little Details? Turn on the Full experience in Settings anytime."). Existing beta users are grandfathered into Full via migration backfill.

### 5.2 Web implementation

- **Schema:** one column on the existing per-user `profiles` table — *not* a new table, and *not* per-workspace (an invited viewer must pick their own density; `reminder_preferences` being workspace-scoped is exactly why it's the wrong home):

```sql
alter table public.profiles
  add column experience_mode text not null default 'simple'
  check (experience_mode in ('simple','full'));
update public.profiles set experience_mode = 'full';  -- grandfather existing users
-- plus a profiles self-update RLS policy (id = auth.uid()) if the initial schema only granted select
```

- **Persistence:** bootstrap reads `experience_mode` into `JournalBootstrap`; writes go through a tiny new `POST /api/profile` route — deliberately *not* through `/api/journal/sync`. Demo mode: its own localStorage key `photo-gratitude-web-mode-v1`, separate from the state blob so "delete all data" never resets the preference.
- **Capability map as one pure module:** new `web/src/lib/experience-mode.ts` — `ExperienceMode`, `FeatureKey`, `isFeatureVisible(mode, feature)`, `visibleTabs(mode)`. No JSX, no I/O — trivially unit-testable and line-for-line portable to Swift.
- **Component flow: one prop, no context.** The tree is one level deep (`JournalApp` → five views) and the established pattern is props. `JournalApp.tsx` adds `experienceMode` state (initialized from bootstrap) + a persist handler; `Sidebar`/`MobileTabs` filter tabs via `visibleTabs`; `TodayView`/`MemoriesView`/`SettingsView` wrap optional panels in `isFeatureVisible(...)`; if the active tab isn't visible after a switch, fall back to `today`. `CalendarView`, `InsightsView`, and `EntryDetailModal` need **zero changes** — the first two simply don't render in Simple; the modal always shows everything stored (the non-destructive guarantee made visible).
- **Settings copy:**
  > **Experience** — **Simple**: a one-minute ritual — one photo, three nice things, done. Memory Lane still brings back the good days. **Full**: everything — moods, people tags, Little Details, Gratitude Guide, Calendar and Insights. *Switching never deletes anything; what you added in Full stays saved and comes right back.*

### 5.3 iOS port

Mirror the module 1:1 as `Services/ExperienceMode.swift` (a `String`-raw-value enum + `Set<FeatureKey>`); store the preference in `@AppStorage("experienceMode")` (the entitlements already declare the ubiquity KV store, so cross-device preference sync is a free later upgrade). Root `TabView` filters tabs; `TodayView`/`SettingsView` gate sections. A mirrored unit test asserts the Swift feature set equals the shared JSON fixture (§6.5).

---

## 6. Plan D — iPhone version (native SwiftUI to TestFlight)

### 6.1 Sharing-model decision (shapes everything else)

**Recommendation: the first TestFlight ships solo-only on CloudKit private; household sharing stays on web.**
- CloudKit *shared* database is effectively unavailable: SwiftData on iOS 17 has no `CKShare` support — using it means dropping to Core Data + `NSPersistentCloudKitContainer`, i.e., rewriting persistence anyway.
- Supabase-direct is the plausible long-term end state (one backend, invites/roles reused) but is an XL rewrite (auth on device, API client, offline queue, photo upload, conflict handling) that discards most of the working 5.2k LOC and delays TestFlight by weeks — for a 2-user beta whose household loop already works on web.
- Solo-only ships the existing architecture and matches `docs/TESTFLIGHT.md`'s spouse-testing flow (which never assumed shared data). **Managed risk:** solo iOS data can't auto-merge into a Supabase household later — mitigated because P1 aligns wire formats and export stays working, so a future import is mechanical. Record in `docs/PRD.md` open questions: *"decide iOS backend (Supabase-direct vs dual-store) before opening iOS beta beyond the household."*

### 6.2 P0 — Unblock foundations (all before any feature work)

| # | Work | Files | Size |
|---|---|---|---|
| 0.1 | Fix version bug: Info.plist hard-codes `1.0`/`1`, overriding `MARKETING_VERSION=0.2.0` — use `$(MARKETING_VERSION)`/`$(CURRENT_PROJECT_VERSION)` (verified at `Resources/Info.plist:17-20`) | `Resources/Info.plist` | S |
| 0.2 | Set `DEVELOPMENT_TEAM` (currently `""`), confirm automatic signing | `project.pbxproj` | S (needs owner's Apple team) |
| 0.3 | Resolve push inconsistency by **removing** `UIBackgroundModes: remote-notification` (rather than adding `aps-environment`) — TESTFLIGHT.md says keep Push off and no feature uses it; re-add both halves together if look-back notifications ship | `Resources/Info.plist` | S |
| 0.4 | App icon — the asset slot is empty; reuse the web PWA mark | `Assets.xcassets` | S |
| 0.5 | App lock: persist enabled state (`@AppStorage`), start locked when enabled, re-lock on `scenePhase != .active` | `Services/PrivacyLockService.swift`, app entry | M |
| 0.6 | **SchemaMigrationPlan baseline** (`SchemaV1: VersionedSchema` + empty migration plan wired into the container) — hard gate for 1.4/1.5 | `Models/`, container setup | M |

### 6.3 P1 — Logic parity (write `docs/SPEC.md` first, then conform both platforms)

| # | Decision + work | Size |
|---|---|---|
| 1.1 | **Streak rule: the iOS grace rule wins; change web.** iOS keeps yesterday-anchored streaks alive until today ends; web resets to 0 every morning (verified: `StreakCalculator.swift` currentStreak vs `web/src/lib/journal-logic.ts` streakSummary). A streak that reads 0 at breakfast is the most punitive pixel in a deliberately gentle product. Pin in SPEC; port to web (~6 lines) + tests. | S |
| 1.2 | **Memory Lane: web's 10-target ladder wins** (it's the documented 0.2.8 milestone; iOS's 4-anchor version predates it and can surface incomplete entries). Port per-target tolerances, completeness filter, dedupe, cap-4, recent-good-thing fallback to `Services/MemoryLane.swift`. | M |
| 1.3 | **Remove generic person-tag seeding** ("Me/Kid 1/Kid 2/Partner/Family") — web 0.2.11 deliberately removed these; iOS still seeds them on every launch *and a unit test locks the wrong behavior in* (`JournalLogicTests.swift`). Independent; can land first. | S |
| 1.4 | **Detail categories:** add `category` (default `note`, web's 6-value union) to `MemoryDetail` as SchemaV2 lightweight migration; category chips in editing + Memories filter. Depends on 0.6. | M |
| 1.5 | **Wire formats:** cadence raw values → snake_case (with decode fallback in migration); define the canonical Mood Int↔string mapping once and use it in `ExportService` so exported JSON matches web's shape; close the export gaps (people, details, categories). Depends on 0.6. | S–M |

### 6.4 P2 — Experience parity, then P3 — TestFlight

**P2 (parallelizable):** Gratitude Guide port (`web/src/lib/prompts.ts` → `Services/GratitudeGuide.swift`; needs 1.5's mood mapping) · early-Memory-Lane guidance copy · first-memory celebration (`@AppStorage` dismissal) · entry editing from `EntryDetailView` (currently read-only past days) · Simple/Full toggle port (§5.3). **Deferred post-beta:** per-person sessions, workspaces/accounts, any Supabase work.

**P3:** (3.1) **Premium: hide for beta, don't build the `.storekit` config** — nothing is actually gated, the paywall shows no price (an App Review rejection risk), and gating policy is an open PRD question; StoreKit stays milestone 0.7.0. (3.2) Add SPEC conformance tests to CI. (3.3) Manual QA per `docs/TESTFLIGHT.md`/`docs/QA_TESTFLIGHT.md`, bump build, archive, upload, owner smoke test, then spouse invite.

**Estimated effort:** ~2–3 focused part-time weeks to first upload; P0+P1 alone make a shippable first build, with P2 in a second build if the owner wants TestFlight in hand sooner.

### 6.5 Anti-drift mechanism (prevents the next five divergences)

No codegen — three lightweight artifacts:
1. **`docs/SPEC.md`** — numbered, pinned rule definitions with worked examples: SPEC-1 completion, SPEC-2 streak (grace rule), SPEC-3 Memory Lane ladder table, SPEC-4 detail categories, SPEC-5 wire formats (mood strings, snake_case cadence, export field names), SPEC-6 seeding policy (prompts yes, person tags **no**), SPEC-7 the Simple/Full capability matrix from §5.1.
2. **`spec/fixtures/*.json`** — small input→expected tables per rule (~200 lines total). Web vitest imports them directly; the iOS test target bundles the folder.
3. **Mirrored conformance tests** both CI lanes must pass (`web/tests/*` + new `SpecConformanceTests.swift`). A platform can then only drift by editing a shared fixture — loud in review. Plus one line in the PR template: "touched a SPEC rule → update SPEC, fixture, and both platforms' tests in the same PR."

This mechanism would have caught all five known drifts.

---

## 7. Sequencing, verification, and risks

### 7.1 Recommended order (web-first, per owner decision)

| Wave | Contents | Why first |
|---|---|---|
| **W0 — Hygiene (days)** | §3 Tier 4: doc-sync pass, apply the 4 pending Supabase migrations + email template, version bump to 0.2.12, CHANGELOG catch-up | Unblocks production deploys; removes the "migration list lives in one unlinked file" operational risk |
| **W1 — Web perf core (≈1 wk)** | §4 P1 (serve thumbnails), P2 (dirty-check fix), P5 (memoization), P4 (server round-trips) | Biggest measurable wins, no product-surface risk |
| **W2 — Web trust + loop (≈1–2 wks)** | §3 Tier 1: demo fail-open fix, web push reminders, entry-editing polish; §4 P3 (out-of-band photo upload), P6 (code-splitting), P7 (URL expiry); streak grace rule on web (§6.3 1.1 — lands with SPEC.md) | Reminders close the product's core promise; SPEC.md starts here |
| **W3 — Simple/Full on web (≈1 wk)** | §5.2: migration, `experience-mode.ts`, component gating, Settings toggle, tests + E2E for both modes | Ships the toggle where the users are; produces the fixture iOS will mirror |
| **W4 — iOS P0+P1 (≈1–2 wks)** | §6.2 + §6.3 | First TestFlight-able build |
| **W5 — iOS P2+P3 (≈1–2 wks)** | §6.4 incl. Simple/Full port | TestFlight household beta (solo journals) |
| Continuous | §3 Tiers 2–3 as filler between waves | |

**Execution status (2026-08-11):** waves 0–5 have all landed on `claude/project-audit-plan-gl1g72` (commits `1b6be4e` W0, `9f5f52a` W1, `4f24105`/`481243c`/`3985c3e` W2, `3fe7428` W3, `f746ee1` W4, and the Wave 5 commit for iOS P2 experience parity — Gratitude Guide, early Memory Lane copy, first-memory celebration, entry editing, Simple/Full port with the SPEC-7 iOS conformance test — plus P3's premium-UI hide). Remaining work is operator-side only: the pending Supabase migrations/env vars above, and the iOS signing + manual QA + archive/upload steps in `docs/CURRENT_STATUS.md` and `docs/TESTFLIGHT.md`.

### 7.2 Verification

- **Per-wave gates:** existing CI (lint/typecheck/78 unit/20 E2E web; SwiftLint + `xcodebuild test` iOS) stays green; new features add tests in the same PR (toggle: unit tests on `experience-mode.ts` + one Playwright pass per mode; push: a route test + manual device check).
- **Performance:** before/after measurements per §4's measurement gate (Lighthouse mobile, Memories transferred bytes, sync payload size for a text-only edit, React Profiler keystroke flame), recorded in PR descriptions against a 200-entry seeded fixture.
- **SPEC conformance:** both platforms' fixture tests must pass from W2 onward.
- **Manual QA:** the existing 13-step household script (`docs/CURRENT_STATUS.md`) after W2 and W3; `docs/TESTFLIGHT.md` checklist + owner smoke test before any TestFlight invite.

### 7.3 Top risks

1. **Pending Supabase migrations vs production** — deploying current `main` without applying migrations 4–7 breaks sync (route requires the `sync_journal_entry` RPC). W0 exists to retire this first.
2. **Web push on iOS Safari** requires the PWA to be installed to the home screen (iOS 16.4+ constraint); mitigation: ICS-file fallback + the native app's local notifications already work, and reminders land natively in W4–W5 regardless.
3. **iOS dormancy** — 2+ months untouched; first `xcodebuild` run after P0 signing changes may surface bitrot. Budgeted inside W4.
4. **Streak-rule change is user-visible** on web (numbers can *increase* in the morning) — a one-line release note covers it; direction of change is user-favorable.
5. **Simple-as-default** changes the new-user first impression; the two current testers are grandfathered, and the E2E onboarding spec must be updated in the same PR.
6. **`@supabase/ssr` upgrade** still needs a live magic-link QA pass that only the operator can perform — keep it a discrete W2 item with a rollback (pin the old version).

---

## 8. Appendix — evidence spot-checks performed for this plan

Claims verified directly in source before finalizing: thumbnails signed-but-never-served (`bootstrap.ts` `createPhotoUrlMap` signs only `storage_path`; `previewUrl` maps from it); base64 `previewUrl` included in `serializeEntryForSync` (`journal-sync-delta.ts`); web streak has no grace day while iOS does (`journal-logic.ts` vs `StreakCalculator.swift`); Info.plist hard-codes `1.0 (1)` (`Resources/Info.plist:17-20`); demo mode fails open (`env.ts` `!== "false"`). Exploration coverage: all 20 root/docs markdown files, all 7 Supabase migrations, all web routes/components/lib modules, all 33 Swift files, both CI workflows, and both prior audits' finding-by-finding resolution status.
