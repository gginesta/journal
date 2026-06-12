import { describe, expect, it } from "vitest";
import { syncLimits, validateSyncPayload } from "../src/lib/journal-sync-validation";
import type { JournalEntry, PersonTag } from "../src/types/journal";

const workspaceId = "11111111-1111-4111-8111-111111111111";

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    localDate: "2026-06-12",
    mood: "good",
    note: "A small good day.",
    sessions: [],
    photos: [],
    personTagIds: [],
    details: [],
    createdAt: "2026-06-12T20:00:00.000Z",
    updatedAt: "2026-06-12T20:00:00.000Z",
    ...overrides
  };
}

function makePerson(overrides: Partial<PersonTag> = {}): PersonTag {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    name: "Me",
    color: "#8aa29e",
    sortOrder: 0,
    isDefault: true,
    ...overrides
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId,
    people: [makePerson()],
    prompts: [],
    reminders: { cadence: "evening", remindersEnabled: true, eveningTime: "20:30", morningTime: "08:00" },
    entries: [makeEntry()],
    ...overrides
  };
}

describe("validateSyncPayload", () => {
  it("accepts a well-formed payload", () => {
    const result = validateSyncPayload(makePayload());
    expect(result.ok).toBe(true);
  });

  it("rejects non-object payloads and missing workspace ids", () => {
    expect(validateSyncPayload(null).ok).toBe(false);
    expect(validateSyncPayload([]).ok).toBe(false);
    expect(validateSyncPayload(makePayload({ workspaceId: "not-a-uuid" })).ok).toBe(false);
  });

  it("rejects an entry with an invalid mood", () => {
    const result = validateSyncPayload(makePayload({ entries: [{ ...makeEntry(), mood: "ecstatic" }] }));
    expect(result.ok).toBe(false);
  });

  it("rejects an entry with a malformed local date", () => {
    const result = validateSyncPayload(makePayload({ entries: [makeEntry({ localDate: "June 12" })] }));
    expect(result.ok).toBe(false);
  });

  it("rejects notes and captions over the length caps", () => {
    const longNote = validateSyncPayload(makePayload({ entries: [makeEntry({ note: "a".repeat(syncLimits.longText + 1) })] }));
    expect(longNote.ok).toBe(false);

    const photo = {
      id: crypto.randomUUID(),
      entryId: crypto.randomUUID(),
      storagePath: "",
      thumbnailPath: "",
      previewUrl: "data:image/jpeg;base64,abcd",
      caption: "a".repeat(syncLimits.caption + 1),
      sortOrder: 0,
      createdAt: "2026-06-12T20:00:00.000Z"
    };
    const longCaption = validateSyncPayload(makePayload({ entries: [makeEntry({ photos: [photo] })] }));
    expect(longCaption.ok).toBe(false);
  });

  it("rejects a photo data url over the size cap", () => {
    const photo = {
      id: crypto.randomUUID(),
      entryId: crypto.randomUUID(),
      storagePath: "",
      thumbnailPath: "",
      previewUrl: "a".repeat(syncLimits.photoDataUrlChars + 1),
      caption: "",
      sortOrder: 0,
      createdAt: "2026-06-12T20:00:00.000Z"
    };
    const result = validateSyncPayload(makePayload({ entries: [makeEntry({ photos: [photo] })] }));
    expect(result.ok).toBe(false);
  });

  it("rejects oversized collections", () => {
    const entries = Array.from({ length: syncLimits.entries + 1 }, () => makeEntry());
    expect(validateSyncPayload(makePayload({ entries })).ok).toBe(false);

    const people = Array.from({ length: syncLimits.people + 1 }, () => makePerson());
    expect(validateSyncPayload(makePayload({ people })).ok).toBe(false);
  });

  it("rejects invalid reminder preferences", () => {
    const result = validateSyncPayload(makePayload({ reminders: { cadence: "hourly", remindersEnabled: true, eveningTime: "20:30", morningTime: "08:00" } }));
    expect(result.ok).toBe(false);
  });
});
