import { NextResponse } from "next/server";
import { isExperienceMode } from "@/lib/experience-mode";
import { logApiFailure } from "@/lib/server-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Profile-scoped preference writes (currently just the Simple/Full experience
// mode). Deliberately separate from /api/journal/sync: the mode is per-user
// presentation state, not workspace journal content, and RLS
// (profiles_self_update) scopes the update to the caller's own row.

function fail(status: number, message: string, context: Record<string, string | undefined> = {}) {
  logApiFailure("profile", status, message, context);
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    return fail(400, "Profile payload must be valid JSON", { user: user.id });
  }

  if (!isRecord(body) || !isExperienceMode(body.experienceMode)) {
    return fail(400, "experienceMode must be 'simple' or 'full'", { user: user.id });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ experience_mode: body.experienceMode })
    .eq("id", user.id);
  if (error) {
    return fail(500, error.message, { user: user.id });
  }

  return NextResponse.json({ ok: true });
}
