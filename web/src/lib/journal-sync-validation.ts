import type {
  JournalEntry,
  JournalSession,
  MemoryDetail,
  Mood,
  PersonTag,
  PhotoAttachment,
  PromptResponse,
  PromptTemplate,
  ReminderPreferences,
  RitualCadence,
  SessionKind
} from "@/types/journal";

export type SyncPayload = {
  workspaceId: string;
  // Delta-synced sections: a client omits any section the server has already
  // acknowledged, and the route skips the corresponding upserts.
  people?: PersonTag[];
  prompts?: PromptTemplate[];
  reminders?: ReminderPreferences;
  entries: JournalEntry[];
};

export type SyncPayloadValidation = { ok: true; payload: SyncPayload } | { ok: false; message: string };

// Caps are deliberately generous versus real product use (daily journaling,
// one-or-two photos per day) so they only reject abuse or runaway clients,
// never a legitimate household journal.
export const syncLimits = {
  people: 200,
  prompts: 100,
  entries: 500,
  sessionsPerEntry: 6,
  responsesPerSession: 30,
  photosPerEntry: 10,
  detailsPerEntry: 60,
  tagIdsPerItem: 200,
  shortText: 160,
  longText: 5_000,
  caption: 300,
  storagePath: 300,
  // Signed https preview URLs for already-stored photos. New clients only ever
  // send this short form: photo bytes upload out-of-band through
  // POST /api/journal/photos, so a typical sync payload is text-level KBs.
  photoPreviewUrlChars: 2_048,
  // Legacy in-payload base64 upload (~8 MB of decoded image data once base64
  // overhead is removed). Kept only for backward compatibility with tabs that
  // loaded before out-of-band photo upload shipped; the sync route still
  // stores these the old way.
  photoDataUrlChars: 11_500_000,
  // Body cap for the out-of-band photo upload route (compressed image bytes).
  photoUploadBytes: 8_000_000
} as const;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const moods = new Set<Mood>(["low", "quiet", "good", "bright", "glowing"]);
const sessionKinds = new Set<SessionKind>(["morning", "evening", "anytime"]);
const cadences = new Set<RitualCadence>(["evening", "once_daily", "morning_evening", "anytime"]);
const detailCategories = new Set<MemoryDetail["category"]>(["phrase", "favorite", "routine", "milestone", "quote", "note"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isUuidArray(value: unknown, maxItems: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every(isUuid);
}

function fail(message: string): SyncPayloadValidation {
  return { ok: false, message };
}

function isPersonTag(value: unknown): value is PersonTag {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.workspaceId) &&
    isText(value.name, syncLimits.shortText) &&
    isText(value.color, 32) &&
    isFiniteNumber(value.sortOrder) &&
    typeof value.isDefault === "boolean"
  );
}

function isPromptTemplate(value: unknown): value is PromptTemplate {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.workspaceId) &&
    isText(value.title, syncLimits.shortText) &&
    isText(value.prompt, syncLimits.longText) &&
    isFiniteNumber(value.sortOrder) &&
    typeof value.isEnabled === "boolean" &&
    typeof value.isDefault === "boolean"
  );
}

function isReminderPreferences(value: unknown): value is ReminderPreferences {
  return (
    isRecord(value) &&
    typeof value.cadence === "string" &&
    cadences.has(value.cadence as RitualCadence) &&
    typeof value.remindersEnabled === "boolean" &&
    isText(value.eveningTime, 8) &&
    isText(value.morningTime, 8) &&
    (value.timezone === undefined || value.timezone === null || isText(value.timezone, 64))
  );
}

function isPromptResponse(value: unknown): value is PromptResponse {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.promptId) &&
    isText(value.promptTitle, syncLimits.shortText) &&
    isText(value.promptText, syncLimits.longText) &&
    isFiniteNumber(value.promptOrder) &&
    isText(value.text, syncLimits.longText)
  );
}

