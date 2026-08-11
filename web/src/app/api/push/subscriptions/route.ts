import { NextResponse } from "next/server";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxEndpointLength = 1_000;
const maxKeyLength = 300;
const maxUserAgentLength = 300;

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("push/subscriptions", status, message, context);
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEndpoint(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("https://") && value.length <= maxEndpointLength;
}

function isKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxKeyLength;
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
    return fail(400, "Subscription payload must be valid JSON", { user: user.id });
  }

  if (!isRecord(body) || typeof body.workspaceId !== "string" || !uuidPattern.test(body.workspaceId)) {
    return fail(400, "workspaceId must be a valid id", { user: user.id });
  }
  const workspaceId = body.workspaceId;
  if (!isEndpoint(body.endpoint)) {
    return fail(400, "endpoint must be an https push endpoint", { user: user.id });
  }
  if (!isRecord(body.keys) || !isKey(body.keys.p256dh) || !isKey(body.keys.auth)) {
    return fail(400, "keys.p256dh and keys.auth are required", { user: user.id });
  }
  const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, maxUserAgentLength) : null;

  // Any accepted member may receive reminders for the workspace — subscribing
  // a device is personal and does not edit shared journal content.
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
  if (!membership) {
    return fail(403, "Workspace membership is required for reminders", { user: user.id, workspace: workspaceId });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      workspace_id: workspaceId,
      endpoint: body.endpoint,
      keys_p256dh: body.keys.p256dh,
      keys_auth: body.keys.auth,
      user_agent: userAgent
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return fail(500, error.message, { user: user.id, workspace: workspaceId });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
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
    return fail(400, "Subscription payload must be valid JSON", { user: user.id });
  }

  if (!isRecord(body) || !isEndpoint(body.endpoint)) {
    return fail(400, "endpoint must be an https push endpoint", { user: user.id });
  }

  // RLS already scopes deletes to the caller's rows; the explicit user filter
  // keeps the intent obvious.
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
  if (error) {
    return fail(500, error.message, { user: user.id });
  }

  return NextResponse.json({ ok: true });
}
