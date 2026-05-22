import type { JournalEntry, MemoryMatch, PersonTag } from "../types/journal";
import { addMonths, addYears, dayDistance, toLocalDate } from "./dates";

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
  const targets = [
    { label: "1 month ago", date: addMonths(today, -1) },
    { label: "1 year ago", date: addYears(today, -1) },
    { label: "2 years ago", date: addYears(today, -2) },
    { label: "3 years ago", date: addYears(today, -3) }
  ];

  return targets.flatMap((target) => {
    const candidate = entries
      .map((entry) => ({ entry, distance: Math.abs(dayDistance(entry.localDate, target.date)) }))
      .filter(({ distance }) => distance <= 3)
      .sort((lhs, rhs) => lhs.distance - rhs.distance || rhs.entry.localDate.localeCompare(lhs.entry.localDate))[0];

    if (!candidate) return [];

    return {
      id: `${target.label}-${candidate.entry.id}`,
      label: target.label,
      targetDate: target.date,
      entryId: candidate.entry.id,
      entryDate: candidate.entry.localDate,
      dayDistance: candidate.distance
    };
  });
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
