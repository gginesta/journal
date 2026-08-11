import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { JournalEntry } from "../src/types/journal";
import { memoryLaneMatches } from "../src/lib/journal-logic";

// SPEC-3 shared cross-platform fixtures (see docs/SPEC.md). The iOS test
// target (SpecConformanceTests) asserts the same cases, so a platform can
// only drift by editing the fixture.
type MemoryLaneCase = {
  name: string;
  today: string;
  entries: Array<{ id: string; date: string; complete: boolean }>;
  expected: Array<{ label: string; entryId: string; dayDistance: number }>;
};

function loadFixture<T>(name: string): { cases: T[] } {
  const path = fileURLToPath(new URL(`../../spec/fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as { cases: T[] };
}

function fixtureEntry(id: string, localDate: string, complete: boolean): JournalEntry {
  return {
    id,
    workspaceId: "w1",
    localDate,
    mood: "good",
    note: "",
    createdAt: `${localDate}T00:00:00.000Z`,
    updatedAt: `${localDate}T00:00:00.000Z`,
    personTagIds: [],
    photos: [],
    sessions: [{
      id: `${id}-session`,
      kind: "evening",
      responses: complete
        ? [{
            id: `${id}-response`,
            promptId: "prompt",
            promptTitle: "Nice things",
            promptText: "What went well?",
            promptOrder: 0,
            text: "Something good"
          }]
        : []
    }],
    details: []
  };
}

describe("SPEC-3 Memory Lane ladder conformance", () => {
  for (const testCase of loadFixture<MemoryLaneCase>("memory-lane.json").cases) {
    it(testCase.name, () => {
      const entries = testCase.entries.map((entry) => fixtureEntry(entry.id, entry.date, entry.complete));
      const matches = memoryLaneMatches(entries, testCase.today);

      expect(matches.map(({ label, entryId, dayDistance }) => ({ label, entryId, dayDistance }))).toEqual(
        testCase.expected
      );
    });
  }
});
