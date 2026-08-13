import { NextResponse } from "next/server";
import type { JournalEntry, PersonTag, PromptTemplate, ReminderPreferences } from "@/types/journal";
import { computePersonTagDeletions, isSafeWorkspaceStoragePath, parseImageDataUrl } from "@/lib/journal-sync-safety";
import { validateSyncPayload } from "@/lib/journal-sync-validation";
import { getWorkspaceMutationAccess } from "@/lib/workspace-access";
import { makePhotoThumbnail } from "@/lib/photo-thumbnails";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";

const entrySyncConcurrency = 3;

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("journal/sync", status, message, context);
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return fail(503, "Supabase is not configured");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(401, "Authentication required");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Sync payload must be valid JSON", { user: user.id });
  }

  const validation = validateSyncPayload(body);
  if (!validation.ok) {
    return fail(400, validation.message, { user: user.id });
  }
  const payload = validation.payload;

  const access = await getWorkspaceMutationAccess(supabase, payload.workspaceId, user.id, "Editor access is required to sync this workspace");
  if (!access.ok) {
    return fail(access.status, access.message, { user: user.id, workspace: payload.workspaceId });
  }

  // Delta-synced sections arrive only when they changed client-side; an
  // omitted section skips its upserts (and, for people, the deletion
  // reconciliation queries) entirely.
  const people = payload.people?.filter((person) => person.workspaceId === payload.workspaceId);
  const prompts = payload.prompts?.filter((prompt) => prompt.workspaceId === payload.workspaceId);
  const entries = payload.entries.filter((entry) => entry.workspaceId === payload.workspaceId);

  const firstError =
    (people ? await upsertPeople(supabase, payload.workspaceId, people) : null) ??
    (prompts ? await upsertPrompts(supabase, payload.workspaceId, prompts) : null) ??
    (payload.reminders ? await upsertReminders(supabase, payload.workspaceId, payload.reminders) : null);

  if (firstError) {
    return fail(500, firstError.message, { user: user.id, workspace: payload.workspaceId });
  }

  const entryOutcome = await syncEntries(supabase, payload.workspaceId, user.id, entries);
  if (entryOutcome.error) {
    return fail(500, entryOutcome.error.message, { user: user.id, workspace: payload.workspaceId });
  }

  return NextResponse.json({ ok: true, applied: entryOutcome.applied, stale: entryOutcome.stale });
}

async function upsertPeople(supabase: SupabaseServerClient, workspaceId: string, people: PersonTag[]) {
  // Upsert first so newly-created tags exist before entries reference them and so
  // they are not mistaken for "missing" during deletion reconciliation below.
  if (people.length > 0) {
    const { error } = await supabase.from("person_tags").upsert(
      people.map((person) => ({
        id: person.id,
        workspace_id: workspaceId,
        name: person.name,
        color_hex: person.color,
        sort_order: person.sortOrder,
        is_default: person.isDefault
      })),
      { onConflict: "id" }
    );
    if (error) return error;
  }

  return reconcilePersonTagDeletions(supabase, workspaceId, people);
}

// Removing a person tag in the client must persist. Delete workspace tags that
// are absent from the synced payload and not attached to any entry or detail.
async function reconcilePersonTagDeletions(supabase: SupabaseServerClient, workspaceId: string, people: PersonTag[]) {
  const { data: existing, error: existingError } = await supabase
    .from("person_tags")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (existingError) return existingError;

  const existingIds = (existing ?? []).map((row) => row.id as string);
  const candidateIds = computePersonTagDeletions(existingIds, people.map((person) => person.id), []);
  if (candidateIds.length === 0) return null;

  const { data: entryRefs, error: entryRefError } = await supabase
    .from("entry_person_tags")
    .select("person_tag_id")
    .in("person_tag_id", candidateIds);
  if (entryRefError) return entryRefError;

  const { data: detailRefs, error: detailRefError } = await supabase
    .from("detail_person_tags")
    .select("person_tag_id")
    .in("person_tag_id", candidateIds);
  if (detailRefError) return detailRefError;

  const referencedIds = [
    ...(entryRefs ?? []).map((row) => row.person_tag_id as string),
    ...(detailRefs ?? []).map((row) => row.person_tag_id as string)
  ];

  const safeToDelete = computePersonTagDeletions(candidateIds, people.map((person) => person.id), referencedIds);
  if (safeToDelete.length === 0) return null;

  const { error: deleteError } = await supabase
    .from("person_tags")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", safeToDelete);
  return deleteError;
}

async function upsertPrompts(supabase: SupabaseServerClient, workspaceId: string, prompts: PromptTemplate[]) {
  if (prompts.length === 0) return null;

  const { error } = await supabase.from("prompt_templates").upsert(
    prompts.map((prompt) => ({
      id: prompt.id,
      workspace_id: workspaceId,
      title: prompt.title,
      prompt: prompt.prompt,
      sort_order: prompt.sortOrder,
      is_enabled: prompt.isEnabled,
      is_default: prompt.isDefault
    })),
    { onConflict: "id" }
  );
  return error;
}

async function upsertReminders(supabase: SupabaseServerClient, workspaceId: string, reminders: ReminderPreferences) {
  const { error } = await supabase.from("reminder_preferences").upsert(
    {
      workspace_id: workspaceId,
      cadence: reminders.cadence,
      reminders_enabled: reminders.remindersEnabled,
      evening_time: reminders.eveningTime,
      morning_time: reminders.morningTime,
      // Older clients sync reminders without a timezone; leaving the column out
      // of the payload preserves the stored value instead of nulling it to UTC.
      ...(reminders.timezone ? { timezone: reminders.timezone } : {})
    },
    { onConflict: "workspace_id" }
  );
  return error;
}

