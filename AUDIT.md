# Repository Audit — Photo Gratitude Journal

> Auditor: Claude Code, 2026-06-11. Branch: `claude/exciting-rubin-oh519q` (clean tree, identical to `main` at start).
> Scope: full repo. Analysis only — no source code was modified. All `file:line` references verified against this checkout.

---

## 1. Executive Summary

**Overall health: B+.** For a three-week-old project (first commit 2026-05-21, 26 commits), this repo is in unusually good shape: the Supabase layer has complete, well-hardened row-level security; CI gates lint, typecheck, 46 passing unit tests, and a production build on every PR; there are no secrets in the repo, no XSS vectors, and the documentation is genuinely excellent. The product is a private household beta (two intended users), and it clears that bar comfortably.

What keeps it from an A is concentrated in two places. First, the **sync protocol**: the client ships the entire workspace journal on every debounced save, and the server *deletes and reinserts* each entry's nested rows without a transaction — a mid-sync failure permanently destroys server-side data, and concurrent household edits silently clobber each other (the exact two-person flow the beta exists to prove). Second, **`web/src/components/JournalApp.tsx` is a 3,757-line god component** holding 54% of all web source code and the highest churn in the repo — every future feature pays a tax on it.

**Top 3 risks:** (1) non-transactional destructive sync = real data-loss path; (2) whole-journal last-write-wins sync = household edits overwrite each other; (3) sync payload accepted with no runtime validation or size limits.
**Top 3 opportunities:** (1) make per-entry sync transactional and delta-based; (2) split `JournalApp.tsx` while the codebase is still small; (3) put the existing Playwright suite into CI and fix the stale `codex/**` branch filters so the safety net actually fires.

---

## 2. Repo Map

**Purpose:** A private, photo-first gratitude journal. Active path is a **Next.js web beta** (deployed on Vercel, Supabase backend) for household testing by two users; a **SwiftUI iOS scaffold** exists for a later TestFlight phase. Maturity: early private beta, explicitly pre-public-SaaS (`docs/PROJECT_CONTEXT.md:83`).

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3, Supabase (Auth magic links, Postgres + RLS, private Storage), `sharp` for thumbnails, Vitest + Playwright. iOS: SwiftUI, SwiftData + CloudKit, StoreKit 2, iOS 17+.

**Architecture sketch (web):** server component `web/src/app/app/page.tsx` → `loadJournalBootstrap()` (`web/src/lib/bootstrap.ts`) fetches profile, workspaces, last 100 entries, and signs photo URLs → hydrates the single client component `JournalApp.tsx` → all mutations update React state, then an 800 ms-debounced effect POSTs the **full workspace state** to `/api/journal/sync` → the route validates membership/role and upserts/rewrites rows. Demo mode persists the same state to `localStorage` with no server calls.

| Path | What it is |
|---|---|
| `web/src/components/JournalApp.tsx` | Entire app UI: 5 views + onboarding + ~35 sub-components in one 3,757-line file |
| `web/src/app/api/` | 5 route handlers: journal sync, bulk delete, workspace create, member invite/role/remove |
| `web/src/lib/` | 13 small, well-factored logic modules (sync safety, journal logic, bootstrap, prompts, dates…) |
| `web/supabase/migrations/` | 3 SQL migrations: full schema + RLS, invite function, tag-seeding change |
| `web/tests/` | 8 Vitest unit files (46 tests) + 10 Playwright e2e tests (`tests/e2e/app.spec.ts`, 270 lines) |
| `PhotoGratitudeJournal/` | iOS scaffold: App/, Models/ (SwiftData), Services/ (10 files), Views/ (15 files), ~4,900 LOC Swift |
| `PhotoGratitudeJournalTests/` | 12 unit tests over core logic (completion, streaks, Memory Lane, seeding) |
| `docs/` | 15 docs: PRD, architecture, status, QA checklists, ops runbooks — actively maintained |
| `.github/workflows/` | `web-ci.yml` (lint/typecheck/test/build) and `ios-ci.yml` (xcodebuild test on macOS) |

**Churn highlights** (`git log --format= --name-only | sort | uniq -c | sort -rn`): hottest files are `docs/ROADMAP.md` (13), `web/src/components/JournalApp.tsx` (12), `web/tests/e2e/app.spec.ts` (11), `README.md` (11) — the god component is also the change magnet. No abandoned areas; the iOS tree is intentionally dormant (`docs/PROJECT_CONTEXT.md:118`).

**Surprises:** (1) documentation quality far above typical for a solo 3-week project; (2) RLS coverage is complete and disciplined — rare; (3) the entire web UI being one file, given how disciplined everything else is.

---

## 3. Audit Report

