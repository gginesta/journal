import { NextResponse } from "next/server";
import type { WorkspaceMember, WorkspaceRole } from "@/types/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invite_email: string | null;
  invitation_state: "invited" | "accepted";
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
};

const workspaceRoles: WorkspaceRole[] = ["owner", "editor", "viewer"];

export async function GET(_request: Request, { params }: RouteContext) {
  const { workspaceId } = await params;
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

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id,user_id,role,invite_email,invitation_state,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as WorkspaceMemberRow[];
  const profiles = await loadProfiles(rows.map((member) => member.user_id));

  // Pending email invites (no account yet) show alongside pending member
  // invites, indistinguishably, so the list reveals nothing about which
  // emails have accounts.
  const { data: inviteRows } = await supabase
    .from("workspace_invites")
    .select("workspace_id,email,role,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const emailInvites = ((inviteRows ?? []) as Array<{ workspace_id: string; email: string; role: WorkspaceRole; created_at: string }>).map<WorkspaceMember>(
    (invite) => ({
      workspaceId: invite.workspace_id,
      userId: "",
      email: invite.email,
      displayName: invite.email,
      role: invite.role,
      invitationState: "invited",
      invitedEmail: invite.email,
      createdAt: invite.created_at,
      isCurrentUser: false
    })
  );

  return NextResponse.json({ members: [...rows.map((member) => mapMember(member, profiles, user.id)), ...emailInvites] });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { workspaceId } = await params;
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

  const { email, role } = (await request.json()) as { email?: string; role?: WorkspaceRole };
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (!normalizedEmail || !role || !workspaceRoles.includes(role)) {
    return NextResponse.json({ error: "email and a valid role are required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("invite_workspace_member", {
    target_workspace_id: workspaceId,
    target_email: normalizedEmail,
    target_role: role
  });

  if (error) {
    const status = error.message.includes("Only workspace owners") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  const rows = (data ?? []) as WorkspaceMemberRow[];
  const profiles = await loadProfiles(rows.map((member) => member.user_id));
  const member = rows[0] ? mapMember(rows[0], profiles, user.id) : null;

  return NextResponse.json({ member });
}

async function loadProfiles(userIds: string[]): Promise<Map<string, ProfileRow>> {
  const supabase = await createSupabaseServerClient();
  const uniqueIds = Array.from(new Set(userIds));
  const profiles = new Map<string, ProfileRow>();
  if (!supabase || uniqueIds.length === 0) return profiles;

  const { data } = await supabase.from("profiles").select("id,email,display_name").in("id", uniqueIds);
  for (const profile of (data ?? []) as ProfileRow[]) {
    profiles.set(profile.id, profile);
  }
  return profiles;
}

function mapMember(row: WorkspaceMemberRow, profiles: Map<string, ProfileRow>, currentUserId: string): WorkspaceMember {
  const profile = profiles.get(row.user_id);
  const email = row.invite_email ?? profile?.email ?? "";
  return {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    email,
    displayName: profile?.display_name || email || "Workspace member",
    role: row.role,
    invitationState: row.invitation_state,
    invitedEmail: row.invite_email ?? "",
    createdAt: row.created_at,
    isCurrentUser: row.user_id === currentUserId
  };
}
