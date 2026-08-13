import { describe, expect, it } from "vitest";
import {
  daysKeptStory,
  gentlePatterns,
  monthLetter,
  monthName,
  yearInPhotos
} from "../src/components/journal/insights-story";
import { formatDisplayDate } from "../src/lib/dates";
import type { JournalEntry, Mood, PhotoAttachment } from "../src/types/journal";

const REASSURANCE = "Missed days never subtract anything — the archive only grows.";

function entry(localDate: string, overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `entry-${localDate}`,
    workspaceId: "workspace-1",
    localDate,
    mood: "good" as Mood,
    note: "",
    sessions: [
      {
        id: `session-${localDate}`,
        kind: "evening",
        responses: [
          {
            id: `response-${localDate}`,
            promptId: "prompt-1",
            promptTitle: "What felt good today?",
            promptText: "What felt good today?",
            promptOrder: 0,
            text: "A small good thing"
          }
        ]
      }
    ],
    photos: [],
    personTagIds: [],
    details: [],
    createdAt: `${localDate}T20:00:00.000Z`,
    updatedAt: `${localDate}T20:00:00.000Z`,
    ...overrides
  };
}

function emptyEntry(localDate: string): JournalEntry {
  return entry(localDate, { sessions: [] });
}

function photo(id: string, overrides: Partial<PhotoAttachment> = {}): PhotoAttachment {
  return {
    id,
    entryId: "entry-1",
    storagePath: `photos/${id}.jpg`,
    thumbnailPath: `thumbs/${id}.jpg`,
    previewUrl: `https://photos.test/${id}.jpg`,
    caption: "",
    sortOrder: 0,
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides
  };
}

describe("daysKeptStory", () => {
  it("shows the active run without a record line while the run is the record", () => {
    const story = daysKeptStory([entry("2026-08-10"), entry("2026-08-11"), entry("2026-08-12")], "2026-08-12");
    expect(story.count).toBe(3);
    expect(story.countLabel).toBe("days kept in a row");
    expect(story.note).toBe(REASSURANCE);
  });

  it("mentions the quietest record warmly when a longer past run exists", () => {
    const story = daysKeptStory(
      [entry("2026-08-01"), entry("2026-08-02"), entry("2026-08-03"), entry("2026-08-12")],
      "2026-08-12"
    );
    expect(story.count).toBe(1);
    expect(story.countLabel).toBe("day kept in a row");
    expect(story.note).toBe(`Your quietest record is 3. ${REASSURANCE}`);
  });

  it("falls back to the archive total instead of a loss state when no run is active", () => {
    const story = daysKeptStory([entry("2026-08-01"), entry("2026-08-05")], "2026-08-12");
    expect(story.count).toBe(2);
    expect(story.countLabel).toBe("days kept altogether");
    // A "record" of a single day would read as scolding, so it stays silent.
    expect(story.note).toBe(REASSURANCE);
  });

  it("never scolds even before the first day is kept", () => {
    const story = daysKeptStory([], "2026-08-12");
    expect(story.count).toBe(0);
    expect(story.countLabel).toBe("days kept altogether");
    expect(story.note).toBe(REASSURANCE);
    expect(story.note).not.toMatch(/lost|broke|missed a/i);
  });
});

describe("monthLetter", () => {
  it("composes the letter from kept days, photos, details, and mood", () => {
    const letter = monthLetter(
      [
        entry("2026-08-01", { mood: "quiet" }),
        entry("2026-08-02", {
          mood: "quiet",
          photos: [photo("p1"), photo("p2", { sortOrder: 1 })],
          details: [
            {
              id: "detail-1",
              entryId: "entry-2026-08-02",
              text: "Said 'aminals' again",
              category: "phrase",
              sortOrder: 0,
              personTagIds: []
            }
          ]
        }),
        entry("2026-08-03", { mood: "good" }),
        // Other months and future days stay out of this month's letter.
        entry("2026-07-30", { mood: "low" }),
        entry("2026-08-20", { mood: "low" })
      ],
      "2026-08-13"
    );
    expect(letter.eyebrow).toBe("August, in short");
    expect(letter.body).toBe(
      "You kept 3 of 13 days so far. 2 photos joined the album. One little detail seemed worth keeping. Most days felt quiet."
    );
  });

  it("uses singular phrasing for a single photo", () => {
    const letter = monthLetter([entry("2026-08-01", { photos: [photo("p1")] })], "2026-08-13");
    expect(letter.body).toContain("One photo joined the album.");
  });

  it("stays warm when the month has no kept days yet", () => {
    const letter = monthLetter([emptyEntry("2026-08-02")], "2026-08-13");
    expect(letter.eyebrow).toBe("August, in short");
    expect(letter.body).toBe(
      "August is still finding its shape. This letter writes itself as days are kept — there is nothing to catch up on."
    );
  });

  it("names months without relying on the runtime locale", () => {
    expect(monthName("2026-01-05")).toBe("January");
    expect(monthName("2026-12-31")).toBe("December");
  });
});

