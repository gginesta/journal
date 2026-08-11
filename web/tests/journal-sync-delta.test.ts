import { describe, expect, it } from "vitest";
import { selectDirtyEntries, serializeEntryForSync } from "../src/lib/journal-sync-delta";
import type { JournalEntry, PhotoAttachment } from "../src/types/journal";

function makePhoto(overrides: Partial<PhotoAttachment> = {}): PhotoAttachment {
  return {
    id: "photo-1",
    entryId: "entry-1",
    storagePath: "ws-1/2026-06-12/photo-1.jpg",
    thumbnailPath: "ws-1/2026-06-12/photo-1-thumb.jpg",
    previewUrl: "https://storage.example/signed/photo-1?token=a",
    thumbnailUrl: "https://storage.example/signed/photo-1-thumb?token=a",
    caption: "",
    sortOrder: 0,
    createdAt: "2026-06-12T20:00:00.000Z",
    ...overrides
  };
}

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

  it("does not mark an entry dirty when a stored photo's signed URLs refresh", () => {
    const entry = makeEntry({ photos: [makePhoto()] });
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    const refreshed = {
      ...entry,
      photos: [
        makePhoto({
          previewUrl: "https://storage.example/signed/photo-1?token=b",
          thumbnailUrl: "https://storage.example/signed/photo-1-thumb?token=b"
        })
      ]
    };
    expect(selectDirtyEntries([refreshed], acked)).toEqual([]);
  });

  it("marks an entry dirty when a new base64 photo is added", () => {
    const entry = makeEntry({ photos: [makePhoto()] });
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    const newPhoto = makePhoto({
      id: "photo-2",
      storagePath: "",
      thumbnailPath: "",
      previewUrl: "data:image/jpeg;base64,abcd",
      thumbnailUrl: undefined,
      sortOrder: 1
    });
    const withNewPhoto = { ...entry, photos: [...entry.photos, newPhoto] };
    expect(selectDirtyEntries([withNewPhoto], acked)).toEqual([withNewPhoto]);
  });

  it("marks an entry dirty when a stored photo is replaced with new base64 data", () => {
    const entry = makeEntry({ photos: [makePhoto()] });
    const acked = new Map([[entry.id, serializeEntryForSync(entry)]]);
    const replaced = {
      ...entry,
      photos: [makePhoto({ storagePath: "", thumbnailPath: "", previewUrl: "data:image/jpeg;base64,abcd", thumbnailUrl: undefined })]
    };
    expect(selectDirtyEntries([replaced], acked)).toEqual([replaced]);
  });

  it("excludes photo bytes from the serialization", () => {
    const entry = makeEntry({ photos: [makePhoto({ previewUrl: `data:image/jpeg;base64,${"a".repeat(100_000)}` })] });
    expect(serializeEntryForSync(entry).length).toBeLessThan(2_000);
  });
});
