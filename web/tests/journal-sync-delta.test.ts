import { describe, expect, it } from "vitest";
import { selectDirtyEntries, serializeEntryForSync } from "../src/lib/journal-sync-delta";
import type { JournalEntry } from "../src/types/journal";

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "entry-1",
    workspaceId: "ws-1",
    localDate: "2026-06-12",
    mood: "good",
    note: "A good day",
    sessions: [],
    photos: [],
    personTagIds: [],
    details: [],
    createdAt: "2026-06-12T20:00:00.000Z",
    updatedAt: "2026-06-12T20:00:00.000Z",
    ...overrides
  };
}

describe("delta sync selection", () => {
  it("skips entries whose content matches the acked serialization", () => {
    const entry = makeEntry();
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    expect(selectDirtyEntries([entry], acked)).toEqual([]);
  });

  it("includes entries with changed content", () => {
    const entry = makeEntry();
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    const edited = { ...entry, note: "Edited" };
    expect(selectDirtyEntries([edited], acked)).toEqual([edited]);
  });

  it("includes entries the server has never acknowledged", () => {
    const entry = makeEntry();
    expect(selectDirtyEntries([entry], new Map())).toEqual([entry]);
  });

  it("ignores syncedAt bookkeeping when comparing", () => {
    const entry = makeEntry();
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    const withBaseline = { ...entry, syncedAt: "2026-06-12T21:00:00.000Z" };
    expect(selectDirtyEntries([withBaseline], acked)).toEqual([]);
  });

  it("treats updatedAt-only changes as clean (content unchanged)", () => {
    const entry = makeEntry();
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    const touched = { ...entry, updatedAt: "2026-06-12T23:59:00.000Z" };
    expect(selectDirtyEntries([touched], acked)).toEqual([]);
  });
});
