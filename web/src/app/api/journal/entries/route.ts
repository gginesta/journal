import { NextResponse } from "next/server";
import { createPhotoUrlMap, mapEntry, type EntryRow } from "@/lib/bootstrap";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 120;
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("journal/entries", status, message, context);
  return NextResponse.json({ error: message }, { status });
}

// Older-archive page: entries strictly before `before` (a local date), newest
// first. The bootstrap loads the recent window eagerly; this fills history on
// demand for Memories/Calendar browsing.
export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  const before = url.searchParams.get("before") ?? "";
  if (!uuidPattern.test(workspaceId) || !localDatePattern.test(before)) {
    return fail(400, "workspaceId and a before date are required", { user: user.id });
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select(`
      *,
      journal_sessions(*, prompt_responses(*)),
      photo_attachments(*),
      memory_details(*, detail_person_tags(person_tag_id)),
      entry_person_tags(person_tag_id)
    `)
    .eq("workspace_id", workspaceId)
    .lt("local_date", before)
    .order("local_date", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error) {
    return fail(500, error.message, { user: user.id, workspace: workspaceId });
  }

  const rows = (data ?? []) as EntryRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const signedPhotoUrls = await createPhotoUrlMap(page);

  return NextResponse.json({
    entries: page.map((row) => mapEntry(row, signedPhotoUrls)),
    hasMore
  });
}
