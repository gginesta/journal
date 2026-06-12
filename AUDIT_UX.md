# UX Audit — Photo Gratitude Journal (Web Beta)

> Auditor: Claude Code, 2026-06-12. App version 0.2.11, demo mode, production build served locally.
> Method: scripted walkthrough of every surface with Playwright (iPhone 13 viewport + 1366×900 desktop), 25 screenshots, axe-core accessibility scans on 8 surfaces, copy review against the product's own tone rules in `docs/PROJECT_CONTEXT.md`. Reusable script: `web/scripts/ux-walkthrough.mjs`.

---

## 1. Executive Summary

**Overall UX health: B.** The product's voice is its superpower — the copy is warm, concrete, and disciplined ("One photo or one line is enough", "This is a quiet place to keep one good moment from today"), the visual language is consistent, and the capture ritual itself is genuinely low-friction: no save button, text-or-photo both count, and the "Today is kept" confirmation lands the emotional promise. Onboarding to first memory is 4 taps.

Two things hold it back. First, **the Today screen contradicts its own promise**: measured on an iPhone viewport it is **6.5 screens tall with 13 sections and 51 buttons** — the one-minute ritual is the first 2 screens, followed by 4.5 screens of guides, lookbacks, and a prompt list that duplicates questions the user just answered. The tone doc explicitly warns against "homework" and "overexplaining the UI inside the app"; the current page does both. Second, **accessibility has systematic gaps that axe flags as critical**: the journaling textareas — the core input of the entire product — have no accessible labels, 11 Settings inputs and 3 selects are unlabeled, and the brand rose-on-cream chips fail WCAG AA contrast on every screen (2–9 elements per page).

**Top 3 fixes:** (1) label every form control — half a day, removes all critical axe violations; (2) restructure Today into "ritual first, discovery after" — move pick-me-up/Gratitude Guide/Memory Lane behind the completion moment and delete the duplicate prompt snapshot; (3) fix the text-only memory card, which currently renders a huge empty photo placeholder that makes a text-first archive look broken.

---

## 2. Evidence Base

| Check | Result |
|---|---|
| Surfaces walked | Homepage, Login, Onboarding (4 steps), Today (empty + filled), Memories, Calendar, Insights, Settings, Entry detail — phone + desktop |
| Today depth (iPhone 13) | `scrollHeight` 4,331 px = **6.5 viewports**; 13 `section/article` blocks; 51 buttons |
| Onboarding → first memory | 4 taps (or 1 via "Skip tour"); no dead ends; back/skip always visible |
| axe-core scans | 8 surfaces; **critical**: `label` (textareas, 1–11 nodes/screen), `select-name` (3 selects); **serious**: `color-contrast` (2–9 nodes on every surface); moderate: `region` on onboarding. Login: **zero violations** |
| Keyboard/motion | Inputs have visible focus rings (`focus:ring-4`); buttons keep default outlines; `prefers-reduced-motion` handled globally in `globals.css` |
| Touch targets | Most controls ≥40 px; 6 controls at `min-h-9` (36 px) — photo reorder/remove row |
| Horizontal overflow | None on phone (enforced by e2e tests — good practice) |

---

## 3. Findings

Severity calibrated to "private household beta, aiming at a public, world-class product." Facts are measured or screenshot-backed; judgments marked.

### 3.1 Accessibility

