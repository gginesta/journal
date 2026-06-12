import { NextResponse } from "next/server";
import { canMutateWorkspaceRole } from "@/lib/journal-sync-safety";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("journal/delete-workspace-entries", status, message, context);
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

  const { workspaceId } = (await request.json()) as { workspaceId?: string };
  if (!workspaceId) {
    return fail(400, "workspaceId is required", { user: user.id });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("invitation_state", "accepted")
    .maybeSingle();

  if (membershipError) {
    return fail(500, membershipError.message, { user: user.id, workspace: workspaceId });
  }

  if (!canMutateWorkspaceRole(membership?.role)) {
    return fail(403, "Editor access is required to delete workspace entries", { user: user.id, workspace: workspaceId });
  }

  const { error } = await supabase.from("journal_entries").delete().eq("workspace_id", workspaceId);
  if (error) {
    return fail(500, error.message, { user: user.id, workspace: workspaceId });
  }

  return NextResponse.json({ ok: true });
}