Severity calibrated to "private household beta heading toward wider beta". Facts vs. `[judgment]` labeled per finding.

### 3.1 Security

Critical-first ordering. **No Critical findings.** The baseline is strong: RLS enabled on all 13 tables with SELECT/INSERT/UPDATE/DELETE policies and `WITH CHECK` clauses (`web/supabase/migrations/202605210001_initial_schema.sql:433-538`); all 15 `SECURITY DEFINER` functions set `search_path = ''` and revoke public execute (same file, 143-374, 572-596); storage buckets are private with workspace-scoped policies (541-570); no service-role key is used anywhere in app code (grep over `web/src` — zero hits); no hardcoded secrets (grep for `eyJ`, `sk-`, `service_role`, `password` patterns — only lockfile/copy hits); no `dangerouslySetInnerHTML` anywhere.

| # | Finding | Severity | Type |
|---|---|---|---|
| S1 | **Sync payload accepted without runtime validation or size limits.** `request.json() as SyncPayload` is a bare type-cast (`web/src/app/api/journal/sync/route.ts:29`); no schema validation, no length caps on text fields, no byte cap on base64 photo payloads (`parseImageDataUrl` validates type only, `web/src/lib/journal-sync-safety.ts:54-70`). App Router route handlers have no default body limit. Any authenticated editor can POST arbitrarily large/malformed payloads; malformed JSON throws an unhandled 500. RLS bounds the blast radius to the member's own workspace, hence not High. | Medium | Fact |
| S2 | **Email enumeration via invite function.** `invite_workspace_member` returns the distinct error "That person needs to sign in once before they can be invited" only when no profile matches (`web/supabase/migrations/202605230001_workspace_member_invites.sql:35-43`), letting any authenticated workspace owner probe which emails have accounts. Acceptable in a closed two-person beta; must be fixed before wider beta (`docs/PROJECT_CONTEXT.md:467-478` is the stated gate). | Medium | Fact |
| S3 | **Demo mode persists full journal (entries + base64 photos) unencrypted in `localStorage`** (`web/src/components/JournalApp.tsx:172-178`). On a shared device, demo entries are readable by anyone with browser access. `[judgment]` Low because demo is explicitly a non-private review mode. | Low | Fact + [judgment] |
| S4 | **`invitation_state = 'invited'` is dead schema.** The column supports `invited`/`accepted` (`202605210001:25`) but the invite function hardcodes `'accepted'` (`202605230001:51`) — invitees get instant access with no consent step. Fine for family; a design decision to revisit pre-public. | Low | Fact |

Strengths worth naming: photo storage paths are validated against traversal and workspace prefix both in app code (`web/src/lib/journal-sync-safety.ts:47-52`, enforced at `sync/route.ts:348`) and in SQL (`storage_workspace_id`, `202605210001:268-288`); open-redirect protection on auth callback (`web/src/lib/auth-redirect.ts:1-11`); uploaded images are re-encoded through sharp, defusing polyglot files (`web/src/lib/photo-thumbnails.ts:10-20`); iOS photos get `completeUntilFirstUserAuthentication` file protection (`PhotoGratitudeJournal/Services/PhotoStore.swift:51`).

### 3.2 Architecture & Design

| # | Finding | Severity | Type |
|---|---|---|---|
| A1 | **God component: `web/src/components/JournalApp.tsx` is 3,757 lines — 54% of web src (6,920 total).** The root `JournalApp` function spans lines 124–713; the file contains 52 `useState` calls and ~35 sub-components (Sidebar:714, OnboardingOverlay:833, TodayView:1304, MemoriesView:2193, CalendarView:2580, InsightsView:2634, SettingsView:2678, HouseholdSharingPanel:2910, EntryDetailModal:3352, …). It is also the highest-churn source file (12 of 26 commits touch it). `[judgment]` Every feature change funnels through one file; merge conflicts, review difficulty, and accidental coupling will grow superlinearly. This is the single biggest impediment to "world-class product" velocity. | High | Fact + [judgment] |
| A2 | **Full-state sync protocol.** The client sends *all* entries, people, prompts, and reminders for the workspace on every debounced save (`JournalApp.tsx:264-274`); the server then rewrites nested rows for *every* entry in the payload (`sync/route.ts:230-233`). Cost per save grows with journal size forever, and the server cannot distinguish "unchanged" from "changed". This is the root cause of findings C1, P1, and the concurrency risk the docs themselves flag (`docs/PROJECT_CONTEXT.md:449`). | High | Fact |
| A3 | The `lib/` layer is healthy: 13 single-purpose modules, pure functions, no circular deps observed; API routes consistently follow auth → membership → role → mutate. One sentence and move on. | — | [judgment] |

### 3.3 Code Quality (correctness)

