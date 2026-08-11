import type { JournalEntry, PhotoAttachment } from "@/types/journal";

// A photo whose bytes have not reached storage yet: it still carries the local
// base64 preview instead of a signed https URL.
export function isPendingUploadPhoto(photo: PhotoAttachment): boolean {
  return photo.previewUrl.startsWith("data:");
}

// Photos waiting on an out-of-band upload are excluded from the sync payload:
// their bytes travel through POST /api/journal/photos after the entry row is
// acked, and the follow-up delta sync reconciles the stored row.
export function stripPendingUploadPhotos(entry: JournalEntry): JournalEntry {
  if (!entry.photos.some(isPendingUploadPhoto)) return entry;
  return { ...entry, photos: entry.photos.filter((photo) => !isPendingUploadPhoto(photo)) };
}

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
      // Cheap change signal instead of the photo bytes: a newly added photo
      // carries a base64 data URL until upload; a stored photo's signed https
      // URL can refresh without marking the entry dirty. Because sync acks
      // record the serialization of the *stripped* payload, a pending photo
      // keeps its entry dirty until the out-of-band upload lands.
      hasPendingUpload: isPendingUploadPhoto(photo),
      caption: photo.caption,
      sortOrder: photo.sortOrder
    })),
    details: entry.details
  });
}

export function selectDirtyEntries(entries: JournalEntry[], ackedSerializations: ReadonlyMap<string, string>): JournalEntry[] {
  return entries.filter((entry) => ackedSerializations.get(entry.id) !== serializeEntryForSync(entry));
}
