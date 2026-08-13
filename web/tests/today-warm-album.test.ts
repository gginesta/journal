import { describe, expect, it } from "vitest";
import type { JournalEntry } from "../src/types/journal";
import {
  countNiceThings,
  laneRevealStorageKey,
  memoryLaneDisplayLabel,
  quietExhaleStorageKey,
  savedSummary,
  visibleNiceThingRowCount
} from "../src/components/journal/today-logic";

function entryWith({
  photos = 0,
  responseTexts = [],
  detailTexts = []
}: {
  photos?: number;
  responseTexts?: string[];
  detailTexts?: string[];
}): JournalEntry {
  return {
    id: "entry-1",
    workspaceId: "w1",
    localDate: "2026-08-13",
    mood: "good",
    note: "",
    createdAt: "2026-08-13T00:00:00.000Z",
    updatedAt: "2026-08-13T00:00:00.000Z",
    personTagIds: [],
    photos: Array.from({ length: photos }, (_, index) => ({
      id: `photo-${index}`,
      entryId: "entry-1",
      storagePath: "",
      thumbnailPath: "",
      previewUrl: "data:image/png;base64,",
      caption: "",
      sortOrder: index,
      createdAt: "2026-08-13T00:00:00.000Z"
    })),
    sessions: [
      {
        id: "session-1",
        kind: "evening",
        responses: responseTexts.map((text, index) => ({
          id: `response-${index}`,
          promptId: "prompt",
          promptTitle: "Nice things",
          promptText: "What went well?",
          promptOrder: index,
          text
        }))
      }
    ],
    details: detailTexts.map((text, index) => ({
      id: `detail-${index}`,
      entryId: "entry-1",
      text,
      category: "note",
      sortOrder: index,
      personTagIds: []
    }))
  };
}

describe("quiet exhale once-per-day flags", () => {
  it("keys the completion moment by workspace and day", () => {
    expect(quietExhaleStorageKey("w1", "2026-08-13")).toBe("photo-gratitude-journal:quiet-exhale:w1:2026-08-13");
    expect(quietExhaleStorageKey("w1", "2026-08-14")).not.toBe(quietExhaleStorageKey("w1", "2026-08-13"));
    expect(quietExhaleStorageKey("w2", "2026-08-13")).not.toBe(quietExhaleStorageKey("w1", "2026-08-13"));
  });

  it("keys the Memory Lane reveal per card per day", () => {
    expect(laneRevealStorageKey("2026-08-13", "entry-9")).toBe("photo-gratitude-journal:memory-lane-reveal:2026-08-13:entry-9");
    expect(laneRevealStorageKey("2026-08-14", "entry-9")).not.toBe(laneRevealStorageKey("2026-08-13", "entry-9"));
    expect(laneRevealStorageKey("2026-08-13", "entry-8")).not.toBe(laneRevealStorageKey("2026-08-13", "entry-9"));
  });
});

describe("memoryLaneDisplayLabel", () => {
  it("spells out exact anniversary hits like the mockups", () => {
    expect(memoryLaneDisplayLabel({ label: "1 year ago", dayDistance: 0, entryDate: "2025-08-13" })).toBe("One year ago today");
    expect(memoryLaneDisplayLabel({ label: "1 week ago", dayDistance: 0, entryDate: "2026-08-06" })).toBe("One week ago");
    expect(memoryLaneDisplayLabel({ label: "1 month ago", dayDistance: 0, entryDate: "2026-07-13" })).toBe("One month ago");
  });

  it("labels near-date year matches as around this day in that year", () => {
    expect(memoryLaneDisplayLabel({ label: "1 year ago", dayDistance: 2, entryDate: "2025-08-11" })).toBe("Around this day in 2025");
    expect(memoryLaneDisplayLabel({ label: "2 years ago", dayDistance: 3, entryDate: "2024-08-16" })).toBe("Around this day in 2024");
  });

  it("labels other near matches with a gentle Around", () => {
    expect(memoryLaneDisplayLabel({ label: "1 month ago", dayDistance: 2, entryDate: "2026-07-11" })).toBe("Around one month ago");
    expect(memoryLaneDisplayLabel({ label: "2 weeks ago", dayDistance: 1, entryDate: "2026-07-31" })).toBe("Around two weeks ago");
  });

  it("passes fixed labels through untouched", () => {
    expect(memoryLaneDisplayLabel({ label: "Yesterday", dayDistance: 0, entryDate: "2026-08-12" })).toBe("Yesterday");
    expect(memoryLaneDisplayLabel({ label: "Recent good thing", dayDistance: 5, entryDate: "2026-08-08" })).toBe("Recent good thing");
  });
});

describe("savedSummary", () => {
  it("counts newline-separated nice things from the numbered list", () => {
    const entry = entryWith({ photos: 1, responseTexts: ["Pancakes went well\nG. laughed for a minute"] });
    expect(countNiceThings(entry)).toBe(2);
    expect(savedSummary(entry)).toBe("1 photo · 2 nice things kept");
  });

  it("includes little details and pluralizes each piece", () => {
    const entry = entryWith({ photos: 2, responseTexts: ["One line"], detailTexts: ["pasketti, still"] });
    expect(savedSummary(entry)).toBe("2 photos · 1 nice thing · 1 little detail kept");
  });

  it("ignores blank lines and blank details", () => {
    const entry = entryWith({ photos: 0, responseTexts: ["Only this\n\n  "], detailTexts: ["  "] });
    expect(savedSummary(entry)).toBe("1 nice thing kept");
  });

  it("falls back to a quiet phrase when nothing is countable", () => {
    expect(savedSummary(entryWith({}))).toBe("A good thing kept");
  });
});

describe("visibleNiceThingRowCount (add-as-you-go)", () => {
  it("starts with one row on an empty day", () => {
    expect(visibleNiceThingRowCount([], 1)).toBe(1);
  });

  it("always shows every existing line", () => {
    expect(visibleNiceThingRowCount(["a", "b"], 1)).toBe(2);
  });

  it("reveals rows added by the user and caps at three", () => {
    expect(visibleNiceThingRowCount(["a"], 2)).toBe(2);
    expect(visibleNiceThingRowCount(["a", "b", "c"], 9)).toBe(3);
    expect(visibleNiceThingRowCount([], 5)).toBe(3);
  });
});
