# Photo Gratitude Journal — Design Handover

Redesign deliverables for the web app (mobile-first) and the upcoming SwiftUI iOS app.
Grounded in `gginesta/journal@main` (tailwind.config.ts, globals.css, Theme.swift, TodayView/MemoriesView/SettingsView, SPEC-7 experience-mode map).

## What's in this package

| File | What it is |
| --- | --- |
| `Design Direction.dc.html` | The master doc: critique + POV, all mockups embedded, tokens (visual + code), micro-interaction specs. Open this first. |
| `today-simple.dc.html` | Today, Simple mode (3 tabs). The chosen "Warm Album" direction. |
| `today-full.dc.html` | Today, Full mode (Today/Memories/Calendar/Insights/More). Mood, people tags, Little Details as quiet optional rows. |
| `completion-moment.dc.html` | LIVE demo — tap "Keep today" for the quiet-exhale save. "Replay the moment" resets it. |
| `memory-lane-reveal.dc.html` | LIVE demo — tap the blurred card to unwrap the look-back. |
| `memories.dc.html` | Memories: month sections, search, filters, paper note cards for text-only days, Little Details repository. |
| `settings-mode.dc.html` | The Simple/Full toggle framed as "two sizes of the same journal". |
| `insights-story.dc.html` | Insights as story: days kept (non-punitive), monthly letter, year-in-photos mosaic, gentle patterns. |
| `onboarding.dc.html` | All 4 first-run steps (welcome → people → rhythm → mode), under a minute. |
| `empty-day-one.dc.html` | Day-1 empty states: Today before anything, Memories before history. |
| `candidates/` | The three direction explorations (A Warm Album — chosen, B Evening Dusk, C Paper Quiet). |
| `assets/` | Placeholder "photos" (generated warm gradients). Replace with real user photos; never ship stock imagery. |
| `ios-frame.jsx`, `support.js` | Runtime for the mockup files. Keep next to the .dc.html files. |

Open any `.dc.html` directly in a browser (keep the folder structure intact).

## Design decisions (locked with the product owner)

- Direction: **Warm Album** — evolve the current warm palette; cards on the soft gradient; keepsake-card photo hero.
- Typography: **system sans** (SF on iOS, `-apple-system` stack on web). No new fonts.
- Three nice things: **numbered list, add-as-you-go** (one row visible, "Add another, if it fits").
- Completion: **quiet exhale**, wording **"Saved to your story"**. No stats grid, no confetti. Plays once per day.
- Streak: **"12 days kept"** — warm-gray, secondary, never rose, never scolds. Missed days subtract nothing.
- Memory Lane: **blurred photo that clears on tap** — fixed signature slot after completion; unwraps once per day.
- Memories: **month sections**; text-only days get the **paper note card**; Little Details = clean list + category chips.
- Mode: new users **choose Simple/Full at onboarding step 4** (Simple pre-selected). Toggle in Settings, framed as two sizes of one journal; nothing is deleted on switch (SPEC-7 semantics unchanged).
- Full-mode nav: **4 tabs + More** (Settings and Gratitude Guide live under More).
- Mood: **simple faces** with text labels (no color-only meaning).
- Dark mode: **warm charcoal** tokens only (no dark mockups this round).

## Tokens

### Color — light
rose `#ad3145` · rose-pressed `#96293c` · leaf `#367a63` · leaf-deep `#2a5f4d` · dawn `#f5a37a`
ink `#212128` · soft-ink `#47454a` · warm-gray `#786e63`
bg `#faf5ed` · surface `#fffdf8` · raised `#fbf2e8` · line `rgba(33,33,40,0.08)`

### Color — dark (warm charcoal; photos stay untinted)
rose `#e0798c` · rose-pressed `#eb92a2` · leaf `#7dbb9e` · dawn `#f5a37a`
ink `#f3ede4` · soft-ink `#d6cec2` · warm-gray `#a89c8d`
bg `#211d1a` · surface `#2a2521` · raised `#342e28` · line `rgba(243,237,228,0.10)`
Optional bg glow: dawn radial @14% at top of screen.
All accent-on-surface pairs hold WCAG AA (4.5:1) in both schemes.

### Type (system sans; rides Dynamic Type on iOS)
Screen title 28/31 bold −0.01em · Section title 22/25 bold · Headline 17/22 semibold
Body 15/22 · Footnote 13/19 · Eyebrow 11 caps, 0.12em tracking, weight 700
Slide nothing below 11px; inputs ≥15px (prevents iOS zoom-on-focus at 16px CSS — use 16px for real inputs on web).

### Space · radius · elevation
Spacing: 4 8 12 16 20 24 32; screen gutter 18.
Radius: control 14 · inner card 16 · journal card 22 · hero/photo 28 · chips pill. iOS: `.continuous` corners.
Shadows (always warm brown, never black):
- card `0 8px 26px rgba(66,48,35,0.07)`
- journal/hero `0 20px 54px rgba(66,48,35,0.14)`
- photo `0 18px 38px rgba(66,48,35,0.22)`

Tailwind config and SwiftUI `Theme.swift` equivalents are printed verbatim in section 5 of `Design Direction.dc.html`.

## Micro-interactions (full specs in the doc, live demos in the files)

- **Completion "quiet exhale"**: button fades/rises (250ms) → card exhales to 98.5% (450ms) → saved band + check circle rise in with soft overshoot (150–700ms) → check draws (400–900ms) → one leaf glow breath (~1.6s). One soft `.success` haptic. Once per day.
- **Photo add "develops"**: instant blurred low-res thumb (never a bare spinner) → leaf progress hairline → blur 8→0 / scale 96→100% over 500ms on ready. Failure keeps the thumb + retry row. 0/1/2 photos are all steady states.
- **Days kept**: number cross-fades n→n+1 with 4px rise on first save of the day; after a missed day the pill just shows the new count — no gray-out, no broken chain, no loss copy, ever.
- **Memory Lane unwrap**: blur 16→0 + scale 1.1→1 over 800ms; hint pill fades 350ms; caption/date rise 350–950ms. One reveal per card per day.
- **Reduced motion**: every sequence collapses to an instant cross-fade. (Already honored by the live demos via `prefers-reduced-motion`.)
- Easing voice: slow-out `cubic-bezier(.3,0,.2,1)`; only the check circle overshoots `(.34,1.4,.5,1)`; 200–900ms; nothing loops.

## Accessibility (non-negotiable, matches current bar)

WCAG AA contrast everywhere · 44px minimum targets · visible focus states · no color-only meaning
(mood faces have labels, completion has text, streak never encodes state in color) · Dynamic Type on iOS · zero axe violations must be preserved.

## Implementation notes

- Simple mode = the SPEC-7 `simpleFeatures` set exactly; these designs change surface presentation only, never the capability map, data, or sync.
- Copy voice: keep the existing tone ("This day already has a place to live"). New strings introduced here: "Saved to your story", "Add another, if it fits", "days kept", "Tap to look back", "Tonight becomes tomorrow's look-back", "How much journal do you want?".
- Screen map to repo: Today → `TodayView.tsx`/`PhotoHero.tsx`; Memories → `MemoriesView.tsx`; mode → `experience-mode.ts` + `SettingsView.tsx`; tokens → `tailwind.config.ts`, `globals.css`, `Theme.swift`.
- The `assets/` gradients are stand-ins for user photos only — the product ships no stock imagery.
