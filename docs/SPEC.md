# Product Logic Spec (anti-drift rules)

Numbered, pinned definitions of product logic that both platforms (web `web/src/lib/`, iOS `PhotoGratitudeJournal/Services/`) must implement identically. Each rule has machine-readable fixtures under `spec/fixtures/` and mirrored conformance tests (`web/tests/spec-conformance*.test.ts`; iOS `PhotoGratitudeJournalTests/SpecConformanceTests.swift`). A change to any SPEC-numbered rule must update this document, the fixture, and both platforms' tests in the same PR.

## SPEC-1 — Entry completion

An entry counts as **complete** when it has at least one non-blank prompt response (whitespace-only text does not count) **or** at least one photo. Little Details, mood, people tags, and the note field do **not** affect completion — completion measures the ritual (writing or a photo), not metadata.

**Worked example.** An entry with one photo and no text is complete. An entry whose only response is `"   "` and whose Little Details list contains "Still says lellow" is **not** complete: the response is blank and details never count.

Fixtures: `spec/fixtures/completion.json` · Web: `isEntryComplete` in `web/src/lib/journal-logic.ts` · iOS: `JournalEntry.isComplete`.

## SPEC-2 — Streaks

Given the set of distinct complete days (per SPEC-1):

- **current** — the number of consecutive complete days ending at the walk start. The walk starts at *today* when today is complete. **Grace rule:** when today is *not* complete but *yesterday* is, the walk starts at yesterday — an unfinished today never breaks the streak until the day actually ends. When neither today nor yesterday is complete, current is 0.
- **longest** — the length of the longest run of consecutive complete days anywhere in history.
- **completedDays** — the count of distinct complete days.

**Worked example.** Complete days = {May 18, 19, 20}, today = May 21 with nothing entered yet: current = **3** (grace rule; not 0), longest = 3, completedDays = 3. If May 21 is then completed, current becomes 4. If today were May 22 (so both the 22nd and 21st are incomplete), current = 0 while longest stays 3.

Fixtures: `spec/fixtures/streak.json` · Web: `streakSummary` in `web/src/lib/journal-logic.ts` · iOS: `StreakCalculator.summary`.

## SPEC-3 — Memory Lane ladder

Memory Lane surfaces up to **4** look-back matches against a fixed 10-target ladder. Eligibility: only entries whose day is **strictly before today** and which are **complete** (SPEC-1). Targets are evaluated in ladder order; for each target the candidate set is every eligible entry not already matched to an earlier target, whose absolute day distance from the target date is within that target's tolerance. The closest candidate wins; a distance tie prefers the **more recent** entry date. An entry can serve **at most one** target. The final list keeps ladder order and is capped at 4.

| # | Label | Target date | Tolerance (days) |
|---|---|---|---|
| 1 | `1 year ago` | today − 1 year | 3 |
| 2 | `2 years ago` | today − 2 years | 3 |
| 3 | `3 years ago` | today − 3 years | 3 |
| 4 | `6 months ago` | today − 6 months | 7 |
| 5 | `3 months ago` | today − 3 months | 5 |
| 6 | `1 month ago` | today − 1 month | 3 |
| 7 | `2 weeks ago` | today − 14 days | 2 |
| 8 | `1 week ago` | today − 7 days | 2 |
| 9 | `3 days ago` | today − 3 days | 1 |
| 10 | `Yesterday` | today − 1 day | 0 |

**Fallback.** When no target matches but at least one eligible entry exists, return exactly one match labeled `Recent good thing` for the **most recent** eligible entry (day distance = distance from today). When there are no eligible entries at all, return an empty list.

**Worked example.** Today = 2026-08-11 with complete entries exactly 1 month, 2 weeks, 1 week, and 3 days back plus yesterday: five targets match, the cap keeps the first four in ladder order (`1 month ago`, `2 weeks ago`, `1 week ago`, `3 days ago`) and yesterday is dropped. A lone complete entry 4 days off the 1-year anniversary matches nothing and comes back as `Recent good thing`.

**Platform note.** Month/year subtraction uses each platform's calendar arithmetic (JS `setMonth`/`setFullYear` vs Foundation `Calendar.date(byAdding:)`), which can disagree on month-end rollover (e.g. Mar 30 − 1 month). Fixtures deliberately avoid those edge dates; do not add fixture cases whose targets land on a day that does not exist in the target month.

