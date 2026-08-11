import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { JournalEntry } from "../src/types/journal";
import { isEntryComplete, streakSummary } from "../src/lib/journal-logic";

// Shared cross-platform fixtures (see docs/SPEC.md). The iOS test target
// asserts the same cases, so a platform can only drift by editing a fixture.
type CompletionCase = {
  name: string;
  responses: string[];
  photoCount: number;
  details: string[];
  expected: boolean;
};

type StreakCase = {
  name: string;
  completeDates: string[];
  today: string;
  expected: { current: number; longest: number; completedDays: number };
};

function loadFixture<T>(name: string): { cases: T[] } {
  const path = fileURLToPath(new URL(`../../spec/fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as { cases: T[] };
}

function fixtureEntry(id: string, localDate: string, responses: string[] = [], photoCount = 0, details: string[] = []): JournalEntry {
  return {
    id,
    workspaceId: "w1",
    localDate,
    mood: "good",
    note: "",
    createdAt: `${localDate}T00:00:00.000Z`,
    updatedAt: `${localDate}T00:00:00.000Z`,
    personTagIds: [],
    photos: Array.from({ length: photoCount }, (_, index) => ({
      id: `${id}-photo-${index}`,
      entryId: id,
      storagePath: "",
      thumbnailPath: "",
      previewUrl: "",
      caption: "",
      sortOrder: index,
      createdAt: `${localDate}T00:00:00.000Z`
    })),
    sessions: [{
      id: `${id}-session`,
      kind: "evening",
      responses: responses.map((text, index) => ({
        id: `${id}-response-${index}`,
        promptId: "prompt",
        promptTitle: "Nice things",
        promptText: "What went well?",
        promptOrder: index,
        text
      }))
    }],
    details: details.map((text, index) => ({
      id: `${id}-detail-${index}`,
      entryId: id,
      text,
      category: "phrase",
      sortOrder: index,
      personTagIds: []
    }))
  };
}

describe("SPEC-1 entry completion conformance", () => {
  for (const testCase of loadFixture<CompletionCase>("completion.json").cases) {
    it(testCase.name, () => {
      const entry = fixtureEntry("entry", "2026-05-21", testCase.responses, testCase.photoCount, testCase.details);
      expect(isEntryComplete(entry)).toBe(testCase.expected);
    });
  }
});

describe("SPEC-2 streak conformance", () => {
  for (const testCase of loadFixture<StreakCase>("streak.json").cases) {
    it(testCase.name, () => {
      const entries = testCase.completeDates.map((date, index) => fixtureEntry(`entry-${index}`, date, ["A good thing"]));
      expect(streakSummary(entries, testCase.today)).toEqual(testCase.expected);
    });
  }
});
