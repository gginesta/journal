import { describe, expect, it } from "vitest";
import type { JournalEntry, PersonTag } from "../src/types/journal";
import { isEntryComplete, memoryLaneMatches, searchEntries, streakSummary } from "../src/lib/journal-logic";

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

  it("finds memory lane matches within three days", () => {
    const matches = memoryLaneMatches([
      entry("near", "2025-05-19", "Park"),
      entry("far", "2024-05-10", "Beach")
    ], "2026-05-21");

    expect(matches).toHaveLength(1);
    expect(matches[0]?.label).toBe("1 year ago");
    expect(matches[0]?.dayDistance).toBe(2);
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
});