type EntrySyncOutcome = {
  error: { message: string } | null;
  // entry id -> authoritative server updated_at, the client's next stale-write baseline
  applied: Record<string, string>;
  // entry ids refused because the server row changed since the client loaded it
  stale: string[];
};

type SingleEntryOutcome = {
  entryId: string;
  error: { message: string } | null;
  stale: boolean;
  serverUpdatedAt: string | null;
};

// Entries are independent rows, so their transactional RPCs can overlap; the
// small cap keeps a large backlog from stampeding the database.
async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function syncEntries(supabase: SupabaseServerClient, workspaceId: string, userId: string, entries: JournalEntry[]): Promise<EntrySyncOutcome> {
  const applied: Record<string, string> = {};
  const stale: string[] = [];
  if (entries.length === 0) return { error: null, applied, stale };

  const outcomes = await mapWithConcurrency(entries, entrySyncConcurrency, (entry) => syncOneEntry(supabase, workspaceId, userId, entry));

  let firstError: { message: string } | null = null;
  for (const outcome of outcomes) {
    if (outcome.error) {
      firstError ??= outcome.error;
    } else if (outcome.stale) {
      stale.push(outcome.entryId);
    } else if (outcome.serverUpdatedAt) {
      applied[outcome.entryId] = outcome.serverUpdatedAt;
    }
  }

  return { error: firstError, applied, stale };
}

async function syncOneEntry(supabase: SupabaseServerClient, workspaceId: string, userId: string, entry: JournalEntry): Promise<SingleEntryOutcome> {
  const outcome: SingleEntryOutcome = { entryId: entry.id, error: null, stale: false, serverUpdatedAt: null };

  // Storage uploads are not transactional, so they happen before the entry
  // rewrite; a failure after upload leaves an unreferenced object at worst.
  const photoRows = [];
  for (const photo of entry.photos) {
    const uploaded = await ensurePhotoStored(supabase, workspaceId, entry.localDate, photo.id, photo.previewUrl, photo.storagePath, photo.thumbnailPath);
    if (uploaded.error) return { ...outcome, error: uploaded.error };
    photoRows.push({
      id: photo.id,
      storage_path: uploaded.storagePath,
      thumbnail_path: uploaded.thumbnailPath,
      caption: photo.caption,
      sort_order: photo.sortOrder,
      byte_size: uploaded.byteSize ?? null
    });
  }

  const { data, error } = await supabase.rpc("sync_journal_entry", {
    entry: {
      id: entry.id,
      workspace_id: workspaceId,
      local_date: entry.localDate,
      mood: entry.mood,
      note: entry.note,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      base_updated_at: entry.syncedAt ?? null,
      person_tag_ids: entry.personTagIds,
      // Per-person sections: only the caller's own (or unowned legacy)
      // sessions are written; other members' sections are untouched.
      sessions: entry.sessions
        .filter((session) => !session.createdBy || session.createdBy === userId)
        .map((session) => ({
          id: session.id,
          kind: session.kind,
          responses: session.responses.map((response) => ({
            id: response.id,
            prompt_id: response.promptId,
            prompt_title: response.promptTitle,
            prompt_text: response.promptText,
            prompt_order: response.promptOrder,
            text: response.text
          }))
        })),
      details: entry.details.map((detail) => ({
        id: detail.id,
        text: detail.text,
        category: detail.category,
        sort_order: detail.sortOrder,
        person_tag_ids: detail.personTagIds
      })),
      photos: photoRows
    }
  });
  if (error) return { ...outcome, error };

  const result = data as { status?: string; server_updated_at?: string } | null;
  if (result?.status === "stale") {
    return { ...outcome, stale: true };
  }
  return { ...outcome, serverUpdatedAt: result?.server_updated_at ?? null };
}

async function ensurePhotoStored(
  supabase: SupabaseServerClient,
  workspaceId: string,
  localDate: string,
  photoId: string,
  previewUrl: string,
  storagePath: string,
  thumbnailPath: string
): Promise<{ storagePath: string; thumbnailPath: string; byteSize?: number; error?: { message: string } }> {
  if (storagePath && thumbnailPath) {
    if (!isSafeWorkspaceStoragePath(storagePath, workspaceId) || !isSafeWorkspaceStoragePath(thumbnailPath, workspaceId)) {
      return { storagePath, thumbnailPath, error: { message: "Photo storage metadata does not belong to this workspace" } };
    }
    return { storagePath, thumbnailPath };
  }

  if (storagePath || thumbnailPath) {
    return { storagePath, thumbnailPath, error: { message: "Photo storage metadata is incomplete" } };
  }

  const data = parseImageDataUrl(previewUrl);
  if (!data) {
    return { storagePath, thumbnailPath, error: { message: "Photo data is missing or is not a supported image" } };
  }
  const buffer = Buffer.from(data.base64, "base64");
  const thumbnail = await makePhotoThumbnail(buffer);

  const path = `${workspaceId}/${localDate}/${photoId}.${data.extension}`;
  const thumbPath = `${workspaceId}/${localDate}/${photoId}-thumb.${thumbnail.extension}`;

  const { error: photoError } = await supabase.storage.from("journal-photos").upload(path, buffer, {
    contentType: data.contentType,
    upsert: true
  });
  if (photoError) return { storagePath: path, thumbnailPath: thumbPath, error: photoError };

  const { error: thumbError } = await supabase.storage.from("journal-thumbnails").upload(thumbPath, thumbnail.buffer, {
    contentType: thumbnail.contentType,
    upsert: true
  });
  if (thumbError) return { storagePath: path, thumbnailPath: thumbPath, error: thumbError };

  return { storagePath: path, thumbnailPath: thumbPath, byteSize: buffer.byteLength };
}
