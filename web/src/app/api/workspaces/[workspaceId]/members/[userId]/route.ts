import { NextResponse } from "next/server";
import type { WorkspaceRole } from "@/types/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ workspaceId: string; userId: string }>;
};

const workspaceRoles: WorkspaceRole[] = ["owner", "editor", "viewer"];

export async function PATCH(request: Request, { params }: RouteContext) {
  const { workspaceId, userId } = await params;
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

  if (user.id === userId) {
    return NextResponse.json({ error: "Ask another owner to change your role" }, { status: 400 });
  }

  const { role } = (await request.json()) as { role?: WorkspaceRole };
  if (!role || !workspaceRoles.includes(role)) {
    return NextResponse.json({ error: "A valid role is required" }, { status: 400 });
  }

  const ownerError = await requireWorkspaceOwner(workspaceId, user.id);
  if (ownerError) return ownerError;

  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { workspaceId, userId } = await params;
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

  if (user.id === userId) {
    return NextResponse.json({ error: "Ask another owner to remove you" }, { status: 400 });
  }

  const ownerError = await requireWorkspaceOwner(workspaceId, user.id);
  if (ownerError) return ownerError;

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function requireWorkspaceOwner(workspaceId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("invitation_state", "accepted")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.role !== "owner") {
    return NextResponse.json({ error: "Only workspace owners can manage household members" }, { status: 403 });
  }

  return null;
}