Fixtures: `spec/fixtures/memory-lane.json` · Web: `memoryLaneMatches` in `web/src/lib/journal-logic.ts` · iOS: `MemoryLane.matches`.

## SPEC-4 — Detail categories

To be pinned in a later wave (the 6-value Little Details category union and its default).

## SPEC-5 — Wire formats

Canonical string values shared by both platforms wherever data leaves the UI layer (persistence raw values, export, any future sync). Display labels are free to differ; wire strings are not.

- **Mood** — the canonical Int ↔ string mapping is `1 ↔ low`, `2 ↔ quiet`, `3 ↔ good`, `4 ↔ bright`, `5 ↔ glowing`. Web stores/syncs the strings (`Mood` in `web/src/types/journal.ts`); iOS stores the Int and converts via `Mood.wireName` / `Mood(wireName:)`. Export always uses the string, never the Int and never display titles ("Low", …).
- **Ritual cadence** — snake_case: `evening`, `once_daily`, `morning_evening`, `anytime` (iOS `RitualCadence` raw values; web `RitualCadence` type). **Legacy note:** iOS rows persisted before this rule may carry `onceDaily` / `morningEvening`; reads from storage must map them (`RitualCadence.fromStoredValue`). New writes always use snake_case.
- **Session kind** — `morning`, `evening`, `anytime` (already aligned).
- **Little Detail category** — the 6-value union `phrase`, `favorite`, `routine`, `milestone`, `quote`, `note`; default `note`. Display labels: Phrase, Favorite, Routine, Milestone, Quote, Note (web `memoryDetailCategoryLabels`; iOS `MemoryDetailCategory.title`).
- **iOS export shape** (`ExportService`): a JSON array of entries sorted newest-first, each `{ id, day, mood, isComplete, people, responses, details, photos }` where `mood` is the wire string, `people` is the entry-level person-tag names, `responses` is `{ session, prompt, text }` with `session` the session-kind wire string, `details` is `{ text, category, people }` with `category` the wire string and `people` the detail-level tag names, and `photos` is `{ filename, caption, createdAt }`. Dates are ISO-8601. (Web's export downloads its client `JournalEntry` rows, which already carry the same wire strings.)

Fixtures: covered indirectly by the other SPEC fixtures (they are written in wire strings) · Web: `web/src/types/journal.ts` · iOS: `Models/JournalTypes.swift`, `Services/ExportService.swift`.

## SPEC-6 — Seeding policy

- **Default prompts: seeded.** A fresh store gets the three default prompt templates exactly once (web bootstrap defaults; iOS `PromptSeeder.seedIfNeeded`). Re-running the seeder never duplicates them.
- **Person tags: never seeded.** No generic people ("Me", "Kid 1", "Partner", …) are ever auto-created; person tags exist only when the user adds them. Web removed its generic seeds in 0.2.11 and iOS followed in the parity wave. Empty person-tag state must render gracefully with the inline "add a person" affordance.

Tests: web onboarding/bootstrap suites · iOS `testPromptSeederCreatesDefaultPrompts` and `testNoPersonTagsAreSeededAutomatically` in `JournalLogicTests.swift`.

## SPEC-7 — Experience-mode capability matrix

The Simple/Full toggle changes only which UI surfaces render. It never changes data, the sync protocol, or the entry model: everything created in Full stays stored, still appears read-only where it already renders (entry detail, search), and returns fully editable when the user switches back. Mode is presentation-only.

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

**Defaults.** New users start in **Simple** — it makes the "under a minute" promise structural; onboarding's final step mentions Full. Existing beta users are grandfathered into Full via migration backfill (`202608110002_experience_mode.sql`). Demo mode starts in **Full**: the demo is a showcase and its fixture data already contains people tags and Little Details, so starting Simple would hide the surfaces that explain that data.

**Worked example.** In Simple, the Calendar and Insights tabs do not render and Today hides the mood picker, people tags, and Little Details panel — but a Little Detail saved earlier in Full still appears in the entry detail modal and still matches Memories search. Switching Simple → Full restores every hidden surface with the stored data intact.

Fixtures: `spec/fixtures/experience-mode.json` · Web: `isFeatureVisible`/`visibleTabs` in `web/src/lib/experience-mode.ts` · iOS: `Services/ExperienceMode.swift` (lands with the iOS parity wave).
