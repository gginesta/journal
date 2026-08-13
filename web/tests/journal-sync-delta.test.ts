import { describe, expect, it } from "vitest";
import { isPendingUploadPhoto, selectDirtyEntries, serializeEntryForSync, stripPendingUploadPhotos } from "../src/lib/journal-sync-delta";
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

describe("pending out-of-band photo uploads", () => {
  const pendingPhoto = makePhoto({
    id: "photo-2",
    storagePath: "",
    thumbnailPath: "",
    previewUrl: "data:image/jpeg;base64,abcd",
    thumbnailUrl: undefined,
    sortOrder: 1
  });

  it("classifies base64 previews as pending and stored signed URLs as not", () => {
    expect(isPendingUploadPhoto(pendingPhoto)).toBe(true);
    expect(isPendingUploadPhoto(makePhoto())).toBe(false);
  });

  it("strips pending photos from the sync payload while keeping stored ones", () => {
    const entry = makeEntry({ photos: [makePhoto(), pendingPhoto] });
    const stripped = stripPendingUploadPhotos(entry);
    expect(stripped.photos.map((photo) => photo.id)).toEqual(["photo-1"]);
    // Everything except the pending photo is untouched.
    expect(stripped.id).toBe(entry.id);
    expect(stripped.details).toBe(entry.details);
  });

  it("returns the same entry object when nothing is pending", () => {
    const entry = makeEntry({ photos: [makePhoto()] });
    expect(stripPendingUploadPhotos(entry)).toBe(entry);
  });

  it("keeps an entry dirty against its stripped ack until the upload lands", () => {
    const entry = makeEntry({ photos: [makePhoto(), pendingPhoto] });
    // The sync ack records the serialization of the stripped payload.
    const acked = new Map([[entry.id, serializeEntryForSync(stripPendingUploadPhotos(entry))]]);
    expect(selectDirtyEntries([entry], acked)).toEqual([entry]);

    // After the out-of-band upload merges the stored paths, the follow-up
    // sync acks the full serialization and the entry goes clean.
    const uploaded = {
      ...entry,
      photos: [
        entry.photos[0],
        {
          ...pendingPhoto,
          storagePath: "ws-1/2026-06-12/photo-2.jpg",
          thumbnailPath: "ws-1/2026-06-12/photo-2-thumb.jpg",
          previewUrl: "https://storage.example/signed/photo-2?token=a",
          thumbnailUrl: "https://storage.example/signed/photo-2-thumb?token=a"
        }
      ]
    };
    acked.set(entry.id, serializeEntryForSync(uploaded));
    expect(selectDirtyEntries([uploaded], acked)).toEqual([]);
  });
});