| # | Finding | Severity |
|---|---|---|
| U1 | **The core journaling textareas have no accessible label** (axe `label`, critical; every Today/onboarding-preview render). A screen-reader user hears an anonymous edit field where the product's heart is. Prompt titles are adjacent text, not associated labels. Fix: `aria-label={promptTitle}` on the textarea in `TodayView` PromptPanel (and the onboarding preview). | **High** (fact) |
| U2 | **11 unlabeled inputs in Settings** (prompt title/text editor rows, member email) and **3 unlabeled selects** (Memories filter, Settings workspace & role selects) — axe `label`/`select-name`, critical. | **High** (fact) |
| U3 | **Brand contrast failure**: `text-rose` on `bg-rose/10` chips and the rose uppercase eyebrow text fail WCAG AA on every surface (axe `color-contrast`, serious, 2–9 nodes/screen; includes person-tag chips with computed pastel backgrounds, e.g. `#7C6F64` at 12% alpha). Fix once in the theme: darken chip text one step or deepen chip backgrounds. | **High** (fact) |
| U4 | Onboarding content sits outside semantic landmarks (axe `region`, moderate, 4–8 nodes). Wrap steps in `<main>`. | Low (fact) |
| U5 | 6 touch targets at 36 px height (photo reorder/remove buttons, `min-h-9`) — below the 44 px platform guideline; everything else ≥40 px. | Low (fact) |

### 3.2 Information architecture & density

| # | Finding | Severity |
|---|---|---|
| U6 | **Today is 6.5 phone-screens deep** (4,331 px / 664 px viewport; 13 sections; 51 buttons). The capture ritual (photo, three prompts, people, details, mood) ends ~2 screens in at "Today is kept"; below it stack Pick-me-up, Gratitude Guide, Memory Lane, and Today's prompts. `[judgment]` This is the "homework" feeling `docs/PROJECT_CONTEXT.md:31` warns about — the rich features are good, their *placement before the fold of completion* is the problem. On desktop the second column absorbs them well (d03 screenshot); mobile just stacks everything. | **High** (fact + [judgment]) |
| U7 | **"Today's prompts" section at the very bottom duplicates the prompt questions the user answered 4 screens earlier** (today-seg5 screenshot) — pure repetition with no action. `[judgment]` Delete on mobile, or fold into Settings. | Medium (fact + [judgment]) |
| U8 | **Text-only memories render an oversized empty photo placeholder** in Memories cards (m10 screenshot: each card is ~70% empty sparkle-placeholder). For a product that insists "text-only entries are valid memories," the archive visually punishes them. `[judgment]` Text-first card layout when no photo exists. | **Medium-High** (fact + [judgment]) |
| U9 | Memories stat pills (Kept / Photo days / Details) stack vertically on mobile, consuming most of the first screen before any actual memory. `[judgment]` One horizontal row. | Medium (fact + [judgment]) |
| U10 | The photo guidance card ("Pick one moment… Add a caption later… Keep it light.") is permanent instructional copy. `[judgment]` Charming on day 1, noise on day 30 — and `PROJECT_CONTEXT.md:61` lists "overexplaining the UI inside the app" under Avoid. Show until first photo is kept, then retire. | Low-Medium ([judgment]) |

### 3.3 Copy & tone

Healthy overall — one sentence: the voice is consistent, gentle, and concrete across every surface I read, onboarding personalization ("Welcome, Demo." → real names) works, and the "Skip tour" escape hatch is always present. No clinical claims, no guilt language found. `[judgment]` This is the product's strongest UX asset; protect it in review.

### 3.4 Flows

| # | Finding | Severity |
|---|---|---|
| U11 | **Completion feedback is excellent**: "Today is kept — 1 reflection, 1 little detail saved. This day already has a place to live." appears mid-page with chips summarizing the day. `[judgment]` This moment is the natural pivot point for the U6 restructure — everything below it belongs *after* it. | Strength + design hook |
| U12 | Save state is communicated by a small pill ("Local only" / "Saved" / "Sync issue") in the sidebar/header; sync errors set descriptive text under it. `[judgment]` On the phone the pill is easy to miss during the stale-conflict case introduced this week — when a save is refused, a toast or inline banner near the edited entry would be more honest than a passive pill. | Medium ([judgment]) |
| U13 | Login page is clean and axe-clean; magic-link copy explains the sent state. Calendar/Insights are appropriately simple; Insights' five metric cards avoid pressure framing per the PRD. | Healthy — one sentence |

---

