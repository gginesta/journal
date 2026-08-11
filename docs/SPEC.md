# Product Logic Spec (anti-drift rules)

Numbered, pinned definitions of product logic that both platforms (web `web/src/lib/`, iOS `PhotoGratitudeJournal/Services/`) must implement identically. Each rule has machine-readable fixtures under `spec/fixtures/` and mirrored conformance tests (`web/tests/spec-conformance.test.ts`; iOS `SpecConformanceTests.swift` lands with the iOS parity wave). A change to any SPEC-numbered rule must update this document, the fixture, and both platforms' tests in the same PR.

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

To be pinned in a later wave (web's 10-target ladder with per-target tolerances, completeness filter, dedupe, cap of 4, recent-good-thing fallback).

## SPEC-4 — Detail categories

To be pinned in a later wave (the 6-value Little Details category union and its default).

## SPEC-5 — Wire formats

To be pinned in a later wave (mood strings, snake_case cadence values, export field names).

## SPEC-6 — Seeding policy

To be pinned in a later wave (default prompts are seeded; generic person tags are not).

## SPEC-7 — Experience-mode capability matrix

To be pinned in a later wave (the Simple/Full feature visibility table from the improvement plan §5.1).