function isJournalSession(value: unknown): value is JournalSession {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    typeof value.kind === "string" &&
    sessionKinds.has(value.kind as SessionKind) &&
    (value.createdBy === undefined || value.createdBy === null || isUuid(value.createdBy)) &&
    Array.isArray(value.responses) &&
    value.responses.length <= syncLimits.responsesPerSession &&
    value.responses.every(isPromptResponse)
  );
}

// Stored photos carry a short signed https URL (or nothing); only the legacy
// in-payload base64 upload path may be megabytes.
function isPhotoPreviewUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const cap = value.startsWith("data:") ? syncLimits.photoDataUrlChars : syncLimits.photoPreviewUrlChars;
  return value.length <= cap;
}

function isPhotoAttachment(value: unknown): value is PhotoAttachment {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.entryId) &&
    isText(value.storagePath, syncLimits.storagePath) &&
    isText(value.thumbnailPath, syncLimits.storagePath) &&
    isPhotoPreviewUrl(value.previewUrl) &&
    isText(value.caption, syncLimits.caption) &&
    isFiniteNumber(value.sortOrder) &&
    isText(value.createdAt, 64)
  );
}

function isMemoryDetail(value: unknown): value is MemoryDetail {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.entryId) &&
    isText(value.text, syncLimits.longText) &&
    typeof value.category === "string" &&
    detailCategories.has(value.category as MemoryDetail["category"]) &&
    isFiniteNumber(value.sortOrder) &&
    isUuidArray(value.personTagIds, syncLimits.tagIdsPerItem)
  );
}

function isJournalEntry(value: unknown): value is JournalEntry {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.workspaceId) &&
    typeof value.localDate === "string" &&
    localDatePattern.test(value.localDate) &&
    typeof value.mood === "string" &&
    moods.has(value.mood as Mood) &&
    isText(value.note, syncLimits.longText) &&
    isText(value.createdAt, 64) &&
    isText(value.updatedAt, 64) &&
    (value.syncedAt === undefined || value.syncedAt === null || isText(value.syncedAt, 64)) &&
    isUuidArray(value.personTagIds, syncLimits.tagIdsPerItem) &&
    Array.isArray(value.sessions) &&
    value.sessions.length <= syncLimits.sessionsPerEntry &&
    value.sessions.every(isJournalSession) &&
    Array.isArray(value.photos) &&
    value.photos.length <= syncLimits.photosPerEntry &&
    value.photos.every(isPhotoAttachment) &&
    Array.isArray(value.details) &&
    value.details.length <= syncLimits.detailsPerEntry &&
    value.details.every(isMemoryDetail)
  );
}

export function validateSyncPayload(value: unknown): SyncPayloadValidation {
  if (!isRecord(value)) return fail("Sync payload must be a JSON object");
  if (!isUuid(value.workspaceId)) return fail("workspaceId must be a valid id");

  if (value.people !== undefined) {
    if (!Array.isArray(value.people) || value.people.length > syncLimits.people) {
      return fail("people must be a list within the allowed size");
    }
    if (!value.people.every(isPersonTag)) return fail("people contains an invalid person tag");
  }

  if (value.prompts !== undefined) {
    if (!Array.isArray(value.prompts) || value.prompts.length > syncLimits.prompts) {
      return fail("prompts must be a list within the allowed size");
    }
    if (!value.prompts.every(isPromptTemplate)) return fail("prompts contains an invalid prompt");
  }

  if (value.reminders !== undefined && !isReminderPreferences(value.reminders)) return fail("reminders is invalid");

  if (!Array.isArray(value.entries) || value.entries.length > syncLimits.entries) {
    return fail("entries must be a list within the allowed size");
  }
  if (!value.entries.every(isJournalEntry)) return fail("entries contains an invalid entry");

  return {
    ok: true,
    payload: {
      workspaceId: value.workspaceId,
      people: value.people,
      prompts: value.prompts,
      reminders: value.reminders,
      entries: value.entries
    }
  };
}