## 4. Strengths (preserve these)

1. The copy voice — warm, specific, never guilt-inducing; the strongest differentiation the product has.
2. Frictionless capture: no save button, autosave with visible state, text-or-photo completion rule honored everywhere.
3. First-entry path checklist + first-memory celebration make day one rewarding (the product's stated wow goal).
4. `aria-pressed` chips, reduced-motion CSS, no horizontal overflow (e2e-enforced), visible input focus rings — the accessibility *foundation* is there; the gaps (U1–U3) are systematic but shallow.
5. Desktop two-column layout already expresses the right hierarchy: capture left, discovery right.

---

## 5. Task Plan

| ID | Status | Title | Acceptance criteria | Effort |
|---|---|---|---|---|
| UX-T1 | todo | Label all form controls | axe reports zero `label`/`select-name` violations on all 8 scanned surfaces; prompt textareas announce their prompt title | S |
| UX-T2 | todo | Fix rose/chip contrast tokens | axe reports zero `color-contrast` violations on Today, Memories, Settings, onboarding; brand still feels warm (visual check) | S–M |
| UX-T3 | todo | Restructure Today: ritual first, discovery after | On phone, "Today is kept" (or the empty-state equivalent) is reachable within ~2 viewports; Pick-me-up/Gratitude Guide/Memory Lane render below the completion block or behind a "More for today" disclosure; duplicate "Today's prompts" snapshot removed from mobile (U7) | M |
| UX-T4 | todo | Text-first memory card | Text-only entries show no empty photo placeholder; card height driven by content; Memories with mixed entries looks intentional (screenshot diff) | S–M |
| UX-T5 | todo | Memories header compression | Stat pills in one row on phone; first memory visible within 1.5 viewports | S |
| UX-T6 | todo | Retire photo guidance after first kept photo | Guidance card hidden once any photo has been kept in the workspace; reappears never; copy unchanged | S |
| UX-T7 | todo | Stale-save visibility | When the server refuses a stale write, the affected entry shows an inline notice (not just the header pill); demo-able in two-tab QA | M |
| UX-T8 | todo | Touch-target pass | No interactive control under 40 px height; photo row buttons ≥44 px | S |
| UX-T9 | todo | Onboarding landmarks | axe `region` clean on onboarding steps | S |

**Quick wins:** UX-T1, UX-T5, UX-T6, UX-T8, UX-T9 — all S, three of them erase entire axe violation classes.

**Suggested order:** UX-T1 + UX-T2 (accessibility debt, before more UI is built on the tokens) → UX-T3 (the structural one — do it after, so the moved sections are already accessible) → UX-T4/T5 (archive surfaces) → rest.

## 6. Open Questions

1. **U6/UX-T3 product call:** should discovery content (Memory Lane, Gratitude Guide, Pick-me-up) live *below the completion moment*, behind a disclosure, or partly migrate to the Memories tab? The desktop right-rail suggests the hierarchy; mobile needs your call on how much survives on Today at all.
2. **Contrast vs. brand (UX-T2):** the rose `#B2455A`-ish on cream is identity; fixing AA means darkening text or deepening chip fills. Worth a quick Figma/visual pass before committing tokens.

## 7. Evidence Appendix

- Walkthrough: `node web/scripts/ux-walkthrough.mjs` against a production build on port 3199 (script committed). 25 screenshots reviewed; axe results captured per surface.
- Today depth measurement: scripted scroll-height probe on iPhone 13 viewport after "Skip tour" → `{"scrollHeight":4331,"viewport":664,"screens":"6.5","sections":13,"buttons":51}`.
- axe-core via `@axe-core/playwright` (added as devDependency); raw violations recorded per surface during the run.
- Code checks: `grep focus:` (rings on inputs across views), `grep prefers-reduced-motion` (`globals.css`), `grep min-h-9` (6 hits), `grep aria-pressed` (5 files), global button styles keep default focus outline (`globals.css:36-50`).
