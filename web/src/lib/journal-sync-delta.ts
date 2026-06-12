import type { JournalEntry } from "@/types/journal";

// Delta sync: an entry is sent to the server only when its sync-relevant
// content differs from what the server last acknowledged. Serialization
// deliberately excludes syncedAt (the stale-write baseline bookkeeping).
export function serializeEntryForSync(entry: JournalEntry): string {
  return JSON.stringify({
    id: entry.id,
    workspaceId: entry.workspaceId,
    localDate: entry.localDate,
    mood: entry.mood,
    note: entry.note,
    personTagIds: entry.personTagIds,
    sessions: entry.sessions,
    photos: entry.photos.map((photo) => ({
      id: photo.id,
      storagePath: photo.storagePath,
      thumbnailPath: photo.thumbnailPath,
      previewUrl: photo.previewUrl,
      caption: photo.caption,
      sortOrder: photo.sortOrder
    })),
    details: entry.details
  });
}

export function selectDirtyEntries(entries: JournalEntry[], ackedSerializations: ReadonlyMap<string, string>): JournalEntry[] {
  return entries.filter((entry) => ackedSerializations.get(entry.id) !== serializeEntryForSync(entry));
}