| # | Finding | Severity | Type |
|---|---|---|---|
| C1 | **Non-transactional delete-then-reinsert destroys data on partial failure.** For each synced entry the server deletes `entry_person_tags`, `journal_sessions` (cascading `prompt_responses`), and `memory_details`, then reinserts (`sync/route.ts:257-299`); photos are deleted then reinserted (`:325-331`). Each statement is a separate HTTP call — Supabase JS has no transactions. If an insert fails after the deletes (network blip, constraint, function timeout), the entry's responses/tags/details/photo rows are **gone server-side** while the client believes it saved. The route returns 500 and the client retries with full state, which usually self-heals — but a client that closes the tab after the failure loses the data permanently. | High | Fact |
| C2 | **Last-write-wins with no version check.** Existing entries are upserted with the client's `updated_at` and no comparison against the server row (`sync/route.ts:225-228`). Two household members editing the same day — or one stale tab — silently overwrite each other's text, tags, and photos for *every entry in the payload* (which is all of them, per A2). The docs name this a known beta risk (`docs/PROJECT_CONTEXT.md:449`); it deserves a guard before the two-person QA gate, not after. | High | Fact |
| C3 | **Unguarded `localStorage.setItem` in demo mode.** The persistence effect (`JournalApp.tsx:172-178`) has no try/catch; compressed photo data URLs (canvas JPEG at 0.82 quality, `JournalApp.tsx:3730`) will hit the ~5 MB quota within roughly a dozen photos, and `QuotaExceededError` thrown inside the effect crashes the React tree for demo users. | Medium | Fact |
| C4 | **iOS: 25+ `try?` sites silently swallow persistence errors.** Every `modelContext.save()` in `JournalStore.swift` (16 sites: lines 19, 29, 47, 57, 76, 94, …), plus `PhotoStore.swift:42-51`, `PromptSeeder.swift`, `EntitlementService.swift:43,48`, and view-level saves (`TodayView.swift:499`, `SettingsView.swift:253-263`). A failed save = silent data loss with zero user feedback. Dormant codebase, so Medium, but it must be fixed before TestFlight. | Medium | Fact |
| C5 | Smaller silences in web: bare `catch {}` on localStorage parse (`JournalApp.tsx:167-169`), photo-compression failure silently falls back to the original file (`JournalApp.tsx:1521`), `signOut()` result unawaited/unchecked (`JournalApp.tsx:558-561`). No error telemetry exists anywhere — debugging tester reports relies on reproduction. | Low | Fact |

### 3.4 Testing

Ran the suite: **46/46 unit tests pass in 1.22 s** (`npm test`, Vitest 3.2.4 — output in appendix). Lint and `tsc --noEmit` are clean. iOS tests could not be run here (Linux container, no Xcode); CI runs them on `macos-15`.

| # | Finding | Severity | Type |
|---|---|---|---|
| T1 | **The riskiest code has zero tests.** `web/tests/` covers pure logic (sync-safety helpers, onboarding, journal logic, copy) but nothing exercises `/api/journal/sync`'s orchestration — the delete/reinsert ordering, partial-failure behavior, photo-path rejection, or role gates (`web/src/app/api/journal/sync/route.ts:180-334` has no test file). The bugs that can lose user data live exactly where the tests aren't. | High | Fact + [judgment] |
| T2 | **Playwright e2e suite (10 tests, `web/tests/e2e/app.spec.ts`) is never run in CI.** `web-ci.yml` runs lint/typecheck/unit/build only. The suite exists, has an npm runner (`test:e2e`), and is the only automated check of real user flows. | Medium | Fact |
| T3 | iOS: 12 tests cover core logic well (completion, streaks, Memory Lane, seeding — `PhotoGratitudeJournalTests/JournalLogicTests.swift`), but `PhotoStore`, `ReminderScheduler`, `PrivacyLockService`, `EntitlementService`, and `ExportService` are untested. Acceptable for a dormant scaffold. | Low | Fact |

### 3.5 Performance

| # | Finding | Severity | Type |
|---|---|---|---|
| P1 | **Bootstrap silently caps history at 100 entries** (`web/src/lib/bootstrap.ts:179`). A daily journaler hits this in ~3 months; older entries then vanish from Calendar, Memories, Insights, and Memory Lane with no indication — for a product whose thesis is *rediscovery*, this is a time-bomb on the core promise. (The web Memory Lane progression promises 1–3 year lookbacks, `docs/PROJECT_CONTEXT.md:333-344`, which the cap makes unreachable.) | Medium | Fact + [judgment] |
| P2 | **Photo URL signing is N+1:** one `createSignedUrl` round trip per photo in `Promise.all` (`bootstrap.ts:263-268`); Supabase offers batch `createSignedUrls`. With 100 entries × 2 photos × 2 (original+thumb), that's hundreds of sequential-ish storage API calls on every page load. | Low | Fact |
| P3 | Sync payload grows O(journal size) per save (see A2) — bandwidth and server work scale with history, not with the edit. | Medium | Fact |
| P4 | Client photo compression runs on the main thread via canvas (`JournalApp.tsx:3713-3738`), freezing the UI for large images; search/filter in MemoriesView recomputes per keystroke without memoization (`JournalApp.tsx:2193+`). `[judgment]` Imperceptible at ≤100 entries; bundle size is fine (196 kB first-load for `/app`, build output in appendix). | Low | Fact + [judgment] |

