"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  JournalBootstrap,
  JournalEntry,
  MemoryDetail,
  PersonTag,
  PromptResponse,
  PromptTemplate,
  ReminderPreferences,
  RitualCadence,
  Workspace
} from "@/types/journal";
import { toLocalDate } from "@/lib/dates";
import {
  applyOnboardingSetupToPeople,
  onboardingStorageKey,
  workspaceHasMeaningfulData,
  type OnboardingSetup
} from "@/lib/onboarding";
import { demoStorageFullMessage, writeDemoStateToStorage } from "@/lib/demo-storage";
import { selectDirtyEntries, serializeEntryForSync } from "@/lib/journal-sync-delta";
import { canMutateWorkspaceRole } from "@/lib/journal-sync-safety";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  firstMemoryCelebrationStorageKey,
  shouldShowFirstMemoryCelebration
} from "@/lib/first-memory-celebration";
import {
  responseErrorMessage,
  type AppTab,
  type DetailCategory,
  type SaveState
} from "@/components/journal/helpers";
import { MemoriesView } from "@/components/journal/MemoriesView";
import { MobileTabs, Sidebar } from "@/components/journal/Sidebar";
import { TodayView } from "@/components/journal/TodayView";

// Today + Memories are the daily path and stay in the main chunk; the other
// surfaces load on demand so the ritual chunk stays lean as features grow.
function LazyViewFallback() {
  return (
    <p role="status" className="mx-auto max-w-6xl py-12 text-center text-sm text-warm-gray">
      Loading…
    </p>
  );
}

const CalendarView = dynamic(() => import("@/components/journal/CalendarView").then((mod) => mod.CalendarView), {
  loading: LazyViewFallback
});
const InsightsView = dynamic(() => import("@/components/journal/InsightsView").then((mod) => mod.InsightsView), {
  loading: LazyViewFallback
});
const SettingsView = dynamic(() => import("@/components/journal/SettingsView").then((mod) => mod.SettingsView), {
  loading: LazyViewFallback
});
const OnboardingOverlay = dynamic(() => import("@/components/journal/Onboarding").then((mod) => mod.OnboardingOverlay), {
  loading: () => null
});
const EntryDetailModal = dynamic(() => import("@/components/journal/EntryDetailModal").then((mod) => mod.EntryDetailModal), {
  loading: () => null
});

const storageKey = "photo-gratitude-web-state-v1";

