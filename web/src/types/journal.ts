export type WorkspaceKind = "personal" | "household";
export type WorkspaceRole = "owner" | "editor" | "viewer";
export type WorkspaceInvitationState = "invited" | "accepted";
export type SessionKind = "morning" | "evening" | "anytime";
export type RitualCadence = "evening" | "once_daily" | "morning_evening" | "anytime";
export type Mood = "low" | "quiet" | "good" | "bright" | "glowing";

export type Profile = {
  id: string;
  email: string;
  displayName: string;
};

export type Workspace = {
  id: string;
  name: string;
  kind: WorkspaceKind;
  role: WorkspaceRole;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  email: string;
  displayName: string;
  role: WorkspaceRole;
  invitationState: WorkspaceInvitationState;
  invitedEmail: string;
  createdAt: string;
  isCurrentUser: boolean;
};

export type PersonTag = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  sortOrder: number;
  isDefault: boolean;
};

export type PromptTemplate = {
  id: string;
  workspaceId: string;
  title: string;
  prompt: string;
  sortOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
};

export type PromptResponse = {
  id: string;
  promptId: string;
  promptTitle: string;
  promptText: string;
  promptOrder: number;
  text: string;
};

export type JournalSession = {
  id: string;
  kind: SessionKind;
  responses: PromptResponse[];
  // Member who owns this section of the day; null/absent for legacy rows.
  createdBy?: string | null;
};

export type PhotoAttachment = {
  id: string;
  entryId: string;
  storagePath: string;
  thumbnailPath: string;
  previewUrl: string;
  // Signed thumbnail URL for small renditions. Derived presentation data like
  // previewUrl — never serialized into the sync payload or dirty check. Absent
  // for just-added photos and demo fixtures; renderers fall back to previewUrl.
  thumbnailUrl?: string;
  caption: string;
  sortOrder: number;
  createdAt: string;
};

export type MemoryDetail = {
  id: string;
  entryId: string;
  text: string;
  category: "phrase" | "favorite" | "routine" | "milestone" | "quote" | "note";
  sortOrder: number;
  personTagIds: string[];
};

export type JournalEntry = {
  id: string;
  workspaceId: string;
  localDate: string;
  mood: Mood;
  note: string;
  sessions: JournalSession[];
  photos: PhotoAttachment[];
  personTagIds: string[];
  details: MemoryDetail[];
  createdAt: string;
  updatedAt: string;
  // Server updated_at the client last loaded for this entry; the sync route
  // uses it as the stale-write baseline. Absent for entries never synced.
  syncedAt?: string | null;
};

export type ReminderPreferences = {
  cadence: RitualCadence;
  remindersEnabled: boolean;
  eveningTime: string;
  morningTime: string;
  // IANA zone the times were chosen in (saved when reminder settings are
  // edited). Null/absent means the dispatcher treats the times as UTC.
  timezone?: string | null;
};

export type PendingWorkspaceInvite = {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
};

export type JournalBootstrap = {
  mode: "demo" | "supabase";
  // Set when an authenticated user's workspaces could not be loaded. /app
  // renders an explicit recovery screen instead of the journal — never demo
  // fixtures.
  workspaceUnavailable?: boolean;
  profile: Profile | null;
  pendingInvites: PendingWorkspaceInvite[];
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  activeWorkspaceId: string;
  people: PersonTag[];
  prompts: PromptTemplate[];
  entries: JournalEntry[];
  reminders: ReminderPreferences;
};

export type MemoryMatch = {
  id: string;
  label: string;
  targetDate: string;
  entryId: string;
  entryDate: string;
  dayDistance: number;
};
