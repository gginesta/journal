# v0.3 Design System Goal

## Objective

Complete the v0.3 design system and core UX redesign for Photo Gratitude Journal so the app feels like a polished, photo-first daily ritual rather than a functional scaffold.

## Source Of Truth

- `docs/PRD.md`
- `docs/DESIGN.md`
- `docs/ROADMAP.md`

## Branch

- Work branch: `codex/v0.3-design-system`
- Base branch: `main`

## Sub-Agent Ownership

### Design System Agent

Owns reusable visual language and shared SwiftUI components.

Expected outputs:

- Warm theme tokens.
- Shared layout primitives.
- Photo-first reusable components.
- Streak, completion, empty-state, and memory-card primitives.
- Preview/demo fixtures when useful.

### Today Ritual Agent

Owns the Today journaling experience.

Expected outputs:

- Photo-first Today layout.
- Friendly list-style "three nice things" input.
- Secondary prompts with lower visual priority.
- Mood selector that does not compete with the main ritual.
- Gentle saved/completion language.
- Memory Lane positioned as a signature moment.

### Memories And Calendar Agent

Owns past-entry browsing.

Expected outputs:

- Timeline reframed as Memories.
- Photo-first Memories feed or grid.
- Improved Calendar visual density and indicators.
- Entry detail that feels like a memory page.

## Validation Loop

Because this Windows workspace cannot run Xcode or iOS Simulator, validation is split:

- Local validation:
  - XML plist/scheme checks.
  - Git status and diff review.
  - Static search for merge conflict markers and non-ASCII accidents.
  - Xcode project reference sweep when files are added.
- Remote validation:
  - GitHub Actions macOS CI.
  - `xcodebuild test` on iOS Simulator.

## Stopping Condition

Stop when:

- The branch contains the v0.3 design pass implementation.
- The branch includes updated docs and changelog.
- The branch is committed and pushed.
- CI has either passed or failed with a documented Xcode/macOS-specific reason.
- Remaining product/design decisions are explicitly listed.