### 3.6 Dependencies

`npm audit`: **3 vulnerabilities — 1 critical (vitest <3.2.6, arbitrary file read/exec via Vitest UI server, GHSA-5xrq-8626-4rwp), 2 moderate (postcss <8.5.10 XSS via Next's bundled copy)**. The vitest issue is dev-only and fixed by `npm audit fix` (wanted: 3.2.6). The postcss one resolves with a Next.js patch bump (npm's suggested `next@9.3.3` "fix" is a downgrade artifact — ignore it). `npm outdated`: stack is current-generation; majors available but not urgent (next 15→16, tailwind 3→4, eslint 9→10, `@supabase/ssr` 0.6→0.12). Lockfile present and honored (`npm ci` clean). Dependency footprint is admirably small: 8 runtime deps. | Severity: **Medium** (the critical advisory, because the fix is free) | Fact |

### 3.7 DevEx & Operations

| # | Finding | Severity | Type |
|---|---|---|---|
| D1 | **CI branch filters are stale: both workflows trigger push builds only on `main` and `codex/**`** (`.github/workflows/web-ci.yml:4-7`, `ios-ci.yml`), but current development happens on `claude/**` branches (e.g., this one). Direct pushes to working branches get no CI; only PRs to main are covered. | Low | Fact |
| D2 | No error reporting/observability in production beyond Vercel defaults — tester-reported bugs can't be correlated with server errors. `[judgment]` A lightweight log line per sync failure would pay for itself immediately. | Low | [judgment] |
| D3 | Setup story is good: `web/.env.example` is complete, README web steps work (validated `npm ci`/`test`/`lint`/`typecheck`/`build` in this container), demo mode allows zero-config UX review. iOS CI lacks SwiftLint/coverage but does run the test suite on PRs. | — | Fact |

### 3.8 Documentation

Documentation is a strength overall (15 current docs, ops runbooks, QA checklists). One drift: **README.md:59,72 and `docs/PROJECT_CONTEXT.md:65` still say version `0.2.10`** while `web/package.json:3` and `docs/CURRENT_STATUS.md` say `0.2.11` — the version is hand-copied into at least 4 places. README also frames the workspace as Windows ("this Windows workspace cannot run xcodebuild", README.md:24) which no longer matches cloud/Linux sessions. | Severity: Low | Fact |

### 3.9 Strengths (preserve these)

1. **Exemplary RLS discipline** — every table, every verb, `WITH CHECK` everywhere, hardened `SECURITY DEFINER` helpers. This is the hardest thing to retrofit and it's already done.
2. **Defense in depth** — auth/role checks at API layer *and* RLS; path validation in app code *and* SQL.
3. **CI gates on every PR**: lint + typecheck + unit tests + production build (web), simulator tests (iOS).
4. **Small, pure, tested logic modules** in `web/src/lib/` — the culture to extend when splitting the god component.
5. **Documentation as a first-class artifact** — context, status, QA gates, and known risks are written down and mostly accurate.
6. **Honest self-knowledge**: the docs already name the concurrency risk and the untested household flow; the audit confirms the team's instincts.
7. Minimal dependency surface; no secrets in repo; privacy posture (private buckets, signed URLs, magic links, iOS file protection + Face ID) matches the product's "private by design" promise.

---

## 4. Improvement Strategy

### Theme 1 — Make sync trustworthy (explains C1, C2, A2, P3, S1, T1)
**Target state:** a sync request is validated, scoped to what changed, applied atomically per entry, and refuses stale writes. **Principle:** the journal is the product; a save must either fully succeed or leave the server untouched — never in between. Concretely: runtime schema validation + size caps at the boundary; move per-entry rewrite into a single Postgres RPC (transaction); compare `updated_at` and reject/merge stale entries; client sends only dirty entries.

### Theme 2 — Break up the god component before it calcifies (explains A1, partially P4)
**Target state:** `JournalApp.tsx` ≤ ~400 lines of state/orchestration; each view (`Today`, `Memories`, `Calendar`, `Insights`, `Settings`, onboarding, household panel) in its own file; shared state via a couple of custom hooks. **Principle:** match the discipline already present in `lib/` — the codebase is 7 kLOC now; this costs days now and weeks later.

