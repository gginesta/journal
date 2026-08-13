// Warm Album Today screen: pure presentation logic (no JSX, no I/O) so the
// once-per-day flags, Memory Lane labels, and completion summary stay
// unit-testable in node. See docs/DESIGN_HANDOFF.md for the locked decisions.

import type { JournalEntry, MemoryMatch } from "@/types/journal";

// The quiet-exhale completion moment plays once per day per workspace; the
// flag mirrors the first-memory celebration's localStorage pattern so editing
// after completion never re-plays the ceremony.
export function quietExhaleStorageKey(workspaceId: string, localDate: string): string {
  return `photo-gratitude-journal:quiet-exhale:${workspaceId}:${localDate}`;
}

// One Memory Lane unwrap per card per day: keyed by the day it is shown on and
// the entry it shows, so tomorrow the same memory wraps itself again.
export function laneRevealStorageKey(shownOnDate: string, entryId: string): string {
  return `photo-gratitude-journal:memory-lane-reveal:${shownOnDate}:${entryId}`;
}

const spelledLaneLabels: Record<string, string> = {
  "1 year ago": "One year ago",
  "2 years ago": "Two years ago",
  "3 years ago": "Three years ago",
  "6 months ago": "Six months ago",
  "3 months ago": "Three months ago",
  "1 month ago": "One month ago",
  "2 weeks ago": "Two weeks ago",
  "1 week ago": "One week ago",
  "3 days ago": "Three days ago"
};

// Eyebrow copy for the Memory Lane slot. Exact anniversary hits read like the
// mockups ("One year ago today"); near-date matches are honest about the
// wobble ("Around this day in 2025", "Around one month ago").
export function memoryLaneDisplayLabel(
  match: Pick<MemoryMatch, "label" | "dayDistance" | "entryDate">
): string {
  if (match.label === "Yesterday" || match.label === "Recent good thing") return match.label;
  const spelled = spelledLaneLabels[match.label] ?? match.label;
  const isYearLabel = /years? ago$/.test(match.label);
  if (match.dayDistance === 0) return isYearLabel ? `${spelled} today` : spelled;
  if (isYearLabel) return `Around this day in ${match.entryDate.slice(0, 4)}`;
  return `Around ${spelled.charAt(0).toLowerCase()}${spelled.slice(1)}`;
}

// Counts a session response as several nice things when it holds newline
// separated lines — that is how the numbered list stores them.
export function countNiceThings(entry: JournalEntry): number {
  return entry.sessions
    .flatMap((session) => session.responses)
    .flatMap((response) => response.text.split("\n"))
    .filter((line) => line.trim().length > 0).length;
}

// "1 photo · 2 nice things kept" — the saved band's quiet inventory. Never a
// stats grid; just what was kept, in words.
export function savedSummary(entry: JournalEntry): string {
  const photoCount = entry.photos.length;
  const niceCount = countNiceThings(entry);
  const detailCount = entry.details.filter((detail) => detail.text.trim()).length;
  const pieces = [
    photoCount ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : null,
    niceCount ? `${niceCount} nice thing${niceCount === 1 ? "" : "s"}` : null,
    detailCount ? `${detailCount} little detail${detailCount === 1 ? "" : "s"}` : null
  ].filter(Boolean);
  if (pieces.length === 0) return "A good thing kept";
  return `${pieces.join(" · ")} kept`;
}

// Add-as-you-go numbered list: one row visible initially, existing lines
// always visible, "Add another, if it fits" reveals the next of three.
export function visibleNiceThingRowCount(lines: string[], revealedRows: number): number {
  return Math.min(3, Math.max(1, lines.length, revealedRows));
}