describe("yearInPhotos", () => {
  it("shows a fully empty row of placeholders before the first photo", () => {
    const mosaic = yearInPhotos([entry("2026-08-01")], "2026-08-13");
    expect(mosaic.countLabel).toBeNull();
    expect(mosaic.tiles).toEqual([]);
    expect(mosaic.placeholders).toBe(6);
  });

  it("orders tiles chronologically and counts since the first photo month", () => {
    const mosaic = yearInPhotos(
      [
        entry("2026-08-02", { photos: [photo("aug", { caption: "Balcony light" })] }),
        entry("2026-03-10", { photos: [photo("mar")] }),
        entry("2026-05-01", { photos: [photo("may")] })
      ],
      "2026-08-13"
    );
    expect(mosaic.tiles.map((tile) => tile.id)).toEqual(["mar", "may", "aug"]);
    expect(mosaic.countLabel).toBe("3 since March");
    // 3 tiles pad to a single 6-column row with room still to come.
    expect(mosaic.placeholders).toBe(3);
  });

  it("gives every tile a text alternative: the caption, or the entry date", () => {
    const mosaic = yearInPhotos(
      [entry("2026-08-02", { photos: [photo("cap", { caption: "Balcony light" }), photo("nocap", { sortOrder: 1 })] })],
      "2026-08-13"
    );
    expect(mosaic.tiles[0].alt).toBe("Balcony light");
    expect(mosaic.tiles[1].alt).toBe(`Photo from ${formatDisplayDate("2026-08-02", "short")}`);
  });

  it("prefers thumbnails, keeps the rolling year, and caps tiles at 16 most recent", () => {
    const manyEntries = Array.from({ length: 20 }, (_, index) =>
      entry(`2026-06-${`${index + 1}`.padStart(2, "0")}`, {
        photos: [photo(`p${index + 1}`, { thumbnailUrl: `https://photos.test/thumb-p${index + 1}.jpg` })]
      })
    );
    const mosaic = yearInPhotos([...manyEntries, entry("2025-07-01", { photos: [photo("too-old")] })], "2026-08-13");
    expect(mosaic.countLabel).toBe("20 since June");
    expect(mosaic.tiles).toHaveLength(16);
    expect(mosaic.tiles[0].id).toBe("p5");
    expect(mosaic.tiles[0].src).toBe("https://photos.test/thumb-p5.jpg");
    expect(mosaic.tiles.map((tile) => tile.id)).not.toContain("too-old");
    expect(mosaic.placeholders).toBe(2);
  });
});

describe("gentlePatterns", () => {
  it("ranks moods across kept days with plural-aware counts and relative bars", () => {
    const patterns = gentlePatterns([
      entry("2026-08-01", { mood: "quiet" }),
      entry("2026-08-02", { mood: "quiet" }),
      entry("2026-08-03", { mood: "bright" }),
      // Unkept days contribute nothing.
      emptyEntry("2026-08-04")
    ]);
    expect(patterns.map((row) => ({ id: row.id, count: row.count, countLabel: row.countLabel, share: row.share }))).toEqual([
      { id: "quiet", count: 2, countLabel: "2 days", share: 1 },
      { id: "bright", count: 1, countLabel: "1 day", share: 0.5 }
    ]);
    expect(patterns[0].label).toBe("Quiet");
  });

  it("keeps at most four rows and returns none for an empty archive", () => {
    const moods: Mood[] = ["low", "quiet", "good", "bright", "glowing"];
    const busy = moods.flatMap((mood, index) =>
      Array.from({ length: index + 1 }, (_, day) => entry(`2026-0${index + 3}-${`${day + 1}`.padStart(2, "0")}`, { mood }))
    );
    expect(gentlePatterns(busy)).toHaveLength(4);
    expect(gentlePatterns([])).toEqual([]);
  });
});
