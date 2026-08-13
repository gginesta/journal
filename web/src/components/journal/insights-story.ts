// Presentation-only selectors for the Warm Album Insights screen
// (docs/DESIGN_HANDOFF.md, insights-story mockup). Everything here composes
// copy and layout data from entries the view already receives — no new
// aggregation endpoints, no side effects, and never any loss framing:
// missed days subtract nothing, the archive only grows.

import type { JournalEntry, Mood } from "@/types/journal";
import { addMonths, formatDisplayDate, toLocalDate } from "@/lib/dates";
import { isEntryComplete, streakSummary } from "@/lib/journal-logic";
import { moodOptions } from "@/components/journal/helpers";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function monthName(localDate: string): string {
  return MONTH_NAMES[Number(localDate.slice(5, 7)) - 1] ?? "";
}

export type DaysKeptStory = {
  count: number;
  countLabel: string;
  note: string;
};

// "Days kept" — warm, secondary, never a broken chain. When there is no
// active run we shift to the archive total instead of showing a loss state.
export function daysKeptStory(entries: JournalEntry[], today = toLocalDate()): DaysKeptStory {
  const summary = streakSummary(entries, today);
  const reassurance = "Missed days never subtract anything — the archive only grows.";
  const record =
    summary.longest > summary.current && summary.longest > 1 ? `Your quietest record is ${summary.longest}. ` : "";

  if (summary.current > 0) {
    return {
      count: summary.current,
      countLabel: summary.current === 1 ? "day kept in a row" : "days kept in a row",
      note: `${record}${reassurance}`
    };
  }

  return {
    count: summary.completedDays,
    countLabel: summary.completedDays === 1 ? "day kept altogether" : "days kept altogether",
    note: `${record}${reassurance}`
  };
}

export type MonthLetter = {
  eyebrow: string;
  body: string;
};

// The monthly letter, composed from what actually exists on the entries
// (kept days, photos, little details, moods). A generated prose letter is a
// later feature; this is the nearest real data, phrased like a note.
export function monthLetter(entries: JournalEntry[], today = toLocalDate()): MonthLetter {
  const month = monthName(today);
  const eyebrow = `${month}, in short`;
  const monthKey = today.slice(0, 7);
  const monthEntries = entries.filter((entry) => entry.localDate.slice(0, 7) === monthKey && entry.localDate <= today);
  const completeEntries = monthEntries.filter(isEntryComplete);
  const keptDays = new Set(completeEntries.map((entry) => entry.localDate)).size;

  if (keptDays === 0) {
    return {
      eyebrow,
      body: `${month} is still finding its shape. This letter writes itself as days are kept — there is nothing to catch up on.`
    };
  }

  const daysSoFar = Number(today.slice(8, 10));
  const photoCount = monthEntries.reduce((sum, entry) => sum + entry.photos.length, 0);
  const detailCount = monthEntries.reduce((sum, entry) => sum + entry.details.length, 0);

  const sentences = [`You kept ${keptDays} of ${daysSoFar} ${daysSoFar === 1 ? "day" : "days"} so far.`];
  if (photoCount > 0) {
    sentences.push(photoCount === 1 ? "One photo joined the album." : `${photoCount} photos joined the album.`);
  }
  if (detailCount > 0) {
    sentences.push(detailCount === 1 ? "One little detail seemed worth keeping." : `${detailCount} little details seemed worth keeping.`);
  }
  const mood = topMood(completeEntries);
  if (mood) {
    sentences.push(`Most days felt ${mood.toLowerCase()}.`);
  }

  return { eyebrow, body: sentences.join(" ") };
}

function topMood(entries: JournalEntry[]): string | null {
  if (entries.length === 0) return null;
  let best: { title: string; count: number } | null = null;
  for (const option of moodOptions) {
    const count = entries.filter((entry) => entry.mood === option.id).length;
    if (count > 0 && (!best || count > best.count)) {
      best = { title: option.title, count };
    }
  }
  return best?.title ?? null;
}

export type MosaicTile = {
  id: string;
  src?: string;
  alt: string;
};

export type PhotoMosaic = {
  // "137 since March" — null until the first photo exists.
  countLabel: string | null;
  tiles: MosaicTile[];
  // Dashed squares after the photos: days still to come, never days missed.
  placeholders: number;
};

const MOSAIC_MAX_TILES = 16;
const MOSAIC_COLUMNS = 6;

// The rolling-year photo mosaic. Chronological (the mosaic fills as the year
// does), capped to the most recent tiles, padded with at least one empty
// square to the end of the grid row.
export function yearInPhotos(entries: JournalEntry[], today = toLocalDate()): PhotoMosaic {
  const windowStart = addMonths(today, -12);
  const photoEntries = entries
    .filter((entry) => entry.localDate >= windowStart && entry.localDate <= today && entry.photos.length > 0)
    .sort((left, right) => left.localDate.localeCompare(right.localDate));

  const allTiles = photoEntries.flatMap((entry) =>
    [...entry.photos]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((photo) => ({
        id: photo.id,
        src: photo.thumbnailUrl || photo.previewUrl || undefined,
        alt: photo.caption.trim() || `Photo from ${formatDisplayDate(entry.localDate, "short")}`
      }))
  );

  const tiles = allTiles.slice(-MOSAIC_MAX_TILES);
  const cells = Math.ceil((tiles.length + 1) / MOSAIC_COLUMNS) * MOSAIC_COLUMNS;

  return {
    countLabel: allTiles.length > 0 ? `${allTiles.length} since ${monthName(photoEntries[0].localDate)}` : null,
    tiles,
    placeholders: cells - tiles.length
  };
}

export type GentlePattern = {
  id: Mood;
  label: string;
  count: number;
  countLabel: string;
  // Bar length relative to the most frequent pattern (0..1).
  share: number;
};

// "What keeps showing up" — mood rhythms across kept days. Text labels carry
// the meaning; bar colors are decorative only.
export function gentlePatterns(entries: JournalEntry[]): GentlePattern[] {
  const completeEntries = entries.filter(isEntryComplete);
  const rows = moodOptions
    .map((option) => ({
      id: option.id,
      label: option.title,
      count: completeEntries.filter((entry) => entry.mood === option.id).length
    }))
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const max = rows[0]?.count ?? 0;
  return rows.map((row) => ({
    ...row,
    countLabel: row.count === 1 ? "1 day" : `${row.count} days`,
    share: max > 0 ? row.count / max : 0
  }));
}
