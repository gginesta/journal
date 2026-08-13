import { describe, expect, it } from "vitest";
import type { JournalEntry, PersonTag } from "../src/types/journal";
import { calendarDayAction, eagerEntryWindows, isEntryComplete, memoryLaneMatches, searchEntries, streakSummary } from "../src/lib/journal-logic";
import { listMemoryDetails } from "../src/lib/memory-details";
import { addSuggestionToReflectionText, gratitudeGuideForEntry, gratitudePromptPacks } from "../src/lib/prompts";

const people: PersonTag[] = [
  { id: "me", workspaceId: "w1", name: "Me", color: "#000", sortOrder: 0, isDefault: true },
  { id: "kid", workspaceId: "w1", name: "Kid 1", color: "#000", sortOrder: 1, isDefault: true }
];

function entry(id: string, localDate: string, text = "", photo = false): JournalEntry {
  return {
    id,
    workspaceId: "w1",
    localDate,
    mood: "good",
    note: "",
    createdAt: `${localDate}T00:00:00.000Z`,
    updatedAt: `${localDate}T00:00:00.000Z`,
    personTagIds: [],
    photos: photo
      ? [{
          id: `${id}-photo`,
          entryId: id,
          storagePath: "",
          thumbnailPath: "",
          previewUrl: "",
          caption: "",
          sortOrder: 0,
          createdAt: `${localDate}T00:00:00.000Z`
        }]
      : [],
    sessions: [{
      id: `${id}-session`,
      kind: "evening",
      responses: [{
        id: `${id}-response`,
        promptId: "prompt",
        promptTitle: "Nice things",
        promptText: "What went well?",
        promptOrder: 0,
        text
      }]
    }],
    details: []
  };
}

describe("journal logic", () => {
  it("counts text-only and photo-only entries as complete", () => {
    expect(isEntryComplete(entry("text", "2026-05-21", "A kind call"))).toBe(true);
    expect(isEntryComplete(entry("photo", "2026-05-21", "", true))).toBe(true);
    expect(isEntryComplete(entry("empty", "2026-05-21"))).toBe(false);
  });

  it("calculates current and longest streaks", () => {
    const summary = streakSummary([
      entry("a", "2026-05-21", "Good"),
      entry("b", "2026-05-20", "Good"),
      entry("c", "2026-05-19", "Good"),
      entry("d", "2026-05-14", "Good")
    ], "2026-05-21");

    expect(summary).toEqual({ current: 3, longest: 3, completedDays: 4 });
  });

  it("keeps the streak alive while today is still unfinished (SPEC-2 grace rule)", () => {
    const summary = streakSummary([
      entry("a", "2026-05-20", "Good"),
      entry("b", "2026-05-19", "Good"),
      entry("c", "2026-05-18", "Good")
    ], "2026-05-21");

    expect(summary).toEqual({ current: 3, longest: 3, completedDays: 3 });
  });

  it("resets the current streak once both today and yesterday are incomplete", () => {
    const summary = streakSummary([
      entry("a", "2026-05-19", "Good"),
      entry("b", "2026-05-18", "Good")
    ], "2026-05-21");

    expect(summary).toEqual({ current: 0, longest: 2, completedDays: 2 });
  });

  it("counts today plus the grace day when today is complete", () => {
    const summary = streakSummary([
      entry("a", "2026-05-21", "Good"),
      entry("b", "2026-05-20", "Good")
    ], "2026-05-21");

    expect(summary).toEqual({ current: 2, longest: 2, completedDays: 2 });
  });

  it("finds memory lane matches within three days", () => {
    const matches = memoryLaneMatches([
      entry("near", "2025-05-19", "Park"),
      entry("far", "2024-05-10", "Beach")
    ], "2026-05-21");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.label).toBe("1 year ago");
    expect(matches[0]?.dayDistance).toBe(2);
  });

  it("adds early look-backs before a user has anniversary history", () => {
    const matches = memoryLaneMatches([
      entry("week", "2026-05-14", "A week-old coffee"),
      entry("three-days", "2026-05-18", "Tiny walk"),
      entry("yesterday", "2026-05-20", "Kitchen laugh")
    ], "2026-05-21");

    expect(matches.map((match) => match.label)).toEqual(["1 week ago", "3 days ago", "Yesterday"]);
  });

  it("falls back to the most recent kept memory when no look-back target matches", () => {
    const matches = memoryLaneMatches([
      entry("recent", "2026-05-10", "Still worth seeing"),
      entry("today", "2026-05-21", "Today should not be resurfaced")
    ], "2026-05-21");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.label).toBe("Recent good thing");
    expect(matches[0]?.entryId).toBe("recent");
  });

  it("searches prompt text, responses, people, and little details", () => {
    const target = entry("target", "2026-05-21", "Loved the yellow snack");
    target.personTagIds = ["kid"];
    target.details = [{
      id: "detail",
      entryId: target.id,
      text: "Still says lellow",
      category: "phrase",
      sortOrder: 0,
      personTagIds: ["kid"]
    }];

    expect(searchEntries([target], people, "Kid 1")).toHaveLength(1);
    expect(searchEntries([target], people, "lellow")).toHaveLength(1);
    expect(searchEntries([target], people, "yellow snack")).toHaveLength(1);
  });

  it("lists little details by newest date and filters by search, person, and category", () => {
    const older = entry("older", "2026-05-19", "Park");
    older.details = [{
      id: "older-detail",
      entryId: older.id,
      text: "Asked for the dinosaur spoon",
      category: "favorite",
      sortOrder: 0,
      personTagIds: ["kid"]
    }];

    const newer = entry("newer", "2026-05-21", "Dinner");
    newer.details = [{
      id: "newer-detail",
      entryId: newer.id,
      text: "A quiet walk after dinner",
      category: "routine",
      sortOrder: 0,
      personTagIds: ["me"]
    }];

    const allDetails = listMemoryDetails([older, newer], people);
    expect(allDetails.map((item) => item.detail.id)).toEqual(["newer-detail", "older-detail"]);
    expect(listMemoryDetails([older, newer], people, { query: "dinosaur" })).toHaveLength(1);
    expect(listMemoryDetails([older, newer], people, { personId: "kid" }).map((item) => item.detail.id)).toEqual(["older-detail"]);
    expect(listMemoryDetails([older, newer], people, { category: "routine" }).map((item) => item.people[0]?.name)).toEqual(["Me"]);
  });
});

