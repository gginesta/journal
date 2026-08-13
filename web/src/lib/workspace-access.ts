import { canMutateWorkspaceRole } from "@/lib/journal-sync-safety";
import type { SupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceAccessCheck = { ok: true } | { ok: false; status: number; message: string };

// Shared editor-role gate for journal mutation routes (sync, photos). The
// denial message names the action so route errors stay specific.
export async function getWorkspaceMutationAccess(
  supabase: SupabaseServerClient,
  workspaceId: string,
  userId: string,
  deniedMessage: string
): Promise<WorkspaceAccessCheck> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("invitation_state", "accepted")
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!canMutateWorkspaceRole(data?.role)) {
    return { ok: false, status: 403, message: deniedMessage };
  }

  return { ok: true };
}