export function JournalApp({ initialData, appVersion }: { initialData: JournalBootstrap; appVersion: string }) {
  const [tab, setTab] = useState<AppTab>("today");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialData.activeWorkspaceId);
  const [workspaces, setWorkspaces] = useState(initialData.workspaces);
  const [workspaceMembers, setWorkspaceMembers] = useState(initialData.workspaceMembers);
  const [people, setPeople] = useState(initialData.people);
  const [prompts, setPrompts] = useState(initialData.prompts);
  const [entries, setEntries] = useState(initialData.entries);
  const [reminders, setReminders] = useState(initialData.reminders);
  const [saveState, setSaveState] = useState<SaveState>(initialData.mode === "demo" ? "local" : "saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syncRetryToken, setSyncRetryToken] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<"setup" | "welcome-only">("setup");
  const [forceOnboardingSetup, setForceOnboardingSetup] = useState(false);
  const [showStarterGuide, setShowStarterGuide] = useState(false);
  const [firstMemoryDismissalValue, setFirstMemoryDismissalValue] = useState<string | null>("true");
  const [workspacesWithClearedEntries, setWorkspacesWithClearedEntries] = useState<Set<string>>(() => new Set());
  const [staleEntryIds, setStaleEntryIds] = useState<string[]>([]);
  const [archiveState, setArchiveState] = useState<Record<string, { hasMore: boolean; loading: boolean }>>({});
  const [pendingInvites, setPendingInvites] = useState(initialData.pendingInvites ?? []);
  const [inviteBusyWorkspaceId, setInviteBusyWorkspaceId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const didMountPersistence = useRef(false);
  const latestSyncId = useRef(0);
  // Server updated_at per entry id, used as the stale-write baseline. Kept in
  // a ref (not state) so recording a sync ack does not retrigger the sync
  // effect: every applied write bumps the server timestamp.
  const serverEntryBaselines = useRef<Map<string, string>>(
    new Map(initialData.entries.map((entry) => [entry.id, entry.updatedAt]))
  );
  // Content the server has acknowledged, keyed by entry id. Only entries that
  // differ from this are sent (delta sync); also a ref to avoid effect loops.
  const ackedEntrySerializations = useRef<Map<string, string>>(
    new Map(initialData.entries.map((entry) => [entry.id, serializeEntryForSync(entry)]))
  );
  // Same acked pattern for the people/prompts/reminders sections: each is
  // included in a sync POST only when it differs from what the server last
  // acknowledged (bootstrap data is server state, so it starts acked).
  const ackedSectionSerializations = useRef({
    people: JSON.stringify(initialData.people.filter((person) => person.workspaceId === initialData.activeWorkspaceId)),
    prompts: JSON.stringify(initialData.prompts.filter((prompt) => prompt.workspaceId === initialData.activeWorkspaceId)),
    reminders: JSON.stringify(initialData.reminders)
  });

  const onboardingKey = useMemo(() => `${onboardingStorageKey}:${initialData.profile?.id ?? "demo"}`, [initialData.profile?.id]);
  const firstMemoryKey = useMemo(() => firstMemoryCelebrationStorageKey(activeWorkspaceId), [activeWorkspaceId]);
  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  useEffect(() => {
    if (initialData.mode !== "demo") return;
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as Pick<JournalBootstrap, "entries" | "people" | "prompts" | "workspaces" | "workspaceMembers" | "reminders" | "activeWorkspaceId">;
      setEntries(parsed.entries);
      setPeople(parsed.people);
      setPrompts(parsed.prompts);
      setWorkspaces(parsed.workspaces);
      setWorkspaceMembers(parsed.workspaceMembers ?? []);
      setReminders(parsed.reminders);
      setActiveWorkspaceId(parsed.activeWorkspaceId);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialData.mode]);

  useEffect(() => {
    if (initialData.mode !== "demo") return;
    const result = writeDemoStateToStorage(
      window.localStorage,
      storageKey,
      JSON.stringify({ entries, people, prompts, workspaces, workspaceMembers, reminders, activeWorkspaceId })
    );
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    setSaveError((current) => (current === demoStorageFullMessage ? null : current));
  }, [entries, people, prompts, workspaces, workspaceMembers, reminders, activeWorkspaceId, initialData.mode]);

  useEffect(() => {
    let initialized = false;

    function updateOfflineState() {
      if (!navigator.onLine) {
        setSaveState("offline");
        setSaveError("You are offline. Changes will stay local until sync succeeds.");
      } else if (initialData.mode === "supabase") {
        setSaveError((current) => (current?.startsWith("You are offline.") ? null : current));
        if (initialized) setSyncRetryToken((current) => current + 1);
      } else {
        setSaveState("local");
        setSaveError(null);
      }
      initialized = true;
    }

    window.addEventListener("online", updateOfflineState);
    window.addEventListener("offline", updateOfflineState);
    updateOfflineState();
    return () => {
      window.removeEventListener("online", updateOfflineState);
      window.removeEventListener("offline", updateOfflineState);
    };
  }, [initialData.mode]);

  const workspaceEntries = useMemo(
    () => entries.filter((entry) => entry.workspaceId === activeWorkspaceId),
    [entries, activeWorkspaceId]
  );

  const workspacePeople = useMemo(
    () => people.filter((person) => person.workspaceId === activeWorkspaceId),
    [people, activeWorkspaceId]
  );

  const workspacePrompts = useMemo(
    () => prompts.filter((prompt) => prompt.workspaceId === activeWorkspaceId),
    [prompts, activeWorkspaceId]
  );

  const activeWorkspaceRole = activeWorkspace?.role ?? "viewer";
  const canEditActiveWorkspace = initialData.mode === "demo" || canMutateWorkspaceRole(activeWorkspaceRole);
  const activeWorkspaceMembers = useMemo(
    () => workspaceMembers.filter((member) => member.workspaceId === activeWorkspaceId),
    [workspaceMembers, activeWorkspaceId]
  );
  const memberNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const member of activeWorkspaceMembers) {
      if (member.userId) names[member.userId] = member.displayName;
    }
    if (initialData.profile) names[initialData.profile.id] = initialData.profile.displayName;
    return names;
  }, [activeWorkspaceMembers, initialData.profile]);

  const todayEntry = useMemo(() => {
    const today = toLocalDate();
    return (
      workspaceEntries.find((entry) => entry.localDate === today) ??
      makeEntry(activeWorkspaceId, today, workspacePrompts, reminders.cadence, initialData.profile?.id ?? null)
    );
  }, [activeWorkspaceId, workspaceEntries, workspacePrompts, reminders.cadence, initialData.profile?.id]);
  const activeWorkspaceWasCleared = workspacesWithClearedEntries.has(activeWorkspaceId);

  const selectedEntry = useMemo(
    () => workspaceEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [workspaceEntries, selectedEntryId]
  );

  async function respondToInvite(workspaceId: string, accept: boolean) {
    setInviteBusyWorkspaceId(workspaceId);
    setInviteError(null);
    try {
      const response = await fetch("/api/workspaces/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, accept })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "The invite could not be updated"));
      if (accept) {
        // The accepted workspace needs a full bootstrap (entries, members).
        window.location.reload();
        return;
      }
      setPendingInvites((current) => current.filter((invite) => invite.workspaceId !== workspaceId));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "The invite could not be updated");
    } finally {
      setInviteBusyWorkspaceId(null);
    }
  }

  const archive =
    initialData.mode === "supabase"
      ? (archiveState[activeWorkspaceId] ?? { hasMore: true, loading: false })
      : { hasMore: false, loading: false };

  async function loadOlderEntries() {
    if (initialData.mode !== "supabase" || archive.loading) return;
    const workspaceId = activeWorkspaceId;
    const oldest = workspaceEntries.reduce((min, entry) => (entry.localDate < min ? entry.localDate : min), toLocalDate());
    setArchiveState((current) => ({ ...current, [workspaceId]: { hasMore: true, loading: true } }));
    try {
      const response = await fetch(`/api/journal/entries?workspaceId=${workspaceId}&before=${oldest}`);
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Older memories could not load"));
      const payload = (await response.json()) as { entries: JournalEntry[]; hasMore: boolean };
      for (const entry of payload.entries) {
        // Register fetched history as server-acknowledged so delta sync does
        // not immediately re-upload it.
        serverEntryBaselines.current.set(entry.id, entry.updatedAt);
        ackedEntrySerializations.current.set(entry.id, serializeEntryForSync(entry));
      }
      setEntries((current) => {
        const known = new Set(current.map((entry) => entry.id));
        return [...current, ...payload.entries.filter((entry) => !known.has(entry.id))];
      });
      setArchiveState((current) => ({ ...current, [workspaceId]: { hasMore: payload.hasMore, loading: false } }));
    } catch (error) {
      setArchiveState((current) => ({ ...current, [workspaceId]: { hasMore: true, loading: false } }));
      setSaveError(error instanceof Error ? error.message : "Older memories could not load");
    }
  }

  useEffect(() => {
    if (initialData.mode !== "supabase" || !initialData.profile) return;
    if (!canEditActiveWorkspace) {
      setSaveState("readonly");
      setSaveError(null);
      return;
    }
    if (!didMountPersistence.current) {
      didMountPersistence.current = true;
      return;
    }

    if (!navigator.onLine) {
      setSaveState("offline");
      setSaveError("You are offline. Changes will stay local until sync succeeds.");
      return;
    }

    const syncId = latestSyncId.current + 1;
    latestSyncId.current = syncId;
    const controller = new AbortController();
    setSaveState("saving");
    setSaveError(null);
    const timeout = window.setTimeout(async () => {
      try {
        const dirtyEntries = selectDirtyEntries(workspaceEntries, ackedEntrySerializations.current);
        const sentSerializations = new Map(dirtyEntries.map((entry) => [entry.id, serializeEntryForSync(entry)]));
        const ackedSections = ackedSectionSerializations.current;
        const peopleJson = JSON.stringify(workspacePeople);
        const promptsJson = JSON.stringify(workspacePrompts);
        const remindersJson = JSON.stringify(reminders);
        const response = await fetch("/api/journal/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            ...(peopleJson === ackedSections.people ? {} : { people: workspacePeople }),
            ...(promptsJson === ackedSections.prompts ? {} : { prompts: workspacePrompts }),
            ...(remindersJson === ackedSections.reminders ? {} : { reminders }),
            entries: dirtyEntries.map((entry) => ({
              ...entry,
              // Derived presentation data; JSON.stringify drops the undefined.
              photos: entry.photos.map((photo) => ({ ...photo, thumbnailUrl: undefined })),
              syncedAt: serverEntryBaselines.current.get(entry.id) ?? null
            }))
          })
        });

        if (!response.ok) throw new Error(await responseErrorMessage(response, "Sync failed"));
        const result = (await response.json()) as { ok?: boolean; applied?: Record<string, string>; stale?: string[] };
        ackedSections.people = peopleJson;
        ackedSections.prompts = promptsJson;
        ackedSections.reminders = remindersJson;
        for (const [entryId, serverUpdatedAt] of Object.entries(result.applied ?? {})) {
          serverEntryBaselines.current.set(entryId, serverUpdatedAt);
          const sent = sentSerializations.get(entryId);
          if (sent) ackedEntrySerializations.current.set(entryId, sent);
        }
        if (latestSyncId.current === syncId) {
          setStaleEntryIds(result.stale ?? []);
          if ((result.stale?.length ?? 0) > 0) {
            setSaveState("error");
            setSaveError(
              "Some memories changed on another device since this screen loaded, so the newer copy was kept. Refresh to see the latest before editing again."
            );
          } else if (navigator.onLine) {
            setSaveState("saved");
            setSaveError(null);
          } else {
            setSaveState("offline");
            setSaveError("You are offline. Changes will stay local until sync succeeds.");
          }
        }
      } catch (error) {
        if (controller.signal.aborted || latestSyncId.current !== syncId) return;
        setSaveState(navigator.onLine ? "error" : "offline");
        setSaveError(error instanceof Error ? error.message : "Sync failed");
      }
    }, 800);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [activeWorkspaceId, workspaceEntries, workspacePeople, workspacePrompts, reminders, syncRetryToken, initialData.mode, initialData.profile, canEditActiveWorkspace]);

  useEffect(() => {
    if (!canEditActiveWorkspace) return;
    if (activeWorkspaceWasCleared && workspaceEntries.length === 0) return;
    setEntries((current) => {
      if (current.some((entry) => entry.id === todayEntry.id)) return current;
      return [todayEntry, ...current];
    });
  }, [todayEntry, canEditActiveWorkspace, activeWorkspaceWasCleared, workspaceEntries.length]);

  useEffect(() => {
    const completed = window.localStorage.getItem(onboardingKey) === "complete";
    const starterDismissed = window.localStorage.getItem(`${onboardingKey}:starter-dismissed`) === "true";
    const hasData = workspaceHasMeaningfulData({
      people: workspacePeople,
      entries: workspaceEntries,
      workspaceId: activeWorkspaceId
    });
    // A member invited into an already-populated household (a non-owner whose
    // active space already has memories) or a viewer gets the short welcome
    // instead of the personalization flow — we never overwrite a shared space's
    // people. Owners always get the full setup. Manual replay forces setup.
    const welcomeOnly = !forceOnboardingSetup && ((hasData && activeWorkspaceRole !== "owner") || !canEditActiveWorkspace);
    setOnboardingMode(welcomeOnly ? "welcome-only" : "setup");
    setShowOnboarding(forceOnboardingSetup || !completed);
    setShowStarterGuide(completed && !starterDismissed);
  }, [onboardingKey, activeWorkspaceId, workspacePeople, workspaceEntries, canEditActiveWorkspace, activeWorkspaceRole, forceOnboardingSetup]);

  useEffect(() => {
    setFirstMemoryDismissalValue(window.localStorage.getItem(firstMemoryKey));
  }, [firstMemoryKey]);

  function markPendingSave() {
    setSaveState("saving");
    setSaveError(null);
    if (initialData.mode === "demo") {
      window.setTimeout(() => setSaveState("local"), 450);
    }
  }

  function blockReadOnlyMutation() {
    if (canEditActiveWorkspace) return false;
    setSaveState("readonly");
    setSaveError("Viewer access can read this workspace, but cannot change it.");
    return true;
  }

  function mutateEntries(updater: (entries: JournalEntry[]) => JournalEntry[]) {
    if (blockReadOnlyMutation()) return;
    clearWorkspaceEntriesCleared(activeWorkspaceId);
    markPendingSave();
    startTransition(() => {
      setEntries((current) => updater(current));
    });
  }

  const updateReminders: React.Dispatch<React.SetStateAction<ReminderPreferences>> = (value) => {
    if (blockReadOnlyMutation()) return;
    markPendingSave();
    setReminders(value);
  };

  const updatePrompts: React.Dispatch<React.SetStateAction<PromptTemplate[]>> = (value) => {
    if (blockReadOnlyMutation()) return;
    markPendingSave();
    setPrompts(value);
  };

  const updatePeople: React.Dispatch<React.SetStateAction<PersonTag[]>> = (value) => {
    if (blockReadOnlyMutation()) return;
    markPendingSave();
    setPeople(value);
  };

  function updateEntry(entryId: string, updater: (entry: JournalEntry) => JournalEntry) {
    mutateEntries((current) => {
      let didUpdate = false;
      const updatedEntries = current.map((entry) => {
        if (entry.id !== entryId) return entry;
        didUpdate = true;
        return updater(entry);
      });

      if (didUpdate) return updatedEntries;
      if (entryId === todayEntry.id) return [updater(todayEntry), ...current];
      return current;
    });
  }

  function markWorkspaceEntriesCleared(workspaceId: string) {
    setWorkspacesWithClearedEntries((current) => {
      if (current.has(workspaceId)) return current;
      const next = new Set(current);
      next.add(workspaceId);
      return next;
    });
  }

  function clearWorkspaceEntriesCleared(workspaceId: string) {
    setWorkspacesWithClearedEntries((current) => {
      if (!current.has(workspaceId)) return current;
      const next = new Set(current);
      next.delete(workspaceId);
      return next;
    });
  }

  function addRepositoryDetail({
    localDate,
    text,
    category,
    personTagIds
  }: {
    localDate: string;
    text: string;
    category: DetailCategory;
    personTagIds: string[];
  }) {
    const trimmed = text.trim();
    if (!trimmed) return;

    mutateEntries((current) => {
      const existingEntry = current.find((entry) => entry.workspaceId === activeWorkspaceId && entry.localDate === localDate);
      const entry = existingEntry ?? makeEntry(activeWorkspaceId, localDate, workspacePrompts, reminders.cadence);
      const detail: MemoryDetail = {
        id: crypto.randomUUID(),
        entryId: entry.id,
        text: trimmed,
        category,
        sortOrder: entry.details.length,
        personTagIds
      };
      const updatedEntry = {
        ...entry,
        details: [...entry.details, detail],
        updatedAt: new Date().toISOString()
      };

      if (existingEntry) {
        return current.map((candidate) => (candidate.id === existingEntry.id ? updatedEntry : candidate));
      }

      return [updatedEntry, ...current];
    });
  }

  function updateRepositoryDetail(entryId: string, detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) {
    updateEntry(entryId, (entry) => ({
      ...entry,
      details: entry.details.map((detail) => (detail.id === detailId ? updater(detail) : detail)),
      updatedAt: new Date().toISOString()
    }));
  }

  function deleteRepositoryDetail(entryId: string, detailId: string) {
    updateEntry(entryId, (entry) => ({
      ...entry,
      details: entry.details.filter((detail) => detail.id !== detailId),
      updatedAt: new Date().toISOString()
    }));
  }

  function addPerson(name: string): PersonTag | null {
    if (blockReadOnlyMutation()) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = workspacePeople.find((person) => person.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const person: PersonTag = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspaceId,
      name: trimmed,
      color: "#7C6F64",
      sortOrder: workspacePeople.length,
      isDefault: false
    };
    markPendingSave();
    setPeople((current) => [...current, person]);
    return person;
  }

  async function addWorkspace(kind: "personal" | "household") {
    if (initialData.mode === "supabase") {
      setSaveState("saving");
      setSaveError(null);
      const name = kind === "personal" ? "My journal" : "Household journal";
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kind })
      });
      if (response.ok) {
        window.location.reload();
        return;
      }
      setSaveState(navigator.onLine ? "error" : "offline");
      setSaveError(await responseErrorMessage(response, "Workspace could not be created"));
      return;
    }

    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: kind === "personal" ? "My journal" : "Household journal",
      kind,
      role: "owner"
    };
    setWorkspaces((current) => [...current, workspace]);
    setWorkspaceMembers((current) => [
      ...current,
      {
        workspaceId: workspace.id,
        userId: initialData.profile?.id ?? "demo-user",
        email: initialData.profile?.email ?? "demo@photojournal.local",
        displayName: initialData.profile?.displayName ?? "Demo User",
        role: "owner",
        invitationState: "accepted",
        invitedEmail: "",
        createdAt: new Date().toISOString(),
        isCurrentUser: true
      }
    ]);
    setActiveWorkspaceId(workspace.id);
  }

  async function deleteWorkspaceEntries() {
    if (blockReadOnlyMutation()) return;
    const workspaceId = activeWorkspaceId;
    if (initialData.mode !== "supabase") {
      markPendingSave();
      markWorkspaceEntriesCleared(workspaceId);
      setEntries((current) => current.filter((entry) => entry.workspaceId !== workspaceId));
      return;
    }
    if (!navigator.onLine) {
      setSaveState("offline");
      setSaveError("You are offline. Delete was not sent to the server.");
      return;
    }

    setSaveState("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/journal/delete-workspace-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId })
      });
      if (!response.ok) throw new Error(await responseErrorMessage(response, "Delete failed"));
      markWorkspaceEntriesCleared(workspaceId);
      setEntries((current) => current.filter((entry) => entry.workspaceId !== workspaceId));
      setSaveState("saved");
    } catch (error) {
      setSaveState(navigator.onLine ? "error" : "offline");
      setSaveError(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    window.location.href = "/login";
  }

  function focusFirstReflection() {
    window.setTimeout(() => {
      const firstField = document.getElementById("nice-thing-0");
      firstField?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstField?.focus({ preventScroll: true });
    }, 120);
  }

  function completeOnboarding(setup?: OnboardingSetup) {
    if (setup) {
      applyOnboardingSetup(setup);
      if (setup.reminders) updateReminders(setup.reminders);
    }
    window.localStorage.setItem(onboardingKey, "complete");
    window.localStorage.removeItem(`${onboardingKey}:starter-dismissed`);
    setForceOnboardingSetup(false);
    setShowOnboarding(false);
    setShowStarterGuide(true);
    setTab("today");
  }

  function dismissStarterGuide() {
    window.localStorage.setItem(`${onboardingKey}:starter-dismissed`, "true");
    setShowStarterGuide(false);
  }

  function dismissFirstMemoryCelebration() {
    window.localStorage.setItem(firstMemoryKey, "true");
    setFirstMemoryDismissalValue("true");
  }

  function replayOnboarding() {
    setTab("today");
    setForceOnboardingSetup(true);
    setOnboardingMode("setup");
    setShowOnboarding(true);
  }

  function applyOnboardingSetup(setup: OnboardingSetup) {
    if (blockReadOnlyMutation()) return;
    markPendingSave();
    setPeople((current) =>
      applyOnboardingSetupToPeople({
        people: current,
        entries: workspaceEntries,
        workspaceId: activeWorkspaceId,
        setup
      })
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 text-ink lg:pb-0">
      <div className="mx-auto grid min-h-screen w-full max-w-[1480px] min-w-0 lg:grid-cols-[280px_1fr]">
        <Sidebar
          activeTab={tab}
          setTab={setTab}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          saveState={isPending ? "saving" : saveState}
          saveError={saveError}
          mode={initialData.mode}
        />

        <main className="min-w-0 px-3 py-4 sm:px-6 lg:px-8 lg:py-8">
          {pendingInvites.length > 0 ? (
            <section className="mx-auto mb-5 grid max-w-6xl gap-3" aria-label="Pending invitations">
              {pendingInvites.map((invite) => (
                <div key={invite.workspaceId} className="flex flex-wrap items-center justify-between gap-3 rounded-journal border border-leaf/25 bg-leaf/10 p-4">
                  <p className="text-sm leading-6 text-soft-ink">
                    <span className="font-bold">You&apos;re invited to “{invite.workspaceName}”.</span> Accept to start sharing memories there as {invite.role === "viewer" ? "a viewer" : `an ${invite.role}`}.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={inviteBusyWorkspaceId === invite.workspaceId}
                      onClick={() => respondToInvite(invite.workspaceId, true)}
                      className="inline-flex min-h-10 items-center rounded-full bg-leaf px-4 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Accept invite
                    </button>
                    <button
                      type="button"
                      disabled={inviteBusyWorkspaceId === invite.workspaceId}
                      onClick={() => respondToInvite(invite.workspaceId, false)}
                      className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-bold text-soft-ink disabled:opacity-60"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              ))}
              {inviteError ? <p className="text-sm text-rose">{inviteError}</p> : null}
            </section>
          ) : null}
          {tab === "today" ? (
            <TodayView
              entry={todayEntry}
              entries={workspaceEntries}
              people={workspacePeople}
              workspace={activeWorkspace}
              prompts={workspacePrompts}
              saveState={saveState}
              saveError={saveError}
              isEntryStale={staleEntryIds.includes(todayEntry.id)}
              currentUserId={initialData.profile?.id ?? null}
              memberNames={memberNames}
              canEdit={canEditActiveWorkspace}
              showStarterGuide={showStarterGuide}
              showFirstMemoryCelebration={shouldShowFirstMemoryCelebration({
                entries: workspaceEntries,
                dismissalStorageValue: firstMemoryDismissalValue
              })}
              onUpdateEntry={updateEntry}
              onAddPerson={addPerson}
              onOpenEntry={setSelectedEntryId}
              onFocusFirstReflection={focusFirstReflection}
              onDismissStarterGuide={dismissStarterGuide}
              onDismissFirstMemoryCelebration={dismissFirstMemoryCelebration}
            />
          ) : null}

          {tab === "memories" ? (
            <MemoriesView
              entries={workspaceEntries}
              people={workspacePeople}
              onOpenToday={() => setTab("today")}
              onOpenEntry={setSelectedEntryId}
              onAddDetail={addRepositoryDetail}
              onUpdateDetail={updateRepositoryDetail}
              onDeleteDetail={deleteRepositoryDetail}
              canEdit={canEditActiveWorkspace}
              archive={archive}
              onLoadOlder={loadOlderEntries}
            />
          ) : null}

          {tab === "calendar" ? <CalendarView entries={workspaceEntries} people={workspacePeople} onOpenEntry={setSelectedEntryId} /> : null}

          {tab === "insights" ? <InsightsView entries={workspaceEntries} /> : null}

          {tab === "settings" ? (
            <SettingsView
              profile={initialData.profile}
              mode={initialData.mode}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              workspaceMembers={activeWorkspaceMembers}
              reminders={reminders}
              prompts={workspacePrompts}
              people={workspacePeople}
              entries={workspaceEntries}
              canEdit={canEditActiveWorkspace}
              setWorkspaceMembers={setWorkspaceMembers}
              setActiveWorkspaceId={setActiveWorkspaceId}
              setReminders={updateReminders}
              setPrompts={updatePrompts}
              setPeople={updatePeople}
              addWorkspace={addWorkspace}
              deleteWorkspaceData={deleteWorkspaceEntries}
              signOut={signOut}
              replayOnboarding={replayOnboarding}
              appVersion={appVersion}
            />
          ) : null}
        </main>
      </div>

      <MobileTabs activeTab={tab} setTab={setTab} />
      {selectedEntry ? <EntryDetailModal entry={selectedEntry} people={workspacePeople} onClose={() => setSelectedEntryId(null)} /> : null}
      {showOnboarding ? (
        <OnboardingOverlay
          profile={initialData.profile}
          people={workspacePeople}
          mode={onboardingMode}
          workspaceName={activeWorkspace?.name ?? "your journal"}
          reminders={reminders}
          onComplete={completeOnboarding}
          onClose={() => completeOnboarding()}
        />
      ) : null}
    </div>
  );
}

function makeEntry(workspaceId: string, localDate: string, prompts: PromptTemplate[], cadence: RitualCadence, createdBy: string | null = null): JournalEntry {
  const sessionKinds = cadence === "morning_evening" ? ["morning", "evening"] : cadence === "evening" ? ["evening"] : ["anytime"];
  return {
    id: crypto.randomUUID(),
    workspaceId,
    localDate,
    mood: "good",
    note: "",
    photos: [],
    personTagIds: [],
    details: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sessions: sessionKinds.map((kind) => ({
      id: crypto.randomUUID(),
      kind: kind as "morning" | "evening" | "anytime",
      createdBy,
      responses: prompts.filter((prompt) => prompt.isEnabled).map<PromptResponse>((prompt) => ({
        id: crypto.randomUUID(),
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptText: prompt.prompt,
        promptOrder: prompt.sortOrder,
        text: ""
      }))
    }))
  };
}