describe("gratitude prompts", () => {
  it("includes the deterministic guide packs", () => {
    expect(gratitudePromptPacks.map((pack) => pack.id)).toEqual([
      "default-gratitude",
      "savoring",
      "appreciation",
      "self-kindness",
      "hard-day",
      "family-relationships"
    ]);
  });

  it("returns stable suggestions for the same entry context", () => {
    const first = gratitudeGuideForEntry({ localDate: "2026-05-22", mood: "good", hasRelationships: true });
    const second = gratitudeGuideForEntry({ localDate: "2026-05-22", mood: "good", hasRelationships: true });

    expect(second).toEqual(first);
    expect(first.suggestions).toHaveLength(3);
  });

  it("uses gentle copy and hard-day prompts for low mood", () => {
    const guide = gratitudeGuideForEntry({ localDate: "2026-05-22", mood: "low" });

    expect(guide.pack.id).toBe("hard-day");
    expect(guide.moodCopy).toContain("honest and tiny");
  });

  it("adds suggestions without replacing typed reflection text", () => {
    expect(addSuggestionToReflectionText("Already typed", "One small comfort")).toBe("Already typed\nOne small comfort");
    expect(addSuggestionToReflectionText("Already typed\n", "One small comfort")).toBe("Already typed\nOne small comfort");
    expect(addSuggestionToReflectionText("One\nTwo\nThree", "Four")).toBe("One\nTwo\nThree; Four");
    expect(addSuggestionToReflectionText("One small comfort", "One small comfort")).toBe("One small comfort");
  });
});

describe("eagerEntryWindows", () => {
  it("covers the last 12 months and the 2y/3y anniversary slices", () => {
    const windows = eagerEntryWindows("2026-06-12");
    expect(windows[0]).toEqual({ from: "2025-06-12" });
    expect(windows[1]).toEqual({ from: "2024-06-05", to: "2024-06-19" });
    expect(windows[2]).toEqual({ from: "2023-06-05", to: "2023-06-19" });
  });
});

describe("calendarDayAction", () => {
  const today = "2026-08-11";

  it("opens days that already have an entry, even future-dated ones", () => {
    expect(calendarDayAction({ date: "2026-08-01", hasEntry: true, canStart: true, today })).toBe("open");
    expect(calendarDayAction({ date: "2026-08-01", hasEntry: true, canStart: false, today })).toBe("open");
    expect(calendarDayAction({ date: "2026-08-20", hasEntry: true, canStart: true, today })).toBe("open");
  });

  it("starts a backfill on empty past days and today for members who can edit", () => {
    expect(calendarDayAction({ date: "2026-08-01", hasEntry: false, canStart: true, today })).toBe("start");
    expect(calendarDayAction({ date: today, hasEntry: false, canStart: true, today })).toBe("start");
  });

  it("keeps empty future days inert", () => {
    expect(calendarDayAction({ date: "2026-08-12", hasEntry: false, canStart: true, today })).toBe("none");
    expect(calendarDayAction({ date: "2027-01-01", hasEntry: false, canStart: true, today })).toBe("none");
  });

  it("keeps empty days inert for read-only viewers", () => {
    expect(calendarDayAction({ date: "2026-08-01", hasEntry: false, canStart: false, today })).toBe("none");
  });

  it("compares dates across month and year boundaries", () => {
    expect(calendarDayAction({ date: "2025-12-31", hasEntry: false, canStart: true, today: "2026-01-01" })).toBe("start");
    expect(calendarDayAction({ date: "2026-02-01", hasEntry: false, canStart: true, today: "2026-01-31" })).toBe("none");
  });
});
