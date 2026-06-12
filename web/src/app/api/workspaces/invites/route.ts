import { NextResponse } from "next/server";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("workspaces/invites", status, message, context);
  return NextResponse.json({ error: message }, { status });
}

// Accept or decline the caller's own pending workspace invite.
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

  let body: { workspaceId?: string; accept?: boolean };
  try {
    body = (await request.json()) as { workspaceId?: string; accept?: boolean };
  } catch {
    return fail(400, "Request body must be valid JSON", { user: user.id });
  }

  if (!body.workspaceId || typeof body.accept !== "boolean") {
    return fail(400, "workspaceId and accept are required", { user: user.id });
  }

  const { error } = await supabase.rpc("respond_to_workspace_invite", {
    target_workspace_id: body.workspaceId,
    accept: body.accept
  });

  if (error) {
    return fail(400, error.message, { user: user.id, workspace: body.workspaceId });
  }

  return NextResponse.json({ ok: true, accepted: body.accept });
}
