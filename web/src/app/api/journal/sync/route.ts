import { NextResponse } from "next/server";
import type { JournalEntry, PersonTag, PromptTemplate, ReminderPreferences } from "@/types/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SyncPayload = {
  workspaceId: string;
  people: PersonTag[];
  prompts: PromptTemplate[];
  reminders: ReminderPreferences;
  entries: JournalEntry[];
};

type DataUrlParts = {
  contentType: string;
  buffer: Buffer;
  extension: string;
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

  const { error: entryError } = await supabase.from("journal_entries").upsert(
    entries.map((entry) => ({
      id: entry.id,
      workspace_id: workspaceId,
      local_date: entry.localDate,
      mood: entry.mood,
      note: entry.note,
      created_by: userId,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt
    })),
    { onConflict: "id" }
  );
  if (entryError) return entryError;

  for (const entry of entries) {
    const nestedError = await syncEntryNestedRows(workspaceId, entry);
    if (nestedError) return nestedError;
  }

  return null;
}

async function syncEntryNestedRows(workspaceId: string, entry: JournalEntry) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

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

  const photoRows = [];
  for (const photo of entry.photos) {
    const uploaded = await ensurePhotoStored(workspaceId, entry.localDate, photo.id, photo.previewUrl, photo.storagePath, photo.thumbnailPath);
    if (!uploaded) continue;
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
): Promise<null | { storagePath: string; thumbnailPath: string; byteSize?: number; error?: { message: string } }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  if (storagePath && thumbnailPath) {
    return { storagePath, thumbnailPath };
  }

  const data = parseDataUrl(previewUrl);
  if (!data) return null;

  const path = `${workspaceId}/${localDate}/${photoId}.${data.extension}`;
  const thumbPath = `${workspaceId}/${localDate}/${photoId}-thumb.${data.extension}`;

  const { error: photoError } = await supabase.storage.from("journal-photos").upload(path, data.buffer, {
    contentType: data.contentType,
    upsert: true
  });
  if (photoError) return { storagePath: path, thumbnailPath: thumbPath, error: photoError };

  const { error: thumbError } = await supabase.storage.from("journal-thumbnails").upload(thumbPath, data.buffer, {
    contentType: data.contentType,
    upsert: true
  });
  if (thumbError) return { storagePath: path, thumbnailPath: thumbPath, error: thumbError };

  return { storagePath: path, thumbnailPath: thumbPath, byteSize: data.buffer.byteLength };
}

function parseDataUrl(value: string): DataUrlParts | null {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const contentType = match[1] ?? "image/jpeg";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  return {
    contentType,
    extension,
    buffer: Buffer.from(match[2] ?? "", "base64")
  };
}