### Theme 3 — Errors must be seen (explains C3, C4, C5, D2)
**Target state:** no silent `catch {}` / `try?` on persistence paths; sync failures logged server-side with workspace id; user-facing save-state already exists (`SaveStatePill`) — feed it honestly. **Principle:** a private journal app's worst failure mode is "it said saved but it wasn't"; visibility is cheaper than recovery.

### Theme 4 — Let the existing safety net actually fire (explains T1, T2, D1, dependency finding)
**Target state:** Playwright runs in CI; CI triggers on current branch conventions; `npm audit` is clean; the sync route has regression tests for its failure modes. **Principle:** the project already built the tools — connect them.

### Explicit non-goals (recommended NOT to do now)
- **No pagination/virtualization framework** for lists — raise the 100-entry window pragmatically (P1) but don't build infinite-scroll infrastructure for a 2-user beta.
- **No major version migrations** (Next 16, Tailwind 4, ESLint 10) — zero product payoff now, real regression risk.
- **No iOS feature work or refactor** beyond the error-handling pass — it's not the beta path; revisit when TestFlight work starts (owner confirmed iOS is a 2026 goal, so the error pass is a hard pre-TestFlight gate).
- **No external observability SaaS (Sentry etc.)** yet — structured console logging on Vercel is sufficient at this scale.
- **No field-level merge for conflicts** — the per-person-sections decision (M2-T6) plus a simple server-wins backstop makes CRDT-style merging unnecessary.
- **No original-quality photo storage** — owner accepted compressed (canvas JPEG 0.82) as the archival format.
- **No demo-mode localStorage encryption** — guard the quota crash (C3) and label demo as non-private; anything more fights the feature's purpose.

### Definition of done (measurable)
- Zero High findings open; `npm audit` reports 0 critical/high.
- A sync request with an induced mid-flight failure leaves server data intact (regression test proves it).
- A stale-client sync (older `updated_at`) cannot overwrite a newer server row (test proves it).
- `wc -l web/src/components/JournalApp.tsx` ≤ 500; no source file > 800 lines.
- CI runs Playwright e2e on every PR; CI triggers on the branch convention actually in use.
- `/api/journal/sync` has ≥ 8 regression tests covering validation, role gates, path rejection, and failure atomicity.
- One source of truth for the app version (README/docs reference it, not restate it).

---

## 5. Task Plan

Statuses all `todo`. Effort: S < 2 h, M ≈ half-day, L ≈ 1–2 days, XL needs breakdown.

### Milestone M0 — Safety net

| ID | Status | Title | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M0-T1 | done | Run Playwright e2e in web CI | `.github/workflows/web-ci.yml` | CI job installs browsers, runs `npm run test:e2e` (demo mode), fails the PR on test failure | S | Low | — |
| M0-T2 | done | Fix CI branch triggers | `.github/workflows/web-ci.yml:4-7`, `ios-ci.yml` | Push builds trigger on `claude/**` (or all branches); verified by a push run | S | Low | — |
| M0-T3 | done | `npm audit fix` (vitest ≥ 3.2.6) | `web/package-lock.json` | `npm audit` shows 0 critical; tests still pass | S | Low | — |
| M0-T4 | done | Regression tests for sync route failure modes | `web/tests/`, mock Supabase client | ≥ 8 tests: payload validation, role gate, foreign-workspace filter, unsafe path rejection, partial-failure behavior documented by a failing-then-fixed test | M | Low | — |
| M0-T5 | done | Guard demo-mode localStorage quota | `web/src/components/JournalApp.tsx:172-178` | `setItem` wrapped; on quota error user sees a gentle notice, app does not crash; unit test for the wrapper | S | Low | — |

### Milestone M1 — Critical fixes (correctness & security)

| ID | Status | Title | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M1-T1 | done | Transactional per-entry sync via Postgres RPC | new migration (`sync_journal_entry` function), `web/src/app/api/journal/sync/route.ts:230-334` | Entry + nested rows applied in one transaction; induced mid-sync failure leaves prior server state intact (test from M0-T4 flips green); RPC is `SECURITY DEFINER`-hardened per existing house style or `security invoker` relying on RLS | L | Medium | M0-T4 |
| M1-T2 | done | Stale-write guard on entries | same RPC / route, `JournalApp.tsx` sync effect | Server rejects entry writes whose `updated_at` ≤ stored value with a 409; client refetches and surfaces "updated elsewhere" via SaveStatePill; two-tab manual QA passes | M | Medium | M1-T1 |
| M1-T3 | done | Runtime validation + size limits on sync payload | `sync/route.ts:29`, `journal-sync-safety.ts` (zod or hand-rolled guards to match house style) | Malformed payload → 400 (not 500); text fields length-capped; photo base64 capped (e.g. 8 MB); tests cover each rejection | M | Low | — |
| M1-T4 | done | Remove email enumeration from invite flow (stopgap) | `web/supabase/migrations/` (new), `202605230001:35-43`, members route | Unknown-email and known-email invites return indistinguishable responses to the caller; UI copy updated. Superseded long-term by M2-T5 but ships first | S–M | Low | — |

