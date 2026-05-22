export type WorkspaceKind = "personal" | "household";
export type WorkspaceRole = "owner" | "editor" | "viewer";
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
};

export type PhotoAttachment = {
  id: string;
  entryId: string;
  storagePath: string;
  thumbnailPath: string;
  previewUrl: string;
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
};

export type ReminderPreferences = {
  cadence: RitualCadence;
  remindersEnabled: boolean;
  eveningTime: string;
  morningTime: string;
};

export type JournalBootstrap = {
  mode: "demo" | "supabase";
  profile: Profile | null;
  workspaces: Workspace[];
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
