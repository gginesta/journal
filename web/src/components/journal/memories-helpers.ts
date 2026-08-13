// Presentation helpers for the Warm Album Memories screen: month sections and
// the short "Tue, Aug 12" day labels the memory cards use. Pure functions so
// the grouping rules stay unit-testable without rendering.

import type { JournalEntry } from "@/types/journal";
import { parseLocalDate, toLocalDate } from "@/lib/dates";

export type MemoryMonthGroup = {
  /** "YYYY-MM" — stable React key and sort key. */
  key: string;
  /** Visible heading: "August", or "August 2025" once the year differs. */
  title: string;
  /** Always month + year, so screen readers never lose the year. */
  ariaLabel: string;
  /** Distinct kept days in the month (entries are one-per-day, but stay safe). */
  dayCount: number;
  entries: JournalEntry[];
};

export function formatMemoryDayLabel(localDate: string): string {
  return parseLocalDate(localDate).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function groupEntriesByMonth(entries: JournalEntry[], today: string = toLocalDate()): MemoryMonthGroup[] {
  const currentYear = today.slice(0, 4);
  const byMonth = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const key = entry.localDate.slice(0, 7);
    const group = byMonth.get(key);
    if (group) group.push(entry);
    else byMonth.set(key, [entry]);
  }

  return [...byMonth.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, groupEntries]) => {
      const sorted = [...groupEntries].sort((left, right) => right.localDate.localeCompare(left.localDate));
      const monthName = parseLocalDate(`${key}-01`).toLocaleDateString(undefined, { month: "long" });
      const year = key.slice(0, 4);
      return {
        key,
        title: year === currentYear ? monthName : `${monthName} ${year}`,
        ariaLabel: `${monthName} ${year}`,
        dayCount: new Set(sorted.map((entry) => entry.localDate)).size,
        entries: sorted
      };
    });
}