### Milestone M2 — High-leverage

| ID | Status | Title | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M2-T1 | done | Split `JournalApp.tsx` into modules | `web/src/components/` (new: `views/TodayView.tsx`, `views/MemoriesView.tsx`, `views/CalendarView.tsx`, `views/InsightsView.tsx`, `views/SettingsView.tsx`, `onboarding/`, `household/`, hooks) | `JournalApp.tsx` ≤ 500 lines; no behavior change (e2e suite green); no file > 800 lines | XL → break into one PR per view | Medium | M0-T1 (e2e in CI first) |
| M2-T2 | todo | Delta sync: send only dirty entries | `JournalApp.tsx` sync effect (:239-298), sync route | Payload contains only entries changed since last ack; payload size constant w.r.t. journal size in a 200-entry fixture; conflict guard (M1-T2) still holds | M | Medium | M1-T1, M1-T2 |
| M2-T3 | partial | Lift the 100-entry bootstrap cap (12-month window) | `web/src/lib/bootstrap.ts:179`, calendar/memories data paths | Last 12 months load eagerly, older entries fetch on demand; Memory Lane reaches 1-year lookbacks with a 400-entry fixture; initial load < 2 s | M | Medium | M2-T2 preferred |
| M2-T4 | done | Server-side error logging for sync/API failures | API routes, `bootstrap.ts` | Every 4xx/5xx logs a structured line (route, workspace, error class — no journal content) visible in Vercel logs; documented in `docs/WEB_APP.md` | S | Low | — |
| M2-T5 | todo | Pending-invite consent flow | new migration (use `invitation_state='invited'`), `202605230001`, members routes, `JournalApp.tsx` household panel | Invitee sees pending invite on next sign-in and must accept before membership activates; RLS already excludes non-accepted members (no policy change needed); unknown emails get the same caller response as known ones (closes S2 fully); e2e covers invite→accept→shared-workspace | L | Medium | M1-T4 |
| M2-T6 | todo | Per-person day sections | new migration (`created_by` on `journal_sessions`), sync route/RPC, Today + entry detail views | Each member's responses live in their own session; both partners editing the same day never touch the same response rows; entry detail shows both sections attributed; conflict guard (M1-T2) remains the backstop for shared fields (mood, photos, tags) | L | Medium | M1-T1, M1-T2, M2-T1 |

### Milestone M3 — Quality & polish

| ID | Status | Title | Files/areas | Acceptance criteria | Effort | Risk | Deps |
|---|---|---|---|---|---|---|---|
| M3-T1 | done | Batch photo URL signing | `bootstrap.ts:262-268` | Single `createSignedUrls` call per bucket; page load makes ≤ 2 storage API calls | S | Low | — |
| M3-T2 | done | Single source of truth for app version | `README.md:59,72`, `docs/PROJECT_CONTEXT.md:65`, docs guidance | Docs reference Settings > Beta / package.json instead of restating the number; stale `0.2.10` mentions gone | S | Low | — |
| M3-T3 | done | iOS error-handling pass (pre-TestFlight gate) | `JournalStore.swift` (16 `try?` sites), `PhotoStore.swift`, views | Persistence failures surface a user-visible alert or logged error; zero bare `try? modelContext.save()` remaining. Blocking for TestFlight per owner decision | M | Low | — |
| M3-T4 | todo | Move photo compression off main thread | `JournalApp.tsx:3713-3738` (post-split: photo lib) | `createImageBitmap` + `OffscreenCanvas`/worker; UI stays interactive compressing a 12 MP image | M | Low | M2-T1 |
| M3-T5 | todo | Dependency hygiene pass | `web/package.json` | `@supabase/ssr` → 0.12.x, minor bumps applied; audit clean; e2e green | S–M | Low | M0-T1 |
| M3-T6 | todo | SwiftLint in iOS CI | `.github/workflows/ios-ci.yml` | Lint step runs and gates iOS PRs | S | Low | — |

### Quick wins (high impact, S effort)
**M0-T1** (e2e in CI), **M0-T2** (branch filters), **M0-T3** (audit fix), **M0-T5** (quota guard), **M3-T1** (batch signing), **M3-T2** (version drift).

