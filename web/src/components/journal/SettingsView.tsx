import { useState } from "react";
import { Download, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";
import type {
  JournalEntry,
  PersonTag,
  PromptTemplate,
  ReminderPreferences,
  RitualCadence,
  Workspace,
  WorkspaceMember,
  WorkspaceRole
} from "@/types/journal";
import { SharedJournalCopy } from "@/components/wow/SharedJournalCopy";
import { responseErrorMessage } from "@/components/journal/helpers";
import { PageHeader } from "@/components/journal/shared";

export function SettingsView({
  profile,
  mode,
  workspaces,
  activeWorkspaceId,
  workspaceMembers,
  reminders,
  prompts,
  people,
  entries,
  canEdit,
  setWorkspaceMembers,
  setActiveWorkspaceId,
  setReminders,
  setPrompts,
  setPeople,
  addWorkspace,
  deleteWorkspaceData,
  signOut,
  replayOnboarding,
  appVersion
}: {
  profile: { email: string; displayName: string } | null;
  mode: "demo" | "supabase";
  workspaces: Workspace[];
  activeWorkspaceId: string;
  workspaceMembers: WorkspaceMember[];
  reminders: ReminderPreferences;
  prompts: PromptTemplate[];
  people: PersonTag[];
  entries: JournalEntry[];
  canEdit: boolean;
  setWorkspaceMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
  setActiveWorkspaceId: (id: string) => void;
  setReminders: (preferences: ReminderPreferences) => void;
  setPrompts: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  setPeople: React.Dispatch<React.SetStateAction<PersonTag[]>>;
  addWorkspace: (kind: "personal" | "household") => void;
  deleteWorkspaceData: () => void;
  signOut: () => void;
  replayOnboarding: () => void;
  appVersion: string;
}) {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader title="Settings" subtitle="Plain controls for privacy, prompts, people, export, and household access." />
      <SettingsSection title="Account">
        <p className="text-warm-gray">{profile?.email ?? "Local demo user"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={replayOnboarding} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rose/10 px-4 text-sm font-bold text-rose">
            <Sparkles aria-hidden="true" size={16} />
            Replay welcome
          </button>
          <button onClick={signOut} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white">
            <LogOut aria-hidden="true" size={16} />
            Sign out
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Workspaces">
        <SharedJournalCopy workspace={activeWorkspace} people={people} />
        {activeWorkspace ? (
          <p className="mb-3 text-sm leading-6 text-warm-gray">
            {workspaceRoleCopy(activeWorkspace.role)}
          </p>
        ) : null}
        <select
          value={activeWorkspaceId}
          onChange={(event) => setActiveWorkspaceId(event.target.value)}
          className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-semibold outline-none"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => addWorkspace("personal")} className="rounded-full bg-journal-raised px-4 py-2 text-sm font-bold">Add personal journal</button>
          <button onClick={() => addWorkspace("household")} className="rounded-full bg-rose/10 px-4 py-2 text-sm font-bold text-rose">Add household journal</button>
        </div>
      </SettingsSection>

              <HouseholdSharingPanel
                mode={mode}
                workspace={activeWorkspace}
                people={people}
                members={workspaceMembers}
                setWorkspaceMembers={setWorkspaceMembers}
              />

      <SettingsSection title="Reminders">
        {!canEdit ? <ReadOnlySettingsCopy /> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold text-soft-ink">
            Cadence
            <select
              value={reminders.cadence}
              disabled={!canEdit}
              onChange={(event) => setReminders({ ...reminders, cadence: event.target.value as RitualCadence })}
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-normal outline-none"
            >
              <option value="evening">Evening</option>
              <option value="once_daily">Once daily</option>
              <option value="morning_evening">Morning + evening</option>
              <option value="anytime">Anytime</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-soft-ink">
            Evening
            <input
              type="time"
              value={reminders.eveningTime}
              disabled={!canEdit}
              onChange={(event) => setReminders({ ...reminders, eveningTime: event.target.value })}
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-normal outline-none"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-soft-ink">
            Morning
            <input
              type="time"
              value={reminders.morningTime}
              disabled={!canEdit}
              onChange={(event) => setReminders({ ...reminders, morningTime: event.target.value })}
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-normal outline-none"
            />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Prompts">
        {!canEdit ? <ReadOnlySettingsCopy /> : null}
        <div className="grid gap-3">
          {prompts.map((prompt) => (
            <input
              key={prompt.id}
              value={prompt.prompt}
              readOnly={!canEdit}
              onChange={(event) =>
                setPrompts((current) =>
                  current.map((candidate) => (candidate.id === prompt.id ? { ...candidate, prompt: event.target.value } : candidate))
                )
              }
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 outline-none focus:ring-4 focus:ring-rose/15"
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="People Tags">
        {!canEdit ? <ReadOnlySettingsCopy /> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((person) => (
            <input
              key={person.id}
              value={person.name}
              readOnly={!canEdit}
              onChange={(event) =>
                setPeople((current) =>
                  current.map((candidate) => (candidate.id === person.id ? { ...candidate, name: event.target.value } : candidate))
                )
              }
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 outline-none focus:ring-4 focus:ring-rose/15"
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Data">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadJson("photo-gratitude-export.json", entries)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white"
          >
            <Download aria-hidden="true" size={16} />
            Export JSON
          </button>
          <button
            onClick={() => {
              if (window.confirm("Delete all entries in this workspace? This cannot be undone in the current beta.")) deleteWorkspaceData();
            }}
            disabled={!canEdit}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-journal-raised px-4 text-sm font-bold text-rose"
          >
            <Trash2 aria-hidden="true" size={16} />
            Delete workspace entries
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Beta">
        <div className="grid gap-2 text-sm text-warm-gray">
          <p>
            App version <span className="font-bold text-soft-ink">{appVersion}</span>
          </p>
          <p>Use this version in QA notes when reporting household sharing, sync, or photo issues.</p>
        </div>
      </SettingsSection>
    </div>
  );
}

const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer"
};

const workspaceRoleOptions: WorkspaceRole[] = ["owner", "editor", "viewer"];

function workspaceRoleCopy(role: WorkspaceRole) {
  if (role === "owner") return "Owner access can invite household members, change roles, remove members, and edit journal content.";
  if (role === "editor") return "Editor access can add and change memories, prompts, people tags, and reminders. Household member controls stay with owners.";
  return "Viewer access can read this workspace. Editing, deletes, and household member controls are disabled.";
}

function ReadOnlySettingsCopy() {
  return <p className="mb-3 text-sm leading-6 text-warm-gray">Viewer access is read-only for this workspace.</p>;
}

export function ReadOnlyNotice() {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-4 text-sm leading-6 text-warm-gray">
      Viewer access is read-only for this workspace. Memories, prompts, people tags, photos, and deletes are disabled.
    </section>
  );
}

function HouseholdSharingPanel({
  mode,
  workspace,
  people,
  members,
  setWorkspaceMembers
}: {
  mode: "demo" | "supabase";
  workspace: Workspace | null;
  people: PersonTag[];
  members: WorkspaceMember[];
  setWorkspaceMembers: React.Dispatch<React.SetStateAction<WorkspaceMember[]>>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("editor");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManageMembers = workspace?.role === "owner";
  const acceptedMembers = members.filter((member) => member.invitationState === "accepted");
  const pendingInvites = members.filter((member) => member.invitationState === "invited");

  function upsertMember(nextMember: WorkspaceMember) {
    setWorkspaceMembers((current) => {
      const withoutMember = current.filter(
        (member) => !(member.workspaceId === nextMember.workspaceId && member.userId === nextMember.userId)
      );
      return [...withoutMember, nextMember];
    });
  }

  async function inviteMember() {
    if (!workspace || !canManageMembers) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter an email address.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);
    setError(null);

    if (mode === "demo") {
      upsertMember({
        workspaceId: workspace.id,
        userId: crypto.randomUUID(),
        email: normalizedEmail,
        displayName: normalizedEmail,
        role,
        invitationState: "invited",
        invitedEmail: normalizedEmail,
        createdAt: new Date().toISOString(),
        isCurrentUser: false
      });
      setEmail("");
      setStatus("Demo invite added.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, role })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Invite failed"));
      const payload = (await response.json()) as { member?: WorkspaceMember | null };
      setEmail("");
      if (payload.member) {
        upsertMember(payload.member);
        setStatus("Member added to this household workspace.");
      } else {
        setStatus("Invite recorded. They'll appear here once their account is connected — if they're new, ask them to sign in once and invite them again.");
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Invite failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateMemberRole(member: WorkspaceMember, nextRole: WorkspaceRole) {
    if (!workspace || !canManageMembers || member.isCurrentUser) return;
    setBusyMemberId(member.userId);
    setStatus(null);
    setError(null);

    if (mode === "demo") {
      setWorkspaceMembers((current) =>
        current.map((candidate) =>
          candidate.workspaceId === member.workspaceId && candidate.userId === member.userId
            ? { ...candidate, role: nextRole }
            : candidate
        )
      );
      setBusyMemberId(null);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/members/${member.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Role update failed"));
      setWorkspaceMembers((current) =>
        current.map((candidate) =>
          candidate.workspaceId === member.workspaceId && candidate.userId === member.userId
            ? { ...candidate, role: nextRole }
            : candidate
        )
      );
      setStatus("Member role updated.");
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Role update failed");
    } finally {
      setBusyMemberId(null);
    }
  }

  async function removeMember(member: WorkspaceMember) {
    if (!workspace || !canManageMembers || member.isCurrentUser) return;
    setBusyMemberId(member.userId);
    setStatus(null);
    setError(null);

    if (mode === "demo") {
      setWorkspaceMembers((current) =>
        current.filter((candidate) => !(candidate.workspaceId === member.workspaceId && candidate.userId === member.userId))
      );
      setBusyMemberId(null);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/members/${member.userId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Remove failed"));
      setWorkspaceMembers((current) =>
        current.filter((candidate) => !(candidate.workspaceId === member.workspaceId && candidate.userId === member.userId))
      );
      setStatus("Member removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Remove failed");
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <SettingsSection title="Household Sharing">
      <div className="grid gap-4">
        <SharedJournalCopy workspace={workspace} people={people} />

        <div>
          <p className="text-sm leading-6 text-warm-gray">
            {workspace?.kind === "household"
              ? canManageMembers
                ? "Invite someone by email and choose how much they can change. For this beta, ask them to sign in once before you add them."
                : "Only owners can invite people or change household roles."
              : "Household sharing is available from a household journal."}
          </p>
          {mode === "supabase" ? (
            <p className="mt-1 text-xs font-semibold text-warm-gray">
              Invitees need an existing account in this beta; no service role or auth metadata is used for access decisions.
            </p>
          ) : null}
        </div>

        {workspace?.kind === "household" ? (
          <div className="grid gap-3 rounded-2xl bg-journal-raised p-3 sm:grid-cols-[1fr_150px_auto]">
            <input
              type="email"
              value={email}
              disabled={!canManageMembers || isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") inviteMember();
              }}
              placeholder="name@example.com"
              className="min-h-11 min-w-0 rounded-2xl border border-journal-line bg-white px-3 outline-none focus:ring-4 focus:ring-rose/15"
            />
            <select
              value={role}
              disabled={!canManageMembers || isSubmitting}
              onChange={(event) => setRole(event.target.value as WorkspaceRole)}
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-semibold outline-none"
            >
              {workspaceRoleOptions.map((option) => (
                <option key={option} value={option}>
                  {workspaceRoleLabels[option]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={inviteMember}
              disabled={!canManageMembers || isSubmitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-journal-line disabled:text-warm-gray"
            >
              <Plus aria-hidden="true" size={16} />
              Invite
            </button>
          </div>
        ) : null}

        {status ? <p className="text-sm font-semibold text-leaf">{status}</p> : null}
        {error ? <p className="text-sm font-semibold text-rose">{error}</p> : null}

        <MemberList
          title="Members"
          members={acceptedMembers}
          canManageMembers={canManageMembers}
          busyMemberId={busyMemberId}
          onUpdateRole={updateMemberRole}
          onRemoveMember={removeMember}
        />
        <MemberList
          title="Invites"
          empty="No pending invites."
          members={pendingInvites}
          canManageMembers={canManageMembers}
          busyMemberId={busyMemberId}
          onUpdateRole={updateMemberRole}
          onRemoveMember={removeMember}
        />
      </div>
    </SettingsSection>
  );
}

function MemberList({
  title,
  empty = "No members yet.",
  members,
  canManageMembers,
  busyMemberId,
  onUpdateRole,
  onRemoveMember
}: {
  title: string;
  empty?: string;
  members: WorkspaceMember[];
  canManageMembers: boolean;
  busyMemberId: string | null;
  onUpdateRole: (member: WorkspaceMember, role: WorkspaceRole) => void;
  onRemoveMember: (member: WorkspaceMember) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-warm-gray">{title}</h3>
      <div className="mt-2 grid gap-2">
        {members.length === 0 ? (
          <p className="rounded-2xl bg-journal-raised p-3 text-sm text-warm-gray">{empty}</p>
        ) : (
          members.map((member) => {
            const isBusy = busyMemberId === member.userId;
            const canChangeMember = canManageMembers && !member.isCurrentUser && !isBusy;
            return (
              <div key={`${member.workspaceId}:${member.userId}`} className="grid gap-3 rounded-2xl bg-journal-raised p-3 sm:grid-cols-[1fr_150px_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-bold text-soft-ink">
                    {member.displayName}
                    {member.isCurrentUser ? <span className="text-warm-gray"> (you)</span> : null}
                  </p>
                  <p className="truncate text-sm text-warm-gray">{member.email || member.invitedEmail || "Email hidden by privacy settings"}</p>
                </div>
                <select
                  value={member.role}
                  disabled={!canChangeMember}
                  onChange={(event) => onUpdateRole(member, event.target.value as WorkspaceRole)}
                  className="min-h-10 rounded-2xl border border-journal-line bg-white px-3 text-sm font-semibold outline-none disabled:bg-white/60 disabled:text-warm-gray"
                  aria-label={`Role for ${member.displayName}`}
                >
                  {workspaceRoleOptions.map((option) => (
                    <option key={option} value={option}>
                      {workspaceRoleLabels[option]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!canChangeMember}
                  onClick={() => onRemoveMember(member)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-bold text-rose disabled:cursor-not-allowed disabled:text-warm-gray"
                >
                  <Trash2 aria-hidden="true" size={15} />
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
