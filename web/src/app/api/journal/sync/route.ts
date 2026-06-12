import { NextResponse } from "next/server";
import type { JournalEntry, PersonTag, PromptTemplate, ReminderPreferences } from "@/types/journal";
import { canMutateWorkspaceRole, computePersonTagDeletions, isSafeWorkspaceStoragePath, parseImageDataUrl } from "@/lib/journal-sync-safety";
import { validateSyncPayload } from "@/lib/journal-sync-validation";
import { makePhotoThumbnail } from "@/lib/photo-thumbnails";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const access = await getWorkspaceMutationAccess(payload.workspaceId, user.id);
  if (!access.ok) {
    return fail(access.status, access.message, { user: user.id, workspace: payload.workspaceId });
  }

  const people = payload.people.filter((person) => person.workspaceId === payload.workspaceId);
  const prompts = payload.prompts.filter((prompt) => prompt.workspaceId === payload.workspaceId);
  const entries = payload.entries.filter((entry) => entry.workspaceId === payload.workspaceId);

  const firstError =
    (await upsertPeople(payload.workspaceId, people)) ??
    (await upsertPrompts(payload.workspaceId, prompts)) ??
    (await upsertReminders(payload.workspaceId, payload.reminders));

  if (firstError) {
    return fail(500, firstError.message, { user: user.id, workspace: payload.workspaceId });
  }

  const entryOutcome = await syncEntries(payload.workspaceId, user.id, entries);
  if (entryOutcome.error) {
    return fail(500, entryOutcome.error.message, { user: user.id, workspace: payload.workspaceId });
  }

  return NextResponse.json({ ok: true, applied: entryOutcome.applied, stale: entryOutcome.stale });
}

async function getWorkspaceMutationAccess(workspaceId: string, userId: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, status: 503, message: "Supabase is not configured" };

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("invitation_state", "accepted")
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!canMutateWorkspaceRole(data?.role)) {
    return { ok: false, status: 403, message: "Editor access is required to sync this workspace" };
  }

  return { ok: true };
}

async function upsertPeople(workspaceId: string, people: PersonTag[]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

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

  return reconcilePersonTagDeletions(workspaceId, people);
}

// Removing a person tag in the client must persist. Delete workspace tags that
// are absent from the synced payload and not attached to any entry or detail.
async function reconcilePersonTagDeletions(workspaceId: string, people: PersonTag[]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

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

async function upsertPrompts(workspaceId: string, prompts: PromptTemplate[]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase || prompts.length === 0) return null;

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

async function upsertReminders(workspaceId: string, reminders: ReminderPreferences) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { error } = await supabase.from("reminder_preferences").upsert(
    {
      workspace_id: workspaceId,
      cadence: reminders.cadence,
      reminders_enabled: reminders.remindersEnabled,
      evening_time: reminders.eveningTime,
      morning_time: reminders.morningTime
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

async function syncEntries(workspaceId: string, userId: string, entries: JournalEntry[]): Promise<EntrySyncOutcome> {
  const supabase = await createSupabaseServerClient();
  const applied: Record<string, string> = {};
  const stale: string[] = [];
  if (!supabase || entries.length === 0) return { error: null, applied, stale };

  for (const entry of entries) {
    // Storage uploads are not transactional, so they happen before the entry
    // rewrite; a failure after upload leaves an unreferenced object at worst.
    const photoRows = [];
    for (const photo of entry.photos) {
      const uploaded = await ensurePhotoStored(workspaceId, entry.localDate, photo.id, photo.previewUrl, photo.storagePath, photo.thumbnailPath);
      if (uploaded.error) return { error: uploaded.error, applied, stale };
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
    if (error) return { error, applied, stale };

    const result = data as { status?: string; server_updated_at?: string } | null;
    if (result?.status === "stale") {
      stale.push(entry.id);
    } else if (result?.server_updated_at) {
      applied[entry.id] = result.server_updated_at;
    }
  }

  return { error: null, applied, stale };
}

async function ensurePhotoStored(
  workspaceId: string,
  localDate: string,
  photoId: string,
  previewUrl: string,
  storagePath: string,
  thumbnailPath: string
): Promise<{ storagePath: string; thumbnailPath: string; byteSize?: number; error?: { message: string } }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { storagePath, thumbnailPath, error: { message: "Supabase is not configured" } };

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
