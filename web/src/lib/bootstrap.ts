import type {
  JournalBootstrap,
  JournalEntry,
  PendingWorkspaceInvite,
  PersonTag,
  Profile,
  PromptTemplate,
  ReminderPreferences,
  Workspace,
  WorkspaceMember
} from "@/types/journal";
import { makeDemoBootstrap } from "@/data/demo";
import { eagerEntryWindows } from "@/lib/journal-logic";
import { isDemoMode } from "@/lib/supabase/env";
import { createSupabaseServerClient, type SupabaseServerClient } from "@/lib/supabase/server";

type WorkspaceRow = {
  id: string;
  name: string;
  kind: "personal" | "household";
  workspace_members: Array<{ role: "owner" | "editor" | "viewer" }>;
};

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  invite_email: string | null;
  invitation_state: "invited" | "accepted";
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
};

type PersonRow = {
  id: string;
  workspace_id: string;
  name: string;
  color_hex: string;
  sort_order: number;
  is_default: boolean;
};

type PromptRow = {
  id: string;
  workspace_id: string;
  title: string;
  prompt: string;
  sort_order: number;
  is_enabled: boolean;
  is_default: boolean;
};

type PhotoRow = {
  id: string;
  entry_id: string;
  storage_path: string;
  thumbnail_path: string;
  public_url?: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type PromptResponseRow = {
  id: string;
  prompt_id: string;
  prompt_title: string;
  prompt_text: string;
  prompt_order: number;
  text: string | null;
};

type SessionRow = {
  id: string;
  kind: "morning" | "evening" | "anytime";
  created_by?: string | null;
  prompt_responses?: PromptResponseRow[];
};

type PersonLinkRow = {
  person_tag_id: string;
};

type DetailRow = {
  id: string;
  entry_id: string;
  text: string;
  category: "phrase" | "favorite" | "routine" | "milestone" | "quote" | "note";
  sort_order: number;
  detail_person_tags?: PersonLinkRow[];
};

export type EntryRow = {
  id: string;
  workspace_id: string;
  local_date: string;
  mood: "low" | "quiet" | "good" | "bright" | "glowing";
  note: string | null;
  created_at: string;
  updated_at: string;
  journal_sessions?: SessionRow[];
  photo_attachments?: PhotoRow[];
  memory_details?: DetailRow[];
  entry_person_tags?: PersonLinkRow[];
};

type ReminderRow = {
  cadence?: ReminderPreferences["cadence"];
  reminders_enabled?: boolean;
  evening_time?: string;
  morning_time?: string;
};

export async function loadJournalBootstrap(): Promise<JournalBootstrap> {
  if (isDemoMode()) {
    return makeDemoBootstrap();
  }

  const supabase = await createSupabaseServerClient();
  // Unreachable while isDemoMode() covers missing Supabase env, but never
  // fall back to demo fixtures outside demo mode.
  if (!supabase) return makeUnavailableBootstrap(null);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { ...makeDemoBootstrap(), mode: "supabase", profile: null, pendingInvites: [] };
  }

  const [
    profileResult,
    workspaceResult,
    pendingInviteResult
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("workspaces")
      .select("id,name,kind,workspace_members!inner(role)")
      .eq("workspace_members.user_id", user.id)
      .eq("workspace_members.invitation_state", "accepted")
      .order("created_at", { ascending: true }),
    supabase
      .from("workspace_members")
      .select("workspace_id,role,workspaces(name)")
      .eq("user_id", user.id)
      .eq("invitation_state", "invited")
      .order("created_at", { ascending: true })
  ]);

  type PendingInviteRow = { workspace_id: string; role: Workspace["role"]; workspaces: { name: string } | Array<{ name: string }> | null };
  const pendingInvites = ((pendingInviteResult.data ?? []) as unknown as PendingInviteRow[]).map((invite) => {
    const workspaceRelation = Array.isArray(invite.workspaces) ? invite.workspaces[0] : invite.workspaces;
    return {
      workspaceId: invite.workspace_id,
      workspaceName: workspaceRelation?.name ?? "A shared journal",
      role: invite.role
    };
  });

  const workspaces = ((workspaceResult.data ?? []) as WorkspaceRow[]).map<Workspace>((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind,
    role: workspace.workspace_members[0]?.role ?? "viewer"
  }));

  const profile: Profile = {
    id: user.id,
    email: user.email ?? profileResult.data?.email ?? "",
    displayName: profileResult.data?.display_name ?? user.email ?? "Journal user"
  };

  const activeWorkspaceId = workspaces[0]?.id;
  if (!activeWorkspaceId) {
    // An authenticated user must never see demo fixtures: signal the failure
    // so /app renders a recovery screen instead.
    return makeUnavailableBootstrap(profile, pendingInvites);
  }

  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const [membersResult, peopleResult, promptsResult, entriesResult, remindersResult] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id,user_id,role,invite_email,invitation_state,created_at")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: true }),
    supabase.from("person_tags").select("*").eq("workspace_id", activeWorkspaceId).order("sort_order"),
    supabase.from("prompt_templates").select("*").eq("workspace_id", activeWorkspaceId).order("sort_order"),
    supabase
      .from("journal_entries")
      .select(`
        *,
        journal_sessions(*, prompt_responses(*)),
        photo_attachments(*),
        memory_details(*, detail_person_tags(person_tag_id)),
        entry_person_tags(person_tag_id)
      `)
      .eq("workspace_id", activeWorkspaceId)
      // Eager windows: last 12 months plus the 2y/3y anniversary slices for
      // Memory Lane. The cap is a runaway-data safety net (~370 daily
      // entries/year), not an expected limit.
      .or(
        eagerEntryWindows()
          .map((window) => (window.to ? `and(local_date.gte.${window.from},local_date.lte.${window.to})` : `local_date.gte.${window.from}`))
          .join(",")
      )
      .order("local_date", { ascending: false })
      .limit(500),
    supabase.from("reminder_preferences").select("*").eq("workspace_id", activeWorkspaceId).maybeSingle()
  ]);

  const rawEntries = (entriesResult.data ?? []) as EntryRow[];
  const memberRows = (membersResult.data ?? []) as WorkspaceMemberRow[];
  const [signedPhotoUrls, memberProfiles] = await Promise.all([
    createPhotoUrlMap(supabase, rawEntries),
    loadMemberProfiles(supabase, memberRows.map((member) => member.user_id))
  ]);

  return {
    mode: "supabase",
    pendingInvites,
    profile,
    workspaces,
    workspaceMembers: memberRows.map((member) => mapWorkspaceMember(member, memberProfiles, user.id)),
    activeWorkspaceId,
    people: ((peopleResult.data ?? []) as PersonRow[]).map(mapPerson),
    prompts: ((promptsResult.data ?? []) as PromptRow[]).map(mapPrompt),
    entries: rawEntries.map((entry) => mapEntry(entry, signedPhotoUrls)),
    reminders: mapReminders(remindersResult.data as ReminderRow | null)
  };
}