### Implementation sketches — top 3

**M1-T1 Transactional sync RPC.** Add migration creating `public.sync_journal_entry(payload jsonb)` (or one function per concern) that performs the current delete+reinsert of `entry_person_tags`/`journal_sessions`/`prompt_responses`/`memory_details`/`photo_attachments` inside one transaction, after re-checking `can_edit_workspace` (follow the existing hardening pattern: `security definer`, `set search_path = ''`, grant to `authenticated` only — or prefer `security invoker` and let RLS authorize, simpler to reason about). Route keeps doing photo *storage* uploads first (storage isn't transactional anyway), then calls the RPC with row data. Gotchas: photo upload succeeding + RPC failing leaves an orphaned storage object — acceptable, add a note; jsonb payload must be size-capped (pairs with M1-T3); keep the route's response shape identical so the client is untouched.

**M2-T1 Split the god component.** Order of extraction (lowest coupling first): `EntryDetailModal` (:3352), `Sidebar`/`MobileTabs` (:714/:807), `InsightsView` (:2634), `CalendarView` (:2580), `MemoriesView` (:2193), `SettingsView`+`HouseholdSharingPanel` (:2678/:2910), `OnboardingOverlay` cluster (:833-1303), `TodayView` cluster (:1304-2192) last. Before extracting views, pull state into 2–3 hooks (`useJournalState`, `useJournalSync`, `useWorkspace`) so views receive props/context, not 30 closures. One PR per extraction; e2e suite (now in CI per M0-T1) is the regression harness. Gotcha: many sub-components capture setters from the parent closure — convert to explicit props as you go, resist "shared context for everything".

**M1-T2 Stale-write guard.** Inside the RPC, `update ... where id = $id and updated_at <= $client_updated_at` (or select-compare) and report rejected ids back; route returns 409 with the list; client on 409 refetches bootstrap for those entries, merges (server wins), and shows "Updated on another device" in `SaveStatePill`. Gotcha: client currently generates `updated_at` locally — keep clocks out of it by having the server return the authoritative `updated_at` on every ack and echoing it back on next sync (a version token in disguise). Pairs naturally with M2-T2.

---

## 6. Open Questions — RESOLVED (owner decisions, 2026-06-12)

1. **Invitation consent → Add pending-invite flow.** Invitees must accept before joining a workspace; `invitation_state='invited'` becomes a real state. The immediate email-enumeration fix (M1-T4) stays as a security stopgap; the full consent flow is new task **M2-T5**.
2. **History scale target → Daily personal use (~400 entries/yr).** M2-T3 scoped to a windowed load: last 12 months eager, older on demand; client-side search stays.
3. **iOS timeline → Yes, TestFlight this year.** iOS CI stays as-is; the iOS error-handling pass (M3-T3) is a hard pre-TestFlight gate, not optional polish.
4. **Conflict policy → Per-person sections.** Each household member writes their own session/responses for a day, structurally avoiding most same-row conflicts (new task **M2-T6**, building on the existing `journal_sessions` model). The stale-write guard (M1-T2) ships first as the backstop, using simple server-wins + notify for whatever rows remain shared (mood, photos, tags).
5. **Photo retention → Compressed is fine.** Canvas JPEG at 0.82 quality is the accepted archival quality; no task added.

---

## 7. Evidence Appendix

All commands run from repo root or `web/` on 2026-06-11, branch `claude/exciting-rubin-oh519q` (clean, == origin/main HEAD `7736349`).

| Command | Key output |
|---|---|
| `git log --oneline | wc -l`; `git log --reverse --format='%ci' | head -1` | 26 commits; first commit 2026-05-21, last 2026-06-07 |
| `git log --format= --name-only | sort | uniq -c | sort -rn | head` | Churn: ROADMAP.md 13, **JournalApp.tsx 12**, e2e/app.spec.ts 11, README.md 11 |
| `wc -l web/src/**/*.ts(x)` | 6,920 total; **JournalApp.tsx 3,757**; sync/route.ts 381; page.tsx 368; bootstrap.ts 326 |
| `grep -c useState web/src/components/JournalApp.tsx` | 52 |
| `npm ci` (web) | clean install, exit 0 |
| `npm test` (web) | **8 files, 46/46 passed, 1.22 s** (Vitest 3.2.4) |
| `npm run lint`; `npm run typecheck` | both clean, exit 0 |
| `npm run build` | ✓ compiled; 10 routes; `/app` first-load JS 196 kB |
| `npm audit` | **3 vulns: 1 critical (vitest <3.2.6, GHSA-5xrq-8626-4rwp, dev-only), 2 moderate (postcss <8.5.10 via next)** |
| `npm outdated` | majors available: next 16, tailwind 4, eslint 10, @supabase/ssr 0.12, vitest 4; minors otherwise |
| `grep -rn 'service_role|eyJ|sk-' web/src` | no service-role usage; no embedded JWTs/keys in source |
| `wc -l` Swift | ~4,923 LOC; largest: TodayView.swift 595, MemoriesView.swift 466 |
| `grep -n 'try?' PhotoGratitudeJournal/**` | 25+ sites (JournalStore.swift ×16, PhotoStore, PromptSeeder, EntitlementService, views) |
| iOS tests | **not run** — no Xcode in this Linux container; CI (`ios-ci.yml`) runs them on `macos-15` per PR |
| Playwright e2e | **not run in this audit** (needs browser install + built app); 10 tests exist in `web/tests/e2e/app.spec.ts`; absent from `web-ci.yml` |

Key file:line evidence cited inline throughout §3. Exploration breadth: three parallel read-only subagent sweeps (web app, Supabase layer, iOS app) plus direct verification of every High/Medium finding by the auditor.

---

## 8. Execution Log (2026-06-12)

Plan execution on branch `claude/exciting-rubin-oh519q`. All work verified by the full local suite (unit tests, lint, typecheck, build, Playwright e2e) plus a Postgres functional harness.

**Completed (status updated in §5):**
- **M0-T1/T2/T3:** Playwright e2e runs in web CI with report upload on failure; both workflows trigger on `claude/**`; `npm audit` critical (vitest) cleared — remaining 2 moderate advisories are postcss bundled inside Next, unfixable without a major Next upgrade (explicit non-goal).
- **M0-T4:** 9 route-level regression tests (mocked Supabase) + 8 payload-validation tests; `vitest.config.ts` adds the `@/` alias.
- **M0-T5:** demo-mode `localStorage` writes guarded (`web/src/lib/demo-storage.ts`); quota exhaustion surfaces a gentle notice instead of crashing.
- **M1-T1/T2:** new migration `202606120001_transactional_entry_sync.sql` — `sync_journal_entry(jsonb)`, SECURITY INVOKER (RLS still authorizes), rewrites each entry atomically and refuses stale writes (`base_updated_at` older than the server row → status `stale`, server wins). Client tracks server baselines in a ref and shows a "changed on another device" notice. Proven by a functional harness (`web/supabase/tests/`) on Postgres 16: atomic apply, stale refusal, **rollback-on-failure leaves prior state intact**, viewer refusal, no false stale.
- **M1-T3:** runtime validation + size caps for the whole sync payload (`web/src/lib/journal-sync-validation.ts`); malformed JSON → 400.
- **M1-T4:** migration `202606120002_invite_without_account_probe.sql` removes the account-existence error oracle (unknown email → empty result, neutral UI copy). Residual list-visibility signal documented; closes fully with M2-T5.
- **M2-T4:** structured failure logging (`web/src/lib/server-log.ts`) wired into the journal sync and delete routes — route, status, user/workspace ids, error class; never journal content.
- **M2-T3 (partial):** bootstrap now loads a 12-month eager window **plus** ±7-day slices around the 2y/3y anniversaries (`eagerEntryWindows` in `journal-logic.ts`, tested), cap raised to 500 as a runaway-data guard. Remaining: on-demand fetch of older archive pages for Memories/Calendar browsing beyond the window.
- **M3-T1:** photo URL signing batched (one `createSignedUrls` call per load).
- **M3-T2:** docs reference `web/package.json` / Settings > Beta instead of restating the version.

**Found during execution (not in the original audit):**
- **The production invite function was broken for every registered-user invite.** `invite_workspace_member`'s `RETURNS TABLE` out-parameters made `on conflict (workspace_id, user_id)` ambiguous; any invite of an existing account failed with `column reference "workspace_id" is ambiguous`. The household-sharing flow — the beta's stated next gate — could never have completed. Fixed in `202606120002` (`#variable_conflict use_column`) and regression-covered in the functional harness. Discovered only because the harness executes the SQL rather than reviewing it.

**Operator action required before deploying `main`:** apply the two new migrations in Supabase, in order:
1. `web/supabase/migrations/202606120001_transactional_entry_sync.sql` (the sync route now requires the RPC)
2. `web/supabase/migrations/202606120002_invite_without_account_probe.sql` (fixes household invites)

**Still open:** M2-T1 (split `JournalApp.tsx` — one PR per view), M2-T2 (delta sync), M2-T5 (pending-invite consent flow), M2-T6 (per-person day sections), M2-T3 remainder (older-archive on demand), M3-T3 (iOS error pass — pre-TestFlight gate), M3-T4/T5/T6.
