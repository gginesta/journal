import { NextResponse } from "next/server";
import { isUuid } from "@/lib/journal-sync-validation";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  if (!isRecord(body)) {
    return fail(400, "workspaceId must be a valid id", { user: user.id });
  }
  const workspaceId = body.workspaceId;
  if (!isUuid(workspaceId)) {
    return fail(400, "workspaceId must be a valid id", { user: user.id });
  }
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

  // A browser hands every signed-in user the same push endpoint, so on a
  // shared device the endpoint row may currently belong to a different user.
  // RLS would reject updating their row; the write goes through the
  // service-role client instead — safe because auth and workspace membership
  // were verified above with the caller's own client.
  const subscriptionRow = {
    user_id: user.id,
    workspace_id: workspaceId,
    endpoint: body.endpoint,
    keys_p256dh: body.keys.p256dh,
    keys_auth: body.keys.auth,
    user_agent: userAgent
  };
  const admin = createSupabaseAdminClient();
  const { error } = admin
    ? await admin.from("push_subscriptions").upsert(subscriptionRow, { onConflict: "endpoint" })
    : await supabase.from("push_subscriptions").upsert(subscriptionRow, { onConflict: "endpoint" });
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
