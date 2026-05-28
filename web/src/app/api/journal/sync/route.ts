import { NextResponse } from "next/server";
import type { JournalEntry, PersonTag, PromptTemplate, ReminderPreferences } from "@/types/journal";
import { canMutateWorkspaceRole, isSafeWorkspaceStoragePath, parseImageDataUrl } from "@/lib/journal-sync-safety";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SyncPayload = {
  workspaceId: string;
  people: PersonTag[];
  prompts: PromptTemplate[];
  reminders: ReminderPreferences;
  entries: JournalEntry[];
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = (await request.json()) as SyncPayload;
  if (!payload.workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  }

  const access = await getWorkspaceMutationAccess(payload.workspaceId, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const people = payload.people.filter((person) => person.workspaceId === payload.workspaceId);
  const prompts = payload.prompts.filter((prompt) => prompt.workspaceId === payload.workspaceId);
  const entries = payload.entries.filter((entry) => entry.workspaceId === payload.workspaceId);

  const firstError =
    (await upsertPeople(payload.workspaceId, people)) ??
    (await upsertPrompts(payload.workspaceId, prompts)) ??
    (await upsertReminders(payload.workspaceId, payload.reminders)) ??
    (await syncEntries(payload.workspaceId, user.id, entries));

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
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
  if (!supabase || people.length === 0) return null;

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
  return error;
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

async function syncEntries(workspaceId: string, userId: string, entries: JournalEntry[]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  if (entries.length === 0) return null;

  const { data: existingEntries, error: existingEntryError } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in(
      "id",
      entries.map((entry) => entry.id)
    );
  if (existingEntryError) return existingEntryError;

  const existingEntryIds = new Set(existingEntries?.map((entry) => entry.id) ?? []);
  const existingEntryRows = entries
    .filter((entry) => existingEntryIds.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      workspace_id: workspaceId,
      local_date: entry.localDate,
      mood: entry.mood,
      note: entry.note,
      updated_at: entry.updatedAt
    }));
  const newEntryRows = entries
    .filter((entry) => !existingEntryIds.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      workspace_id: workspaceId,
      local_date: entry.localDate,
      mood: entry.mood,
      note: entry.note,
      created_by: userId,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    }));

  if (newEntryRows.length > 0) {
    const { error: insertEntryError } = await supabase.from("journal_entries").insert(newEntryRows);
    if (insertEntryError) return insertEntryError;
  }

  if (existingEntryRows.length > 0) {
    const { error: updateEntryError } = await supabase.from("journal_entries").upsert(existingEntryRows, { onConflict: "id" });
    if (updateEntryError) return updateEntryError;
  }

  for (const entry of entries) {
    const nestedError = await syncEntryNestedRows(workspaceId, entry);
    if (nestedError) return nestedError;
  }

  return null;
}

async function syncEntryNestedRows(workspaceId: string, entry: JournalEntry) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const photoRows = [];
  for (const photo of entry.photos) {
    const uploaded = await ensurePhotoStored(workspaceId, entry.localDate, photo.id, photo.previewUrl, photo.storagePath, photo.thumbnailPath);
    if (uploaded.error) return uploaded.error;
    photoRows.push({
      id: photo.id,
      entry_id: entry.id,
      storage_path: uploaded.storagePath,
      thumbnail_path: uploaded.thumbnailPath,
      caption: photo.caption,
      sort_order: photo.sortOrder,
      byte_size: uploaded.byteSize
    });
  }

  const deletionError =
    (await supabase.from("entry_person_tags").delete().eq("entry_id", entry.id)).error ??
    (await supabase.from("journal_sessions").delete().eq("entry_id", entry.id)).error ??
    (await supabase.from("memory_details").delete().eq("entry_id", entry.id)).error;
  if (deletionError) return deletionError;

  if (entry.personTagIds.length > 0) {
    const { error } = await supabase.from("entry_person_tags").insert(
      entry.personTagIds.map((personTagId) => ({
        entry_id: entry.id,
        person_tag_id: personTagId
      }))
    );
    if (error) return error;
  }

  if (entry.sessions.length > 0) {
    const { error: sessionError } = await supabase.from("journal_sessions").insert(
      entry.sessions.map((session) => ({
        id: session.id,
        entry_id: entry.id,
        kind: session.kind
      }))
    );
    if (sessionError) return sessionError;

    const responses = entry.sessions.flatMap((session) =>
      session.responses.map((response) => ({
        id: response.id,
        session_id: session.id,
        prompt_id: response.promptId,
        prompt_title: response.promptTitle,
        prompt_text: response.promptText,
        prompt_order: response.promptOrder,
        text: response.text
      }))
    );

    if (responses.length > 0) {
      const { error } = await supabase.from("prompt_responses").insert(responses);
      if (error) return error;
    }
  }

  if (entry.details.length > 0) {
    const { error: detailsError } = await supabase.from("memory_details").insert(
      entry.details.map((detail) => ({
        id: detail.id,
        entry_id: entry.id,
        text: detail.text,
        category: detail.category,
        sort_order: detail.sortOrder
      }))
    );
    if (detailsError) return detailsError;

    const detailLinks = entry.details.flatMap((detail) =>
      detail.personTagIds.map((personTagId) => ({
        detail_id: detail.id,
        person_tag_id: personTagId
      }))
    );
    if (detailLinks.length > 0) {
      const { error } = await supabase.from("detail_person_tags").insert(detailLinks);
      if (error) return error;
    }
  }

  const { error: photoDeleteError } = await supabase.from("photo_attachments").delete().eq("entry_id", entry.id);
  if (photoDeleteError) return photoDeleteError;

  if (photoRows.length > 0) {
    const { error } = await supabase.from("photo_attachments").insert(photoRows);
    if (error) return error;
  }

  return null;
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

  const path = `${workspaceId}/${localDate}/${photoId}.${data.extension}`;
  const thumbPath = `${workspaceId}/${localDate}/${photoId}-thumb.${data.extension}`;

  const { error: photoError } = await supabase.storage.from("journal-photos").upload(path, buffer, {
    contentType: data.contentType,
    upsert: true
  });
  if (photoError) return { storagePath: path, thumbnailPath: thumbPath, error: photoError };

  const { error: thumbError } = await supabase.storage.from("journal-thumbnails").upload(thumbPath, buffer, {
    contentType: data.contentType,
    upsert: true
  });
  if (thumbError) return { storagePath: path, thumbnailPath: thumbPath, error: thumbError };

  return { storagePath: path, thumbnailPath: thumbPath, byteSize: buffer.byteLength };
}
