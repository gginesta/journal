import type { JournalEntry, MemoryMatch, PersonTag } from "../types/journal";
import { addDays, addMonths, addYears, dayDistance, toLocalDate } from "./dates";

export function isEntryComplete(entry: JournalEntry): boolean {
  const hasText = entry.sessions
    .flatMap((session) => session.responses)
    .some((response) => response.text.trim().length > 0);
  return hasText || entry.photos.length > 0;
}

export function entryPeople(entry: JournalEntry, people: PersonTag[]): PersonTag[] {
  const ids = new Set<string>(entry.personTagIds);
  for (const detail of entry.details) {
    for (const personId of detail.personTagIds) {
      ids.add(personId);
    }
  }
  return people.filter((person) => ids.has(person.id));
}

export function firstResponseExcerpt(entry: JournalEntry): string | null {
  return (
    entry.sessions
      .flatMap((session) => session.responses)
      .map((response) => response.text.trim())
      .find(Boolean) ?? null
  );
}

export function streakSummary(entries: JournalEntry[], today = toLocalDate()): {
  current: number;
  longest: number;
  completedDays: number;
} {
  const completeDates = Array.from(
    new Set(entries.filter(isEntryComplete).map((entry) => entry.localDate))
  ).sort();

  let longest = 0;
  let run = 0;
  let previous: string | null = null;

  for (const date of completeDates) {
    if (previous && dayDistance(date, previous) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = date;
  }

  let current = 0;
  let cursor = today;
  const dateSet = new Set(completeDates);
  while (dateSet.has(cursor)) {
    current += 1;
    const date = new Date(`${cursor}T00:00:00`);
    date.setDate(date.getDate() - 1);
    cursor = toLocalDate(date);
  }

  return { current, longest, completedDays: completeDates.length };
}

export function memoryLaneMatches(entries: JournalEntry[], today = toLocalDate()): MemoryMatch[] {
  const completedEntries = entries
    .filter((entry) => entry.localDate !== today && entry.localDate < today && isEntryComplete(entry))
    .sort((left, right) => right.localDate.localeCompare(left.localDate));

  const targets = [
    { label: "1 year ago", date: addYears(today, -1), tolerance: 3 },
    { label: "2 years ago", date: addYears(today, -2), tolerance: 3 },
    { label: "3 years ago", date: addYears(today, -3), tolerance: 3 },
    { label: "6 months ago", date: addMonths(today, -6), tolerance: 7 },
    { label: "3 months ago", date: addMonths(today, -3), tolerance: 5 },
    { label: "1 month ago", date: addMonths(today, -1), tolerance: 3 },
    { label: "2 weeks ago", date: addDays(today, -14), tolerance: 2 },
    { label: "1 week ago", date: addDays(today, -7), tolerance: 2 },
    { label: "3 days ago", date: addDays(today, -3), tolerance: 1 },
    { label: "Yesterday", date: addDays(today, -1), tolerance: 0 }
  ];
  const usedEntryIds = new Set<string>();

  const matches = targets.flatMap((target) => {
    const candidate = completedEntries
      .filter((entry) => !usedEntryIds.has(entry.id))
      .map((entry) => ({ entry, distance: Math.abs(dayDistance(entry.localDate, target.date)) }))
      .filter(({ distance }) => distance <= target.tolerance)
      .sort((lhs, rhs) => lhs.distance - rhs.distance || rhs.entry.localDate.localeCompare(lhs.entry.localDate))[0];

    if (!candidate) return [];
    usedEntryIds.add(candidate.entry.id);

    return {
      id: `${target.label}-${candidate.entry.id}`,
      label: target.label,
      targetDate: target.date,
      entryId: candidate.entry.id,
      entryDate: candidate.entry.localDate,
      dayDistance: candidate.distance
    };
  });

  if (matches.length > 0) return matches.slice(0, 4);

  const recent = completedEntries[0];
  if (!recent) return [];

  return [{
    id: `Recent good thing-${recent.id}`,
    label: "Recent good thing",
    targetDate: recent.localDate,
    entryId: recent.id,
    entryDate: recent.localDate,
    dayDistance: Math.abs(dayDistance(recent.localDate, today))
  }];
}

export function searchEntries(entries: JournalEntry[], people: PersonTag[], query: string): JournalEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const taggedPeople = entryPeople(entry, people).map((person) => person.name);
    const fields = [
      entry.localDate,
      entry.mood,
      ...taggedPeople,
      ...entry.details.map((detail) => detail.text),
      ...entry.sessions.flatMap((session) =>
        session.responses.flatMap((response) => [
          response.promptTitle,
          response.promptText,
          response.text
        ])
      )
    ];
    return fields.some((field) => field.toLowerCase().includes(normalized));
  });
}