function makeUnavailableBootstrap(profile: Profile | null, pendingInvites: PendingWorkspaceInvite[] = []): JournalBootstrap {
  return {
    mode: "supabase",
    workspaceUnavailable: true,
    profile,
    pendingInvites,
    workspaces: [],
    workspaceMembers: [],
    activeWorkspaceId: "",
    people: [],
    prompts: [],
    entries: [],
    reminders: mapReminders(null)
  };
}

async function loadMemberProfiles(supabase: SupabaseServerClient, userIds: string[]): Promise<Map<string, ProfileRow>> {
  const uniqueIds = Array.from(new Set(userIds));
  const profiles = new Map<string, ProfileRow>();
  if (uniqueIds.length === 0) return profiles;

  const { data } = await supabase.from("profiles").select("id,email,display_name").in("id", uniqueIds);
  for (const profile of (data ?? []) as ProfileRow[]) {
    profiles.set(profile.id, profile);
  }
  return profiles;
}

function mapWorkspaceMember(row: WorkspaceMemberRow, profiles: Map<string, ProfileRow>, currentUserId: string): WorkspaceMember {
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

function mapPerson(row: PersonRow): PersonTag {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color_hex,
    sortOrder: row.sort_order,
    isDefault: row.is_default
  };
}

function mapPrompt(row: PromptRow): PromptTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    prompt: row.prompt,
    sortOrder: row.sort_order,
    isEnabled: row.is_enabled,
    isDefault: row.is_default
  };
}

// One map keyed by storage path, covering both the full-size photos and their
// thumbnails (paths never collide: thumbnails carry a `-thumb` suffix).
export async function createPhotoUrlMap(supabase: SupabaseServerClient, entries: EntryRow[]): Promise<Map<string, string>> {
  const photos = entries.flatMap((entry) => entry.photo_attachments ?? []);
  const urls = new Map<string, string>();

  async function signPaths(bucket: string, paths: string[]) {
    if (paths.length === 0) return;
    // 24 h: these quasi-bearer links land in server-rendered HTML, and both
    // bootstrap and archive paging re-sign on every load anyway.
    const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 24);
    for (const result of data ?? []) {
      if (result.path && result.signedUrl && !result.error) urls.set(result.path, result.signedUrl);
    }
  }

  await Promise.all([
    signPaths("journal-photos", photos.map((photo) => photo.storage_path).filter(Boolean)),
    signPaths("journal-thumbnails", photos.map((photo) => photo.thumbnail_path).filter(Boolean))
  ]);
  return urls;
}

export function mapEntry(row: EntryRow, signedPhotoUrls = new Map<string, string>()): JournalEntry {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    localDate: row.local_date,
    mood: row.mood,
    note: row.note ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    personTagIds: (row.entry_person_tags ?? []).map((link) => link.person_tag_id),
    photos: (row.photo_attachments ?? []).map((photo) => {
      const previewUrl = signedPhotoUrls.get(photo.storage_path) ?? "";
      return {
        id: photo.id,
        entryId: photo.entry_id,
        storagePath: photo.storage_path,
        thumbnailPath: photo.thumbnail_path,
        previewUrl,
        // Photos from before thumbnail generation may have no thumbnail yet.
        thumbnailUrl: signedPhotoUrls.get(photo.thumbnail_path) || previewUrl,
        caption: photo.caption ?? "",
        sortOrder: photo.sort_order,
        createdAt: photo.created_at
      };
    }),
    sessions: (row.journal_sessions ?? []).map((session) => ({
      id: session.id,
      kind: session.kind,
      createdBy: session.created_by ?? null,
      responses: (session.prompt_responses ?? []).map((response) => ({
        id: response.id,
        promptId: response.prompt_id,
        promptTitle: response.prompt_title,
        promptText: response.prompt_text,
        promptOrder: response.prompt_order,
        text: response.text ?? ""
      }))
    })),
    details: (row.memory_details ?? []).map((detail) => ({
      id: detail.id,
      entryId: detail.entry_id,
      text: detail.text,
      category: detail.category,
      sortOrder: detail.sort_order,
      personTagIds: (detail.detail_person_tags ?? []).map((link) => link.person_tag_id)
    }))
  };
}

function mapReminders(row: ReminderRow | null): ReminderPreferences {
  return {
    cadence: row?.cadence ?? "evening",
    remindersEnabled: row?.reminders_enabled ?? false,
    eveningTime: row?.evening_time ?? "21:00",
    morningTime: row?.morning_time ?? "08:30"
  };
}
