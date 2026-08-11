import { NextResponse } from "next/server";
import { canMutateWorkspaceRole, imageExtensionForContentType } from "@/lib/journal-sync-safety";
import { syncLimits } from "@/lib/journal-sync-validation";
import { makePhotoThumbnail } from "@/lib/photo-thumbnails";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const signedUrlSeconds = 60 * 60 * 24;

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("journal/photos", status, message, context);
  return NextResponse.json({ error: message }, { status });
}

// Out-of-band photo upload. The debounced text sync stays small: new photo
// bytes arrive here as multipart form data instead of base64 inside the sync
// JSON. The client sends a photo only after the entry row is acked, so the
// entry is required to exist; both storage writes happen before the metadata
// upsert, and every write lands at a deterministic path — a failed attempt
// leaves at most an unreferenced object the retry overwrites.
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Photo upload must be multipart form data", { user: user.id });
  }

  const workspaceId = form.get("workspaceId");
  const entryId = form.get("entryId");
  const photoId = form.get("photoId");
  const localDate = form.get("localDate");
  const caption = form.get("caption") ?? "";
  const sortOrder = Number(form.get("sortOrder"));
  const file = form.get("file");

  if (typeof workspaceId !== "string" || !uuidPattern.test(workspaceId)) {
    return fail(400, "workspaceId must be a valid id", { user: user.id });
  }
  if (typeof entryId !== "string" || !uuidPattern.test(entryId)) {
    return fail(400, "entryId must be a valid id", { user: user.id, workspace: workspaceId });
  }
  if (typeof photoId !== "string" || !uuidPattern.test(photoId)) {
    return fail(400, "photoId must be a valid id", { user: user.id, workspace: workspaceId });
  }
  if (typeof localDate !== "string" || !localDatePattern.test(localDate)) {
    return fail(400, "localDate must be a YYYY-MM-DD date", { user: user.id, workspace: workspaceId });
  }
  if (typeof caption !== "string" || caption.length > syncLimits.caption) {
    return fail(400, "caption must be text within the allowed size", { user: user.id, workspace: workspaceId });
  }
  if (!Number.isFinite(sortOrder)) {
    return fail(400, "sortOrder must be a number", { user: user.id, workspace: workspaceId });
  }
  if (!(file instanceof Blob)) {
    return fail(400, "file must contain the photo bytes", { user: user.id, workspace: workspaceId });
  }
  const extension = imageExtensionForContentType(file.type);
  if (!extension) {
    return fail(415, "Photo must be a JPEG, PNG, or WebP image", { user: user.id, workspace: workspaceId });
  }
  if (file.size > syncLimits.photoUploadBytes) {
    return fail(413, "Photo is too large to upload", { user: user.id, workspace: workspaceId });
  }

  const access = await getWorkspaceMutationAccess(supabase, workspaceId, user.id);
  if (!access.ok) {
    return fail(access.status, access.message, { user: user.id, workspace: workspaceId });
  }

  // The entry row must already exist (the client uploads only after the sync
  // ack that created it). Its server-side local_date is authoritative for the
  // storage path, so retries and replacements always land at the same object.
  const { data: entryRow, error: entryError } = await supabase
    .from("journal_entries")
    .select("id,local_date")
    .eq("id", entryId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (entryError) {
    return fail(500, entryError.message, { user: user.id, workspace: workspaceId });
  }
  if (!entryRow) {
    return fail(404, "The entry for this photo has not synced yet", { user: user.id, workspace: workspaceId });
  }
  const entryLocalDate = typeof entryRow.local_date === "string" && localDatePattern.test(entryRow.local_date) ? entryRow.local_date : localDate;

  const buffer = Buffer.from(await file.arrayBuffer());
  let thumbnail;
  try {
    thumbnail = await makePhotoThumbnail(buffer);
  } catch {
    return fail(415, "Photo data could not be read as an image", { user: user.id, workspace: workspaceId });
  }

  const storagePath = `${workspaceId}/${entryLocalDate}/${photoId}.${extension}`;
  const thumbnailPath = `${workspaceId}/${entryLocalDate}/${photoId}-thumb.${thumbnail.extension}`;

  const { error: photoError } = await supabase.storage.from("journal-photos").upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true
  });
  if (photoError) {
    return fail(500, photoError.message, { user: user.id, workspace: workspaceId });
  }

  const { error: thumbError } = await supabase.storage.from("journal-thumbnails").upload(thumbnailPath, thumbnail.buffer, {
    contentType: thumbnail.contentType,
    upsert: true
  });
  if (thumbError) {
    return fail(500, thumbError.message, { user: user.id, workspace: workspaceId });
  }

  // Metadata lands only after both storage writes succeeded, mirroring the
  // sync route's ordering; the follow-up delta sync reconciles caption and
  // order through the transactional RPC.
  const { error: rowError } = await supabase.from("photo_attachments").upsert(
    {
      id: photoId,
      entry_id: entryId,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      caption,
      sort_order: sortOrder,
      byte_size: buffer.byteLength
    },
    { onConflict: "id" }
  );
  if (rowError) {
    return fail(500, rowError.message, { user: user.id, workspace: workspaceId });
  }

  const [photoSigned, thumbSigned] = await Promise.all([
    supabase.storage.from("journal-photos").createSignedUrl(storagePath, signedUrlSeconds),
    supabase.storage.from("journal-thumbnails").createSignedUrl(thumbnailPath, signedUrlSeconds)
  ]);
  const previewUrl = photoSigned.data?.signedUrl;
  const thumbnailUrl = thumbSigned.data?.signedUrl;
  if (!previewUrl || !thumbnailUrl) {
    return fail(500, "The stored photo could not be signed for preview", { user: user.id, workspace: workspaceId });
  }

  return NextResponse.json({ storagePath, thumbnailPath, previewUrl, thumbnailUrl });
}

async function getWorkspaceMutationAccess(
  supabase: SupabaseServerClient,
  workspaceId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("invitation_state", "accepted")
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!canMutateWorkspaceRole(data?.role)) {
    return { ok: false, status: 403, message: "Editor access is required to add photos to this workspace" };
  }

  return { ok: true };
}
