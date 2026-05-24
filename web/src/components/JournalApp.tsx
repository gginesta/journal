"use client";

/* eslint-disable @next/next/no-img-element -- Journal photos can be local data URLs or private signed storage URLs. */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Home,
  ImagePlus,
  Leaf,
  Lock,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  JournalBootstrap,
  JournalEntry,
  MemoryDetail,
  Mood,
  PersonTag,
  PhotoAttachment,
  PromptResponse,
  PromptTemplate,
  ReminderPreferences,
  RitualCadence,
  Workspace,
  WorkspaceMember,
  WorkspaceRole
} from "@/types/journal";
import { daysInCalendarMonth, formatDisplayDate, toLocalDate } from "@/lib/dates";
import {
  entryPeople,
  firstResponseExcerpt,
  isEntryComplete,
  memoryLaneMatches,
  searchEntries,
  streakSummary
} from "@/lib/journal-logic";
import {
  listMemoryDetails,
  memoryDetailCategoryLabels,
  type MemoryDetailCategory
} from "@/lib/memory-details";
import {
  applyOnboardingSetupToPeople,
  findPersonalizedPersonName,
  onboardingFocusOptions,
  onboardingStorageKey,
  splitFlexibleTags,
  type OnboardingFocus,
  type OnboardingSetup
} from "@/lib/onboarding";
import { addSuggestionToReflectionText, gratitudeGuideForEntry } from "@/lib/prompts";
import { canMutateWorkspaceRole } from "@/lib/journal-sync-safety";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppTab = "today" | "memories" | "calendar" | "insights" | "settings";
type SaveState = "saved" | "saving" | "offline" | "error" | "local" | "readonly";
type MemoryFilter = "all" | "photos" | "text";
type MemoryMode = "entries" | "details";
type DetailCategory = MemoryDetailCategory;

const tabs: Array<{ id: AppTab; title: string; icon: LucideIcon }> = [
  { id: "today", title: "Today", icon: Home },
  { id: "memories", title: "Memories", icon: Camera },
  { id: "calendar", title: "Calendar", icon: CalendarDays },
  { id: "insights", title: "Insights", icon: Sparkles },
  { id: "settings", title: "Settings", icon: Settings }
];

const moodOptions: Array<{ id: Mood; title: string; icon: LucideIcon }> = [
  { id: "low", title: "Low", icon: Moon },
  { id: "quiet", title: "Quiet", icon: Leaf },
  { id: "good", title: "Good", icon: Heart },
  { id: "bright", title: "Bright", icon: Sparkles },
  { id: "glowing", title: "Glowing", icon: Sparkles }
];

const detailCategories: Array<{ id: DetailCategory; title: string }> = ([
  "note",
  "phrase",
  "favorite",
  "routine",
  "milestone",
  "quote"
] as DetailCategory[]).map((id) => ({ id, title: memoryDetailCategoryLabels[id] }));

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
  const [showStarterGuide, setShowStarterGuide] = useState(false);
  const [isPending, startTransition] = useTransition();
  const didMountPersistence = useRef(false);
  const latestSyncId = useRef(0);

  const onboardingKey = useMemo(() => `${onboardingStorageKey}:${initialData.profile?.id ?? "demo"}`, [initialData.profile?.id]);
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
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ entries, people, prompts, workspaces, workspaceMembers, reminders, activeWorkspaceId })
    );
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

  const todayEntry = useMemo(() => {
    const today = toLocalDate();
    return workspaceEntries.find((entry) => entry.localDate === today) ?? makeEntry(activeWorkspaceId, today, workspacePrompts, reminders.cadence);
  }, [activeWorkspaceId, workspaceEntries, workspacePrompts, reminders.cadence]);

  const selectedEntry = useMemo(
    () => workspaceEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [workspaceEntries, selectedEntryId]
  );

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
        const response = await fetch("/api/journal/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            people: workspacePeople,
            prompts: workspacePrompts,
            reminders,
            entries: workspaceEntries
          })
        });

        if (!response.ok) throw new Error(await responseErrorMessage(response, "Sync failed"));
        if (latestSyncId.current === syncId) {
          if (navigator.onLine) {
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
    setEntries((current) => {
      if (current.some((entry) => entry.id === todayEntry.id)) return current;
      return [todayEntry, ...current];
    });
  }, [todayEntry, canEditActiveWorkspace]);

  useEffect(() => {
    const completed = window.localStorage.getItem(onboardingKey) === "complete";
    const starterDismissed = window.localStorage.getItem(`${onboardingKey}:starter-dismissed`) === "true";
    setShowOnboarding(!completed);
    setShowStarterGuide(completed && !starterDismissed);
  }, [onboardingKey]);

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
    mutateEntries((current) => current.map((entry) => (entry.id === entryId ? updater(entry) : entry)));
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
    if (initialData.mode !== "supabase") {
      markPendingSave();
      setEntries((current) => current.filter((entry) => entry.workspaceId !== activeWorkspaceId));
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
      setEntries((current) => current.filter((entry) => entry.workspaceId !== activeWorkspaceId));
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
    if (setup) applyOnboardingSetup(setup);
    window.localStorage.setItem(onboardingKey, "complete");
    window.localStorage.removeItem(`${onboardingKey}:starter-dismissed`);
    setShowOnboarding(false);
    setShowStarterGuide(true);
    setTab("today");
  }

  function dismissStarterGuide() {
    window.localStorage.setItem(`${onboardingKey}:starter-dismissed`, "true");
    setShowStarterGuide(false);
  }

  function replayOnboarding() {
    setTab("today");
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
    <div className="min-h-screen pb-20 text-ink lg:pb-0">
      <div className="mx-auto grid min-h-screen w-full max-w-[1480px] lg:grid-cols-[280px_1fr]">
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
          {tab === "today" ? (
            <TodayView
              entry={todayEntry}
              entries={workspaceEntries}
              people={workspacePeople}
              prompts={workspacePrompts}
              saveState={saveState}
              saveError={saveError}
              canEdit={canEditActiveWorkspace}
              showStarterGuide={showStarterGuide}
              onUpdateEntry={updateEntry}
              onAddPerson={addPerson}
              onOpenEntry={setSelectedEntryId}
              onFocusFirstReflection={focusFirstReflection}
              onDismissStarterGuide={dismissStarterGuide}
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
          onComplete={completeOnboarding}
          onClose={() => completeOnboarding()}
        />
      ) : null}
    </div>
  );
}

function Sidebar({
  activeTab,
  setTab,
  workspaces,
  activeWorkspaceId,
  setActiveWorkspaceId,
  saveState,
  saveError,
  mode
}: {
  activeTab: AppTab;
  setTab: (tab: AppTab) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  saveState: SaveState;
  saveError: string | null;
  mode: "demo" | "supabase";
}) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-journal-line bg-journal-surface/82 px-5 py-6 backdrop-blur lg:block">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose">
            <Camera aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="font-bold leading-tight">Photo Gratitude</p>
            <p className="text-xs text-warm-gray">private web beta</p>
          </div>
        </div>

        <label className="mt-8 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
          Journal
          <select
            value={activeWorkspaceId}
            onChange={(event) => setActiveWorkspaceId(event.target.value)}
            className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ink outline-none focus:ring-4 focus:ring-rose/15"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        <nav className="mt-7 grid gap-2">
          {tabs.map((item) => (
            <NavButton key={item.id} item={item} active={activeTab === item.id} onClick={() => setTab(item.id)} />
          ))}
        </nav>

        <div className="mt-auto rounded-journal border border-journal-line bg-journal-raised p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Lock aria-hidden="true" size={16} />
            {mode === "demo" ? "Local demo" : "Private sync"}
          </p>
          <p className="mt-2 text-sm leading-5 text-warm-gray">
            {mode === "demo" ? "Changes are saved in this browser for review." : "Supabase RLS keeps each workspace private."}
          </p>
          <SaveStatePill state={saveState} error={saveError} />
          {saveError ? <p className="mt-2 text-xs leading-5 text-warm-gray">{saveError}</p> : null}
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  item,
  active,
  onClick
}: {
  item: { id: AppTab; title: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-sm font-bold transition",
        active ? "bg-rose/10 text-rose" : "text-soft-ink hover:bg-journal-raised"
      )}
    >
      <Icon aria-hidden="true" size={19} />
      {item.title}
    </button>
  );
}

function MobileTabs({ activeTab, setTab }: { activeTab: AppTab; setTab: (tab: AppTab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-journal-line bg-journal-surface/95 px-2 py-2 backdrop-blur lg:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeTab;
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={clsx(
              "grid min-h-14 place-items-center gap-1 rounded-2xl text-[11px] font-bold",
              active ? "bg-rose/10 text-rose" : "text-warm-gray"
            )}
          >
            <Icon aria-hidden="true" size={19} />
            {item.title}
          </button>
        );
      })}
    </nav>
  );
}

function OnboardingOverlay({
  profile,
  people,
  onComplete,
  onClose
}: {
  profile: JournalBootstrap["profile"];
  people: PersonTag[];
  onComplete: (setup: OnboardingSetup) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<OnboardingFocus>("self");
  const firstName = friendlyFirstName(profile);
  const [meName, setMeName] = useState(firstName === "there" ? "" : firstName);
  const [partnerName, setPartnerName] = useState(() => findPersonalizedPersonName(people, "Partner"));
  const [childNames, setChildNames] = useState(() => [
    findPersonalizedPersonName(people, "Kid 1"),
    findPersonalizedPersonName(people, "Kid 2")
  ]);
  const [otherNames, setOtherNames] = useState([""]);

  const steps = [
    {
      title: firstName === "there" ? "Welcome." : `Welcome, ${firstName}.`,
      heading: "This is a quiet place to keep one good moment from today.",
      body: "The app can hold photos, prompts, people, and memories, but the ritual is intentionally tiny: one photo or one line is enough."
    },
    {
      title: "Choose your shape",
      heading: "What kind of memories are you starting with?",
      body: "Tags stay private. Use them for yourself, a partner, family, friends, projects, places, or any theme you might want to find later."
    },
    {
      title: "The aha moment",
      heading: "Memory Lane starts sooner than you think.",
      body: "After a few kept days, the app can bring back yesterday, last week, one month ago, then three months and yearly moments as your archive grows."
    }
  ];
  const current = steps[step];

  function next() {
    if (step < steps.length - 1) {
      setStep((currentStep) => currentStep + 1);
      return;
    }
    onComplete({
      focus,
      names: {
        me: meName,
        partner: partnerName,
        children: childNames,
        others: otherNames
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-journal-surface sm:bg-ink/45 sm:px-4 sm:py-5 sm:backdrop-blur-md lg:items-center">
      <section className="min-h-dvh w-full overflow-hidden bg-journal-surface shadow-none sm:min-h-0 sm:max-w-5xl sm:rounded-[32px] sm:shadow-photo">
        <div className="grid lg:grid-cols-[1fr_420px]">
          <div className="grid content-start gap-5 p-4 sm:p-8 lg:min-h-[640px] lg:content-between lg:gap-8 lg:p-10">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  {steps.map((item, index) => (
                    <span
                      key={item.title}
                      className={clsx("h-2.5 rounded-full transition-all", index === step ? "w-9 bg-rose" : "w-2.5 bg-journal-line")}
                    />
                  ))}
                </div>
                <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-journal-raised text-warm-gray" aria-label="Close welcome">
                  <X aria-hidden="true" size={17} />
                </button>
              </div>

              <p className="mt-6 break-words text-[0.7rem] font-bold uppercase tracking-[0.12em] text-rose sm:mt-10 sm:text-sm">{current.title}</p>
              <h1 className="mt-3 max-w-2xl text-[2rem] font-bold leading-[1.04] tracking-normal text-ink sm:text-5xl">{current.heading}</h1>
              <p className="mt-4 max-w-xl text-[0.96rem] leading-6 text-warm-gray sm:text-base sm:leading-7">{current.body}</p>

              {step === 1 ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {onboardingFocusOptions.map((option) => {
                      const active = focus === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setFocus(option.id)}
                          aria-pressed={active}
                          className={clsx(
                            "rounded-[20px] border p-3 text-left transition sm:p-4",
                            active ? "border-rose/30 bg-rose/10" : "border-journal-line bg-white hover:border-rose/20"
                          )}
                        >
                          <span className="flex items-center gap-2 font-bold text-ink">
                            {active ? <CheckCircle2 aria-hidden="true" size={16} className="text-rose" /> : null}
                            {option.title}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-warm-gray">{option.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[22px] border border-journal-line bg-white p-4">
                    <p className="font-bold text-soft-ink">{focus === "other" ? "Tags to start" : "A few names to start"}</p>
                    <p className="mt-1 text-sm leading-5 text-warm-gray">
                      {focus === "other" ? "Add people, places, projects, or themes. Commas work too." : "Leave anything blank. You can edit these tags later."}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {focus !== "other" ? <OnboardingNameField label="Me" value={meName} onChange={setMeName} placeholder="Guillermo" /> : null}
                      {focus === "partner" || focus === "family" ? (
                        <OnboardingNameField label="Partner" value={partnerName} onChange={setPartnerName} placeholder="Stephanie" />
                      ) : null}
                      {focus === "family"
                        ? childNames.map((name, index) => (
                            <OnboardingNameField
                              key={index}
                              label={index === 0 ? "Child" : `Child ${index + 1}`}
                              value={name}
                              onChange={(value) => setChildNames((current) => current.map((candidate, candidateIndex) => (candidateIndex === index ? value : candidate)))}
                              placeholder={index === 0 ? "Their name" : "Optional"}
                            />
                          ))
                        : null}
                      {focus === "other"
                        ? otherNames.map((name, index) => (
                            <OnboardingNameField
                              key={index}
                              label={index === 0 ? "Person or theme" : `Person or theme ${index + 1}`}
                              value={name}
                              onChange={(value) => setOtherNames((current) => current.map((candidate, candidateIndex) => (candidateIndex === index ? value : candidate)))}
                              placeholder={index === 0 ? "Friends, travel, work wins" : "Optional"}
                            />
                          ))
                        : null}
                    </div>
                    {focus === "family" && childNames.length < 4 ? (
                      <button
                        type="button"
                        onClick={() => setChildNames((current) => [...current, ""])}
                        className="mt-3 rounded-full bg-journal-raised px-4 py-2 text-sm font-bold text-soft-ink"
                      >
                        Add another child
                      </button>
                    ) : null}
                    {focus === "other" && otherNames.length < 5 ? (
                      <button
                        type="button"
                        onClick={() => setOtherNames((current) => [...current, ""])}
                        className="mt-3 rounded-full bg-journal-raised px-4 py-2 text-sm font-bold text-soft-ink"
                      >
                        Add another tag
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={next} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-rose px-5 text-sm font-bold text-white shadow-sm sm:min-h-12 sm:flex-none sm:text-base">
                {step === steps.length - 1 ? "Start today" : "Continue"}
                <ArrowRight aria-hidden="true" size={17} />
              </button>
              <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-full bg-journal-raised px-5 text-sm font-bold text-warm-gray sm:min-h-12 sm:flex-none sm:text-base">
                Skip tour
              </button>
            </div>
          </div>

          <div className="bg-[linear-gradient(150deg,#f9ece6,#f7fbf2_48%,#fff7f1)] p-3 sm:p-8">
            {step === 0 ? <OnboardingTodayPreview /> : null}
            {step === 1 ? <OnboardingPeoplePreview focus={focus} meName={meName} partnerName={partnerName} childNames={childNames} otherNames={otherNames} /> : null}
            {step === 2 ? <OnboardingMemoryPreview focus={focus} childNames={childNames} partnerName={partnerName} otherNames={otherNames} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function friendlyFirstName(profile: JournalBootstrap["profile"]) {
  const displayName = profile?.displayName?.trim();
  if (!displayName || displayName.includes("@")) return "there";
  return displayName.split(/\s+/)[0] || "there";
}

function OnboardingNameField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-soft-ink">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 rounded-2xl border border-journal-line bg-journal-raised px-3 font-normal outline-none focus:ring-4 focus:ring-rose/15"
      />
    </label>
  );
}

function OnboardingTodayPreview() {
  return (
    <div className="grid h-full content-center gap-3 sm:gap-4">
      <div className="overflow-hidden rounded-[24px] bg-white shadow-sm sm:rounded-[30px]">
        <div className="grid min-h-44 content-end bg-[linear-gradient(135deg,#8da38e,#e6c392_54%,#70413c)] p-4 text-white sm:min-h-64 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em]">Photo of the day</p>
          <h2 className="mt-3 text-[1.45rem] font-bold leading-tight sm:text-2xl">One moment can hold the whole day.</h2>
        </div>
        <div className="grid gap-2 p-3 sm:gap-3 sm:p-5">
          {["A good cup of tea", "Sun on the walk home", "One kind text"].map((line, index) => (
            <div key={line} className="flex items-center gap-3 rounded-2xl bg-journal-raised p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose/10 text-sm font-bold text-rose">{index + 1}</span>
              <span className="text-sm font-semibold text-soft-ink">{line}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="rounded-[20px] bg-white/75 p-3 text-sm leading-6 text-warm-gray sm:rounded-[24px] sm:p-4">
        The first screen becomes much simpler when you know the rule: one good thing is already a complete entry.
      </p>
    </div>
  );
}

function OnboardingPeoplePreview({
  focus,
  meName,
  partnerName,
  childNames,
  otherNames
}: {
  focus: OnboardingFocus;
  meName: string;
  partnerName: string;
  childNames: string[];
  otherNames: string[];
}) {
  const examples: Record<OnboardingFocus, string[]> = {
    self: ["Morning run felt easier", "Finished the thing I kept delaying"],
    partner: ["A quiet coffee together", "Made each other laugh in the kitchen"],
    family: ["Still says 'lellow'", "Asked for the dinosaur spoon again"],
    other: ["A generous client note", "The blue door in Lisbon"]
  };
  const namedChildren = childNames.map((name) => name.trim()).filter(Boolean);
  const otherTags = splitFlexibleTags(otherNames);
  const chipsByFocus: Record<OnboardingFocus, string[]> = {
    self: [meName.trim() || "Me"],
    partner: [meName.trim() || "Me", partnerName.trim() || "Partner"],
    family: [meName.trim() || "Me", ...namedChildren, partnerName.trim() || "Partner", "Family"],
    other: otherTags.length > 0 ? otherTags : ["Friends", "Travel", "Work wins"]
  };
  const chips = chipsByFocus[focus];

  return (
    <div className="grid h-full content-center gap-4">
      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {chips.map((person, index) => (
            <span key={`${person}-${index}`} className={clsx("rounded-full px-3 py-2 text-xs font-bold", index === 1 || person === "Family" ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray")}>
              {person}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {examples[focus].map((example) => (
            <div key={example} className="rounded-2xl bg-journal-raised p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose">Little detail</p>
              <p className="mt-2 font-semibold text-soft-ink">{example}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="rounded-[24px] bg-white/75 p-4 text-sm leading-6 text-warm-gray">
        Tags are private labels, not social sharing. They make memories searchable by the people woven into them.
      </p>
    </div>
  );
}

function OnboardingMemoryPreview({
  focus,
  childNames,
  partnerName,
  otherNames
}: {
  focus: OnboardingFocus;
  childNames: string[];
  partnerName: string;
  otherNames: string[];
}) {
  const childName = childNames.find((name) => name.trim())?.trim() || "someone little";
  const partner = partnerName.trim() || "your partner";
  const theme = splitFlexibleTags(otherNames)[0] ?? "a favorite thread";
  const memoriesByFocus: Record<OnboardingFocus, string[][]> = {
    self: [
      ["1 week ago", "A small win you might have already forgotten."],
      ["1 month ago", "Took the long walk and felt clear-headed after."],
      ["3 months ago", "Proof that ordinary good days have been adding up."]
    ],
    partner: [
      ["1 week ago", `A small exchange with ${partner} worth keeping.`],
      ["1 month ago", `A quiet coffee with ${partner} before the day got loud.`],
      ["3 months ago", "The kind of ordinary dinner worth finding again."]
    ],
    family: [
      ["1 week ago", `${childName} had a tiny phase you almost missed.`],
      ["1 month ago", `${childName} insisted the moon was following the car.`],
      ["3 months ago", "A family routine that already feels like a little era."]
    ],
    other: [
      ["1 week ago", `A recent thread from ${theme} that still matters.`],
      ["1 month ago", `A small note from ${theme} that made the day brighter.`],
      ["3 months ago", "A place, person, or project you almost forgot to write down."]
    ]
  };

  return (
    <div className="grid h-full content-center gap-4">
      <div className="rounded-[30px] bg-white p-5 shadow-sm">
        <SectionTitle icon={Clock3} title="Memory Lane" subtitle="A little window back to days like this one." />
        {memoriesByFocus[focus].map(([label, text]) => (
          <div key={label} className="mt-3 flex gap-3 rounded-2xl bg-journal-raised p-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-warm-gray">
              <Sparkles aria-hidden="true" size={18} />
            </span>
            <div>
              <p className="font-bold">{label}</p>
              <p className="mt-1 text-sm leading-5 text-soft-ink">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="rounded-[24px] bg-white/75 p-4 text-sm leading-6 text-warm-gray">
        This is the payoff: short look-backs begin within days, then become month, season, and anniversary moments over time.
      </p>
    </div>
  );
}

function TodayView({
  entry,
  entries,
  people,
  prompts,
  saveState,
  saveError,
  canEdit,
  showStarterGuide,
  onUpdateEntry,
  onAddPerson,
  onOpenEntry,
  onFocusFirstReflection,
  onDismissStarterGuide
}: {
  entry: JournalEntry;
  entries: JournalEntry[];
  people: PersonTag[];
  prompts: PromptTemplate[];
  saveState: SaveState;
  saveError: string | null;
  canEdit: boolean;
  showStarterGuide: boolean;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
  onAddPerson: (name: string) => PersonTag | null;
  onOpenEntry: (entryId: string) => void;
  onFocusFirstReflection: () => void;
  onDismissStarterGuide: () => void;
}) {
  const summary = streakSummary(entries);
  const matches = memoryLaneMatches(entries).filter((match) => match.entryId !== entry.id);
  const guide = gratitudeGuideForEntry({
    localDate: entry.localDate,
    mood: entry.mood,
    hasRelationships: entry.personTagIds.length > 0 || people.length > 1
  });

  function useGuideSuggestion(suggestion: string) {
    onUpdateEntry(entry.id, (current) => {
      const targetSession = current.sessions.find((session) => session.responses.length > 0);
      const targetResponse = targetSession?.responses[0];
      if (!targetSession || !targetResponse) return current;

      const nextText = addSuggestionToReflectionText(targetResponse.text, suggestion);
      if (nextText === targetResponse.text) return current;

      return {
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === targetSession.id
            ? {
                ...session,
                responses: session.responses.map((response) =>
                  response.id === targetResponse.id ? { ...response, text: nextText } : response
                )
              }
            : session
        ),
        updatedAt: new Date().toISOString()
      };
    });
    onFocusFirstReflection();
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warm-gray">{formatDisplayDate(entry.localDate)}</p>
            <h1 className="mt-2 max-w-2xl text-[1.9rem] font-bold leading-[1.04] tracking-normal sm:text-5xl">
              What felt good today?
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StreakPill days={summary.current} />
            <SaveStatePill state={saveState} error={saveError} />
          </div>
        </header>

        {!canEdit ? <ReadOnlyNotice /> : null}

        {showStarterGuide ? (
          <StarterGuideCard
            entry={entry}
            onFocusFirstReflection={onFocusFirstReflection}
            onDismiss={onDismissStarterGuide}
          />
        ) : null}

        <PhotoHero
          entry={entry}
          canEdit={canEdit}
          onChangePhotos={(updater) =>
            onUpdateEntry(entry.id, (current) => ({
              ...current,
              photos: normalizePhotoOrder(updater(current.photos)).slice(0, 2),
              updatedAt: new Date().toISOString()
            }))
          }
        />

        <PromptPanel entry={entry} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
        <PeoplePanel entry={entry} people={people} canEdit={canEdit} onUpdateEntry={onUpdateEntry} onAddPerson={onAddPerson} />
        <LittleDetailsPanel entry={entry} people={people} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
        <MoodPanel entry={entry} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
      </section>

      <aside className="grid content-start gap-5">
        <CompletionCard entry={entry} />
        <PickMeUpMemoryCard entries={entries} onOpenEntry={onOpenEntry} />
        <GratitudeGuideCard guide={guide} canEdit={canEdit} onUseSuggestion={useGuideSuggestion} />
        <MemoryLanePanel matches={matches} entries={entries} onOpenEntry={onOpenEntry} />
        <PromptSnapshot prompts={prompts} />
      </aside>
    </div>
  );
}

function GratitudeGuideCard({
  guide,
  canEdit,
  onUseSuggestion
}: {
  guide: ReturnType<typeof gratitudeGuideForEntry>;
  canEdit: boolean;
  onUseSuggestion: (suggestion: string) => void;
}) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Sparkles} title="Gratitude Guide" subtitle={guide.moodCopy} />
      <div className="grid gap-2">
        {guide.suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onUseSuggestion(suggestion)}
            disabled={!canEdit}
            className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-journal-raised px-3 py-2 text-left text-sm font-semibold leading-5 text-soft-ink transition hover:bg-white hover:shadow-sm"
            aria-label={`Use suggestion: ${suggestion}`}
          >
            <span>{suggestion}</span>
            <Plus aria-hidden="true" className="shrink-0 text-rose" size={16} />
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">{guide.pack.title} pack</p>
    </section>
  );
}

function PhotoHero({
  entry,
  canEdit,
  onChangePhotos
}: {
  entry: JournalEntry;
  canEdit: boolean;
  onChangePhotos: (updater: (photos: PhotoAttachment[]) => PhotoAttachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);
  const orderedPhotos = useMemo(() => normalizePhotoOrder(entry.photos), [entry.photos]);
  const heroPhoto = orderedPhotos[0];
  const remainingSlots = Math.max(0, 2 - orderedPhotos.length);
  const hasPhotos = orderedPhotos.length > 0;

  async function handleFiles(files: FileList | null) {
    if (!canEdit) return;
    if (!files) return;
    setError(null);
    const selected = Array.from(files).slice(0, remainingSlots);
    if (selected.length === 0) {
      setStatus("Two photos is the beta limit for a calm daily entry.");
      return;
    }
    if (files.length > selected.length) {
      setStatus("Kept the first photos only. One or two is plenty for the day.");
    } else {
      setStatus("Preparing photo...");
    }

    try {
      const newPhotos: PhotoAttachment[] = [];
      for (const file of selected) {
        const previewUrl = await fileToCompressedDataUrl(file);
        newPhotos.push({
          id: crypto.randomUUID(),
          entryId: entry.id,
          storagePath: "",
          thumbnailPath: "",
          previewUrl,
          caption: "",
          sortOrder: orderedPhotos.length + newPhotos.length,
          createdAt: new Date().toISOString()
        });
      }
      onChangePhotos((current) => [...current, ...newPhotos]);
      setStatus(newPhotos.length === 1 ? "Photo saved. Future-you gets a little more context." : "Photos saved. Pick the cover that feels most like today.");
    } catch {
      setError("That photo could not be added. Try a smaller image or a different file.");
      setStatus(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleReplaceFile(files: FileList | null) {
    if (!canEdit) return;
    const file = files?.[0];
    const targetId = replacePhotoId;
    if (!file || !targetId) return;
    setError(null);
    setStatus("Replacing photo...");

    try {
      const previewUrl = await fileToCompressedDataUrl(file);
      onChangePhotos((current) =>
        current.map((photo) =>
          photo.id === targetId
            ? {
                ...photo,
                previewUrl,
                storagePath: "",
                thumbnailPath: "",
                createdAt: new Date().toISOString()
              }
            : photo
        )
      );
      setStatus("Photo replaced. Caption and order stayed with the memory.");
    } catch {
      setError("That replacement could not be added. Try a smaller image or a different file.");
      setStatus(null);
    } finally {
      setReplacePhotoId(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  }

  function updateCaption(photoId: string, caption: string) {
    if (!canEdit) return;
    onChangePhotos((current) => current.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo)));
  }

  function movePhoto(photoId: string, direction: -1 | 1) {
    if (!canEdit) return;
    onChangePhotos((current) => {
      const next = normalizePhotoOrder(current);
      const index = next.findIndex((photo) => photo.id === photoId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return current;
      const [photo] = next.splice(index, 1);
      next.splice(targetIndex, 0, photo);
      return next;
    });
    setStatus(direction < 0 ? "Cover photo updated." : "Photo order updated.");
  }

  function removePhoto(photoId: string) {
    if (!canEdit) return;
    onChangePhotos((current) => current.filter((photo) => photo.id !== photoId));
    setStatus("Photo removed. The entry is still yours to shape.");
  }

  function beginReplace(photoId: string) {
    if (!canEdit) return;
    setReplacePhotoId(photoId);
    window.setTimeout(() => replaceInputRef.current?.click(), 0);
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-ink shadow-photo sm:rounded-[28px]">
      <button
        type="button"
        onClick={() => {
          if (canEdit) inputRef.current?.click();
        }}
        disabled={!canEdit}
        className="relative flex min-h-[260px] w-full items-end overflow-hidden p-4 text-left text-white sm:min-h-[470px] sm:p-6"
      >
        {heroPhoto ? (
          <img
            src={heroPhoto.previewUrl}
            alt={heroPhoto.caption || "Today's journal photo"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#8da38e,#e6c392_52%,#b96464)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.58))]" />
        <div className="relative max-w-md pr-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">{hasPhotos ? "Photo of the day" : "Memory starts here"}</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
            {hasPhotos ? heroPhoto.caption.trim() || "Let the photo hold most of the story." : "Start with one photo, if one moment stands out."}
          </h2>
          <p className="mt-2 text-sm text-white/86">
            {orderedPhotos.length < 2 ? "One or two photos is plenty. Text is optional." : "Two photos saved. Reorder or remove if today feels simpler."}
          </p>
        </div>
      </button>

      <div className="grid gap-4 bg-journal-surface p-4">
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          aria-label="Add journal photos"
          disabled={!canEdit}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <input
          ref={replaceInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          aria-label="Replace selected journal photo"
          disabled={!canEdit}
          onChange={(event) => handleReplaceFile(event.target.files)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canEdit || remainingSlots === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white"
          >
            <ImagePlus aria-hidden="true" size={18} />
            {orderedPhotos.length === 0 ? "Add photo" : remainingSlots > 0 ? "Add one more" : "Two photos saved"}
          </button>
          <div className="min-w-[180px] flex-1 text-sm text-warm-gray" aria-live="polite">
            {error ? <p className="font-semibold text-rose">{error}</p> : <p>{status ?? `${remainingSlots} photo slot${remainingSlots === 1 ? "" : "s"} open.`}</p>}
          </div>
        </div>

        {orderedPhotos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {orderedPhotos.map((photo, index) => (
              <article key={photo.id} className="grid gap-3 rounded-[22px] border border-journal-line bg-white p-3 shadow-sm">
                <div className="grid grid-cols-[76px_1fr] gap-3">
                  <img src={photo.previewUrl} alt="" className="h-[76px] w-[76px] rounded-2xl object-cover" />
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
                    {index === 0 ? "Cover caption" : "Second photo caption"}
                    <input
                      value={photo.caption}
                      onChange={(event) => updateCaption(photo.id, event.target.value)}
                      placeholder={index === 0 ? "What should this photo remember?" : "Add a small note"}
                      disabled={!canEdit}
                      className="min-h-10 min-w-0 rounded-2xl border border-journal-line bg-journal-raised px-3 text-sm font-semibold normal-case tracking-normal text-soft-ink outline-none focus:ring-4 focus:ring-rose/15"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, -1)}
                    disabled={!canEdit || index === 0}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink"
                    aria-label="Move photo earlier"
                  >
                    <ChevronLeft aria-hidden="true" size={14} />
                    Earlier
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhoto(photo.id, 1)}
                    disabled={!canEdit || index === orderedPhotos.length - 1}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink"
                    aria-label="Move photo later"
                  >
                    Later
                    <ChevronRight aria-hidden="true" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => beginReplace(photo.id)}
                    disabled={!canEdit}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-rose/10 px-3 text-xs font-bold text-rose"
                    aria-label="Replace photo"
                  >
                    <Camera aria-hidden="true" size={14} />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    disabled={!canEdit}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-warm-gray"
                    aria-label="Remove photo"
                  >
                    <X aria-hidden="true" size={14} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 rounded-[22px] border border-dashed border-rose/25 bg-white/72 p-4 text-sm text-warm-gray sm:grid-cols-3">
            <p><span className="font-bold text-soft-ink">Pick one moment.</span> A meal, a face, the sky, the ordinary proof.</p>
            <p><span className="font-bold text-soft-ink">Add a caption later.</span> The photo can be the whole entry.</p>
            <p><span className="font-bold text-soft-ink">Keep it light.</span> Two photos max keeps the ritual calm.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function normalizePhotoOrder(photos: PhotoAttachment[]): PhotoAttachment[] {
  return [...photos]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt))
    .map((photo, index) => ({ ...photo, sortOrder: index }));
}

function PickMeUpMemoryCard({
  entries,
  onOpenEntry
}: {
  entries: JournalEntry[];
  onOpenEntry: (entryId: string) => void;
}) {
  const memories = useMemo(
    () =>
      entries
        .filter((entry) => entry.localDate !== toLocalDate() && isEntryComplete(entry))
        .sort((left, right) => Number(right.photos.length > 0) - Number(left.photos.length > 0) || right.localDate.localeCompare(left.localDate)),
    [entries]
  );
  const [index, setIndex] = useState(0);
  const memory = memories[index % Math.max(1, memories.length)];
  const photo = memory?.photos[0];

  useEffect(() => {
    setIndex(0);
  }, [memories.length]);

  if (!memory) {
    return (
      <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
        <SectionTitle icon={Sparkles} title="Show me something good" subtitle="After a few saved days, this becomes a small pick-me-up button." />
        <p className="rounded-2xl bg-journal-raised p-4 text-sm text-warm-gray">Save today, then come back when there is a past moment to return to.</p>
      </section>
    );
  }

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Sparkles} title="Show me something good" subtitle="A tiny pick-me-up from the archive." />
      <button
        type="button"
        onClick={() => onOpenEntry(memory.id)}
        className="group overflow-hidden rounded-[22px] bg-journal-raised text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
      >
        <JournalPhoto src={photo?.previewUrl} alt={photo?.caption || ""} className="h-32 w-full object-cover" loading="lazy" />
        <div className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose">{formatDisplayDate(memory.localDate, "short")}</p>
          <p className="mt-2 line-clamp-3 text-sm font-semibold leading-5 text-soft-ink">
            {photo?.caption.trim() || firstResponseExcerpt(memory) || memory.details[0]?.text || "Open this memory"}
          </p>
        </div>
      </button>
      {memories.length > 1 ? (
        <button
          type="button"
          onClick={() => setIndex((current) => (current + 1) % memories.length)}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-rose/10 px-4 text-sm font-bold text-rose"
        >
          <Sparkles aria-hidden="true" size={16} />
          Show another
        </button>
      ) : null}
    </section>
  );
}

function StarterGuideCard({
  entry,
  onFocusFirstReflection,
  onDismiss
}: {
  entry: JournalEntry;
  onFocusFirstReflection: () => void;
  onDismiss: () => void;
}) {
  const hasReflection = entry.sessions.some((session) => session.responses.some((response) => response.text.trim()));
  const hasPerson = entry.personTagIds.length > 0;
  const hasDetail = entry.details.some((detail) => detail.text.trim());
  const steps = [
    { label: "Write one nice thing", done: hasReflection },
    { label: "Tag who was part of it", done: hasPerson },
    { label: "Keep one tiny detail", done: hasDetail }
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-rose/15 bg-[linear-gradient(135deg,#fff7f1,#f7fbf2_55%,#fff)] shadow-sm sm:rounded-[28px]">
      <div className="grid gap-3 p-4 sm:gap-4 sm:p-6 lg:grid-cols-[1fr_300px] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose sm:text-sm">Start small</p>
          <h2 className="mt-2 text-xl font-bold leading-tight tracking-normal text-ink sm:text-2xl">Keep the first memory in under a minute.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-gray">
            You do not need to fill every section. One line is enough to save the day; tags and little details just make it easier to find later.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
            <button
              type="button"
              onClick={onFocusFirstReflection}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white shadow-sm"
            >
              Start with one line
              <ArrowRight aria-hidden="true" size={16} />
            </button>
            <button type="button" onClick={onDismiss} className="min-h-11 rounded-full bg-white px-4 text-sm font-bold text-warm-gray">
              I know my way around
            </button>
          </div>
        </div>

        <div className="hidden rounded-[22px] border border-journal-line bg-white/80 p-3 sm:block sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-soft-ink">First-entry path</p>
            <span className="rounded-full bg-rose/10 px-3 py-1 text-xs font-bold text-rose">{completed}/3</span>
          </div>
          <div className="grid gap-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-2 rounded-2xl bg-journal-raised px-3 py-2 text-sm font-bold text-soft-ink">
                <span className={clsx("grid h-6 w-6 place-items-center rounded-full", step.done ? "bg-leaf text-white" : "bg-white text-warm-gray")}>
                  {step.done ? <CheckCircle2 aria-hidden="true" size={14} /> : <Sparkles aria-hidden="true" size={13} />}
                </span>
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PromptPanel({
  entry,
  canEdit,
  onUpdateEntry
}: {
  entry: JournalEntry;
  canEdit: boolean;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
}) {
  const responses = entry.sessions.flatMap((session) => session.responses);
  const primary = responses[0];
  const secondary = responses.slice(1);

  if (!primary) return null;

  function updateResponse(responseId: string, text: string) {
    onUpdateEntry(entry.id, (current) => ({
      ...current,
      sessions: current.sessions.map((session) => ({
        ...session,
        responses: session.responses.map((response) => (response.id === responseId ? { ...response, text } : response))
      })),
      updatedAt: new Date().toISOString()
    }));
  }

  const lines = primary.text.split("\n");

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Three nice things</h2>
        <p className="mt-1 text-sm text-warm-gray">{primary.promptText}</p>
      </div>

      <div className="grid gap-3">
        {[0, 1, 2].map((index) => (
          <label key={index} className="flex gap-3 rounded-2xl bg-journal-raised p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose/10 text-sm font-bold text-rose">
              {index + 1}
            </span>
            <textarea
              id={index === 0 ? "nice-thing-0" : undefined}
              value={lines[index] ?? ""}
              onChange={(event) => {
                const next = [...lines];
                next[index] = event.target.value;
                updateResponse(primary.id, trimTrailingBlankLines(next).join("\n"));
              }}
              rows={1}
              placeholder={["A small good thing", "Another nice moment", "One more, if it fits"][index]}
              disabled={!canEdit}
              className="min-h-8 flex-1 border-0 bg-transparent text-base outline-none"
            />
          </label>
        ))}
      </div>

      {secondary.length > 0 ? (
        <details className="mt-4 rounded-2xl border border-journal-line bg-white p-4">
          <summary className="cursor-pointer font-bold text-soft-ink">More reflections</summary>
          <div className="mt-4 grid gap-4">
            {secondary.map((response) => (
              <label key={response.id} className="grid gap-2 text-sm font-bold text-soft-ink">
                {response.promptText}
                <textarea
                  value={response.text}
                  onChange={(event) => updateResponse(response.id, event.target.value)}
                  rows={3}
                  disabled={!canEdit}
                  className="rounded-2xl border border-journal-line bg-journal-raised p-3 font-normal outline-none focus:ring-4 focus:ring-rose/15"
                  placeholder="Optional"
                />
              </label>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function PeoplePanel({
  entry,
  people,
  canEdit,
  onUpdateEntry,
  onAddPerson
}: {
  entry: JournalEntry;
  people: PersonTag[];
  canEdit: boolean;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
  onAddPerson: (name: string) => PersonTag | null;
}) {
  const [name, setName] = useState("");

  function toggle(personId: string) {
    onUpdateEntry(entry.id, (current) => ({
      ...current,
      personTagIds: current.personTagIds.includes(personId)
        ? current.personTagIds.filter((id) => id !== personId)
        : [...current.personTagIds, personId],
      updatedAt: new Date().toISOString()
    }));
  }

  function add() {
    const person = onAddPerson(name);
    if (!person) return;
    setName("");
    if (!entry.personTagIds.includes(person.id)) toggle(person.id);
  }

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Users} title="People, optional" subtitle="Private labels for anyone woven into this memory." />
      <PersonChips people={people} selectedIds={entry.personTagIds} onToggle={toggle} disabled={!canEdit} />
      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
          placeholder="Add a private person"
          disabled={!canEdit}
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-journal-line bg-journal-raised px-3 outline-none focus:ring-4 focus:ring-rose/15"
        />
        <button onClick={add} disabled={!canEdit} className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose" aria-label="Add person">
          <Plus aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function LittleDetailsPanel({
  entry,
  people,
  canEdit,
  onUpdateEntry
}: {
  entry: JournalEntry;
  people: PersonTag[];
  canEdit: boolean;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<DetailCategory>("note");

  function addDetail() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const detail: MemoryDetail = {
      id: crypto.randomUUID(),
      entryId: entry.id,
      text: trimmed,
      category,
      sortOrder: entry.details.length,
      personTagIds: []
    };
    onUpdateEntry(entry.id, (current) => ({ ...current, details: [...current.details, detail], updatedAt: new Date().toISOString() }));
    setText("");
  }

  function updateDetail(detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) {
    onUpdateEntry(entry.id, (current) => ({
      ...current,
      details: current.details.map((detail) => (detail.id === detailId ? updater(detail) : detail)),
      updatedAt: new Date().toISOString()
    }));
  }

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle
        icon={Sparkles}
        title="Little Details"
        subtitle="Tiny phases, favorites, routines, milestones, or funny lines."
      />

      <div className="grid gap-3">
        {entry.details.map((detail) => (
          <article key={detail.id} className="rounded-2xl bg-journal-raised p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {detailCategories.map((option) => {
                const active = detail.category === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateDetail(detail.id, (current) => ({ ...current, category: option.id }))}
                    disabled={!canEdit}
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-bold",
                      active ? "bg-rose/10 text-rose" : "bg-white text-warm-gray"
                    )}
                    aria-pressed={active}
                  >
                    {option.title}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <textarea
                value={detail.text}
                onChange={(event) => updateDetail(detail.id, (current) => ({ ...current, text: event.target.value }))}
                disabled={!canEdit}
                className="min-h-12 flex-1 border-0 bg-transparent outline-none"
              />
              <button
                onClick={() =>
                  onUpdateEntry(entry.id, (current) => ({
                    ...current,
                    details: current.details.filter((candidate) => candidate.id !== detail.id),
                    updatedAt: new Date().toISOString()
                  }))
                }
                disabled={!canEdit}
                className="grid h-9 w-9 place-items-center rounded-full text-warm-gray"
                aria-label="Remove detail"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
            <div className="mt-3">
              <PersonChips
                compact
                people={people}
                selectedIds={detail.personTagIds}
                disabled={!canEdit}
                onToggle={(personId) =>
                  updateDetail(detail.id, (current) => ({
                    ...current,
                    personTagIds: current.personTagIds.includes(personId)
                      ? current.personTagIds.filter((id) => id !== personId)
                      : [...current.personTagIds, personId]
                  }))
                }
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-journal-line bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {detailCategories.map((option) => {
            const active = category === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setCategory(option.id)}
                disabled={!canEdit}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  active ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray"
                )}
                aria-pressed={active}
              >
                {option.title}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addDetail();
          }}
          placeholder="A phrase, phase, favorite, or tiny milestone"
          disabled={!canEdit}
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-journal-line bg-journal-raised px-3 outline-none focus:ring-4 focus:ring-rose/15"
        />
        <button onClick={addDetail} disabled={!canEdit} className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose" aria-label="Add little detail">
          <Plus aria-hidden="true" />
        </button>
        </div>
      </div>
    </section>
  );
}

function MoodPanel({
  entry,
  canEdit,
  onUpdateEntry
}: {
  entry: JournalEntry;
  canEdit: boolean;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
}) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Heart} title="Mood, optional" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {moodOptions.map((mood) => {
          const Icon = mood.icon;
          const active = entry.mood === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => onUpdateEntry(entry.id, (current) => ({ ...current, mood: mood.id, updatedAt: new Date().toISOString() }))}
              disabled={!canEdit}
              className={clsx(
                "grid min-h-16 place-items-center rounded-2xl text-xs font-bold",
                active ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray"
              )}
            >
              <Icon aria-hidden="true" size={18} />
              {mood.title}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MemoriesView({
  entries,
  people,
  onOpenToday,
  onOpenEntry,
  onAddDetail,
  onUpdateDetail,
  onDeleteDetail,
  canEdit
}: {
  entries: JournalEntry[];
  people: PersonTag[];
  onOpenToday: () => void;
  onOpenEntry: (entryId: string) => void;
  onAddDetail: (detail: { localDate: string; text: string; category: DetailCategory; personTagIds: string[] }) => void;
  onUpdateDetail: (entryId: string, detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) => void;
  onDeleteDetail: (entryId: string, detailId: string) => void;
  canEdit: boolean;
}) {
  const [mode, setMode] = useState<MemoryMode>("entries");
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const completeCount = entries.filter(isEntryComplete).length;
  const photoCount = entries.filter((entry) => entry.photos.length > 0).length;
  const detailCount = entries.reduce((count, entry) => count + entry.details.filter((detail) => detail.text.trim()).length, 0);

  const filtered = useMemo(() => {
    return searchEntries(entries, people, query).filter((entry) => {
      if (personId && !entryPeople(entry, people).some((person) => person.id === personId)) return false;
      if (filter === "photos") return entry.photos.length > 0;
      if (filter === "text") return entry.photos.length === 0;
      return true;
    });
  }, [entries, people, query, personId, filter]);

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <PageHeader title="Memories" subtitle="Browse the good things by photo, person, text, and date." />
      <div className="inline-grid w-full grid-cols-2 rounded-2xl border border-journal-line bg-journal-surface p-1 sm:w-fit">
        {[
          { id: "entries", title: "Entries" },
          { id: "details", title: "Little Details" }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id as MemoryMode)}
            className={clsx(
              "min-h-10 rounded-xl px-4 text-sm font-bold transition",
              mode === item.id ? "bg-rose text-white shadow-sm" : "text-warm-gray hover:bg-journal-raised"
            )}
            aria-pressed={mode === item.id}
          >
            {item.title}
          </button>
        ))}
      </div>

      {mode === "details" ? (
        <LittleDetailsRepository
          entries={entries}
          people={people}
          canEdit={canEdit}
          onOpenEntry={onOpenEntry}
          onAddDetail={onAddDetail}
          onUpdateDetail={onUpdateDetail}
          onDeleteDetail={onDeleteDetail}
        />
      ) : (
        <>
      <section className="grid gap-3 sm:grid-cols-3">
        <MemoryStatPill icon={CheckCircle2} label="Kept" value={`${completeCount}`} />
        <MemoryStatPill icon={Camera} label="Photo days" value={`${photoCount}`} />
        <MemoryStatPill icon={Sparkles} label="Details" value={`${detailCount}`} />
      </section>
      {completeCount <= 1 ? (
        <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-xl font-bold">The archive is just beginning.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-warm-gray">
                One kept day already counts. Add another photo, line, or little detail when the next small good thing shows up.
              </p>
            </div>
            <button type="button" onClick={onOpenToday} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white">
              <Camera aria-hidden="true" size={17} />
              Keep today
            </button>
          </div>
        </section>
      ) : null}
      <div className="rounded-journal border border-journal-line bg-journal-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search memories, people, prompts, or little details"
              className="min-h-12 w-full rounded-2xl border border-journal-line bg-white pl-10 pr-3 outline-none focus:ring-4 focus:ring-rose/15"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as MemoryFilter)}
            className="min-h-12 rounded-2xl border border-journal-line bg-white px-3 font-semibold outline-none"
          >
            <option value="all">All memories</option>
            <option value="photos">Photos</option>
            <option value="text">Text only</option>
          </select>
        </div>
        <div className="mt-4">
          <PersonChips people={people} selectedIds={personId ? [personId] : []} onToggle={(id) => setPersonId(personId === id ? null : id)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No memories found" message="Try another search, clear the person filter, or add today's first memory." action={onOpenToday} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => (
            <MemoryCard key={entry.id} entry={entry} people={people} onOpen={onOpenEntry} />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

function LittleDetailsRepository({
  entries,
  people,
  canEdit,
  onOpenEntry,
  onAddDetail,
  onUpdateDetail,
  onDeleteDetail
}: {
  entries: JournalEntry[];
  people: PersonTag[];
  canEdit: boolean;
  onOpenEntry: (entryId: string) => void;
  onAddDetail: (detail: { localDate: string; text: string; category: DetailCategory; personTagIds: string[] }) => void;
  onUpdateDetail: (entryId: string, detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) => void;
  onDeleteDetail: (entryId: string, detailId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [category, setCategory] = useState<DetailCategory | "all">("all");
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState(toLocalDate());
  const [newCategory, setNewCategory] = useState<DetailCategory>("note");
  const [newPersonIds, setNewPersonIds] = useState<string[]>([]);

  const details = useMemo(
    () => listMemoryDetails(entries, people, { query, personId, category }),
    [entries, people, query, personId, category]
  );

  function toggleNewPerson(personIdToToggle: string) {
    setNewPersonIds((current) =>
      current.includes(personIdToToggle)
        ? current.filter((id) => id !== personIdToToggle)
        : [...current, personIdToToggle]
    );
  }

  function addDetail() {
    if (!canEdit) return;
    const trimmed = newText.trim();
    if (!trimmed) return;
    onAddDetail({
      localDate: newDate || toLocalDate(),
      text: trimmed,
      category: newCategory,
      personTagIds: newPersonIds
    });
    setNewText("");
    setNewPersonIds([]);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-journal border border-journal-line bg-journal-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search little details, dates, categories, or people"
              className="min-h-12 w-full rounded-2xl border border-journal-line bg-white pl-10 pr-3 outline-none focus:ring-4 focus:ring-rose/15"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as DetailCategory | "all")}
            className="min-h-12 rounded-2xl border border-journal-line bg-white px-3 font-semibold outline-none"
          >
            <option value="all">All categories</option>
            {detailCategories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          <span className="inline-flex min-h-12 items-center rounded-2xl bg-journal-raised px-4 text-sm font-bold text-warm-gray">
            {details.length} detail{details.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4">
          <PersonChips people={people} selectedIds={personId ? [personId] : []} onToggle={(id) => setPersonId(personId === id ? null : id)} />
        </div>
      </section>

      <section className="rounded-journal border border-journal-line bg-journal-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[150px_170px_1fr_auto]">
          <input
            type="date"
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)}
            disabled={!canEdit}
            className="min-h-12 rounded-2xl border border-journal-line bg-white px-3 font-semibold outline-none focus:ring-4 focus:ring-rose/15"
            aria-label="Detail date"
          />
          <select
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value as DetailCategory)}
            disabled={!canEdit}
            className="min-h-12 rounded-2xl border border-journal-line bg-white px-3 font-semibold outline-none"
            aria-label="Detail category"
          >
            {detailCategories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          <input
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addDetail();
            }}
            disabled={!canEdit}
            placeholder="Add a phrase, favorite, routine, milestone, quote, or note"
            className="min-h-12 min-w-0 rounded-2xl border border-journal-line bg-white px-3 outline-none focus:ring-4 focus:ring-rose/15"
          />
          <button
            type="button"
            onClick={addDetail}
            disabled={!canEdit}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose px-5 text-sm font-bold text-white"
          >
            <Plus aria-hidden="true" size={18} />
            Add
          </button>
        </div>
        {people.length > 0 ? (
          <div className="mt-3">
            <PersonChips compact people={people} selectedIds={newPersonIds} onToggle={toggleNewPerson} disabled={!canEdit} />
          </div>
        ) : null}
      </section>

      {details.length === 0 ? (
        <EmptyState
          title="No little details found"
          message="Try another search, change the filters, or save one tiny detail above."
          action={() => {
            setQuery("");
            setPersonId(null);
            setCategory("all");
          }}
          actionLabel="Clear filters"
        />
      ) : (
        <div className="grid gap-3">
          {details.map((item) => (
            <article key={item.id} className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenEntry(item.entry.id)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-rose/10 px-3 text-xs font-bold text-rose"
                  >
                    <CalendarDays aria-hidden="true" size={14} />
                    {formatDisplayDate(item.localDate, "short")}
                  </button>
                  <span className="inline-flex min-h-8 items-center rounded-full bg-journal-raised px-3 text-xs font-bold text-warm-gray">
                    {item.categoryLabel}
                  </span>
                  {item.people.map((person) => (
                    <span
                      key={person.id}
                      className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold"
                      style={{ backgroundColor: `${person.color}1f`, color: person.color }}
                    >
                      {person.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenEntry(item.entry.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink"
                  >
                    Open entry
                    <ArrowRight aria-hidden="true" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDetail(item.entry.id, item.detail.id)}
                    disabled={!canEdit}
                    className="grid h-9 w-9 place-items-center rounded-full bg-journal-raised text-warm-gray"
                    aria-label="Delete little detail"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[170px_1fr]">
                <select
                  value={item.detail.category}
                  onChange={(event) =>
                    onUpdateDetail(item.entry.id, item.detail.id, (detail) => ({
                      ...detail,
                      category: event.target.value as DetailCategory
                    }))
                  }
                  disabled={!canEdit}
                  className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 text-sm font-semibold outline-none"
                  aria-label="Edit detail category"
                >
                  {detailCategories.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
                <textarea
                  value={item.detail.text}
                  onChange={(event) =>
                    onUpdateDetail(item.entry.id, item.detail.id, (detail) => ({
                      ...detail,
                      text: event.target.value
                    }))
                  }
                  disabled={!canEdit}
                  className="min-h-16 rounded-2xl border border-journal-line bg-white p-3 outline-none focus:ring-4 focus:ring-rose/15"
                  aria-label="Edit little detail"
                />
              </div>

              {people.length > 0 ? (
                <div className="mt-3">
                  <PersonChips
                    compact
                    people={people}
                    selectedIds={item.detail.personTagIds}
                    disabled={!canEdit}
                    onToggle={(personIdToToggle) =>
                      onUpdateDetail(item.entry.id, item.detail.id, (detail) => ({
                        ...detail,
                        personTagIds: detail.personTagIds.includes(personIdToToggle)
                          ? detail.personTagIds.filter((id) => id !== personIdToToggle)
                          : [...detail.personTagIds, personIdToToggle]
                      }))
                    }
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarView({
  entries,
  people,
  onOpenEntry
}: {
  entries: JournalEntry[];
  people: PersonTag[];
  onOpenEntry: (entryId: string) => void;
}) {
  const [visibleDate, setVisibleDate] = useState(toLocalDate());
  const monthDays = daysInCalendarMonth(visibleDate);
  const entriesByDate = useMemo(() => new Map(entries.map((entry) => [entry.localDate, entry])), [entries]);
  const visible = new Date(`${visibleDate}T00:00:00`);

  function changeMonth(delta: number) {
    const next = new Date(visible);
    next.setMonth(next.getMonth() + delta);
    setVisibleDate(toLocalDate(next));
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader title="Calendar" subtitle="A scannable map of saved days, photo days, and complete entries." />
      <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button onClick={() => changeMonth(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-journal-raised" aria-label="Previous month">
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <h2 className="text-xl font-bold">{visible.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <button onClick={() => changeMonth(1)} className="grid h-10 w-10 place-items-center rounded-full bg-journal-raised" aria-label="Next month">
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const entry = entriesByDate.get(day.date);
            return <CalendarCell key={day.date} date={day.date} inMonth={day.inMonth} entry={entry} onOpenEntry={onOpenEntry} />;
          })}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {entries.slice(0, 4).map((entry) => (
          <MemoryCard key={entry.id} entry={entry} people={people} compact onOpen={onOpenEntry} />
        ))}
      </div>
    </div>
  );
}

function InsightsView({ entries }: { entries: JournalEntry[] }) {
  const summary = streakSummary(entries);
  const photoDays = entries.filter((entry) => entry.photos.length > 0).length;
  const completeDays = entries.filter(isEntryComplete).length;
  const moodCounts = moodOptions.map((mood) => ({
    ...mood,
    count: entries.filter((entry) => entry.mood === mood.id).length
  }));

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader title="Insights" subtitle="Gentle signals about the habit, never guilt for missed days." />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Current streak" value={`${summary.current}`} suffix="days" />
        <MetricCard title="Longest streak" value={`${summary.longest}`} suffix="days" />
        <MetricCard title="Completed" value={`${completeDays}`} suffix="entries" />
      </div>
      <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
        <h2 className="text-xl font-bold">Mood trend</h2>
        <div className="mt-5 grid gap-3">
          {moodCounts.map((mood) => (
            <div key={mood.id} className="grid grid-cols-[80px_1fr_42px] items-center gap-3">
              <span className="text-sm font-bold text-soft-ink">{mood.title}</span>
              <span className="h-3 overflow-hidden rounded-full bg-journal-raised">
                <span
                  className="block h-full rounded-full bg-rose"
                  style={{ width: `${entries.length ? Math.max(8, (mood.count / entries.length) * 100) : 0}%` }}
                />
              </span>
              <span className="text-right text-sm text-warm-gray">{mood.count}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
        <h2 className="text-xl font-bold">Beta note</h2>
        <p className="mt-2 text-warm-gray">
          {photoDays} photo days so far. Premium insights, seasonal recaps, and billing are intentionally deferred until the daily loop feels right.
        </p>
      </section>
    </div>
  );
}

function SettingsView({
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

function ReadOnlyNotice() {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-4 text-sm leading-6 text-warm-gray">
      Viewer access is read-only for this workspace. Memories, prompts, people tags, photos, and deletes are disabled.
    </section>
  );
}

function HouseholdSharingPanel({
  mode,
  workspace,
  members,
  setWorkspaceMembers
}: {
  mode: "demo" | "supabase";
  workspace: Workspace | null;
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
      if (payload.member) upsertMember(payload.member);
      setEmail("");
      setStatus("Member added to this household workspace.");
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
        <div>
          <p className="text-sm leading-6 text-warm-gray">
            {workspace?.kind === "household"
              ? canManageMembers
                ? "Invite someone by email and choose how much they can change."
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

function MemoryLanePanel({
  matches,
  entries,
  onOpenEntry
}: {
  matches: ReturnType<typeof memoryLaneMatches>;
  entries: JournalEntry[];
  onOpenEntry: (entryId: string) => void;
}) {
  const fallback = entries
    .filter((entry) => entry.localDate !== toLocalDate() && isEntryComplete(entry))
    .sort((left, right) => right.localDate.localeCompare(left.localDate))[0];
  const completeCount = entries.filter(isEntryComplete).length;

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Clock3} title="Memory Lane" subtitle="A little window back to recent, monthly, and anniversary moments." />
      <div className="grid gap-3">
        {matches.length > 0
          ? matches.map((match) => {
              const entry = entries.find((candidate) => candidate.id === match.entryId);
              return entry ? (
                <MemoryLaneCard
                  key={match.id}
                  entry={entry}
                  label={memoryLaneLabel(match)}
                  onOpen={onOpenEntry}
                />
              ) : null;
            })
          : fallback
            ? <MemoryLaneCard entry={fallback} label="Recent good thing" onOpen={onOpenEntry} />
            : <MemoryLaneEmpty completeCount={completeCount} />}
      </div>
    </section>
  );
}

function memoryLaneLabel(match: ReturnType<typeof memoryLaneMatches>[number]) {
  if (match.label === "Recent good thing" || match.label === "Yesterday" || match.dayDistance === 0) return match.label;
  return `Around ${match.label}`;
}

function MemoryLaneCard({ entry, label, onOpen }: { entry: JournalEntry; label: string; onOpen: (entryId: string) => void }) {
  const photo = entry.photos[0];
  const text = photo?.caption.trim() || firstResponseExcerpt(entry) || entry.details.find((detail) => detail.text.trim())?.text || "Open memory";

  return (
    <button type="button" onClick={() => onOpen(entry.id)} className="flex gap-3 rounded-2xl bg-journal-raised p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
      <JournalPhoto src={photo?.previewUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-warm-gray">{formatDisplayDate(entry.localDate, "short")}</p>
        <p className="mt-1 line-clamp-2 text-sm text-soft-ink">{text}</p>
      </div>
    </button>
  );
}

function MemoryLaneEmpty({ completeCount }: { completeCount: number }) {
  return (
    <div className="grid gap-2">
      <p className="rounded-2xl bg-journal-raised p-4 text-sm leading-6 text-warm-gray">
        {completeCount === 0
          ? "Keep one thing today and this space will have somewhere to begin."
          : "A few more kept days will give this space something older to return."}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-warm-gray">
        {["1 week", "1 month", "3 months"].map((label) => (
          <span key={label} className="rounded-2xl bg-white px-2 py-3">{label}</span>
        ))}
      </div>
    </div>
  );
}

function MemoryCard({
  entry,
  people,
  compact = false,
  onOpen
}: {
  entry: JournalEntry;
  people: PersonTag[];
  compact?: boolean;
  onOpen?: (entryId: string) => void;
}) {
  const tagged = entryPeople(entry, people);
  const detail = entry.details.find((candidate) => candidate.text.trim());
  const photo = entry.photos[0];
  const primaryText = photo?.caption.trim() || firstResponseExcerpt(entry) || "Open memory";
  return (
    <article className="overflow-hidden rounded-journal border border-journal-line bg-journal-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-photo">
      <button type="button" onClick={() => onOpen?.(entry.id)} className="block h-full w-full text-left">
      <JournalPhoto src={photo?.previewUrl} alt="" className={clsx("w-full object-cover", compact ? "h-40" : "h-60")} loading="lazy" />
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold">{formatDisplayDate(entry.localDate, "short")}</p>
          {isEntryComplete(entry) ? <CheckCircle2 aria-label="Complete entry" className="text-leaf" size={18} /> : null}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-warm-gray">{primaryText}</p>
        {detail ? (
          <p className="mt-3 rounded-2xl bg-journal-raised p-3 text-sm text-soft-ink">
            <span className="font-bold text-rose">Little detail: </span>
            {detail.text}
          </p>
        ) : null}
        {tagged.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tagged.slice(0, 3).map((person) => (
              <span key={person.id} className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${person.color}1f`, color: person.color }}>
                {person.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      </button>
    </article>
  );
}

function CalendarCell({
  date,
  inMonth,
  entry,
  onOpenEntry
}: {
  date: string;
  inMonth: boolean;
  entry?: JournalEntry;
  onOpenEntry: (entryId: string) => void;
}) {
  const day = Number(date.slice(-2));
  const today = date === toLocalDate();
  return (
    <button
      type="button"
      disabled={!entry}
      onClick={() => entry && onOpenEntry(entry.id)}
      className={clsx(
        "min-h-16 rounded-2xl border p-2 text-left transition",
        today ? "border-rose" : "border-journal-line",
        entry ? "bg-journal-raised" : "bg-white/42",
        entry && "hover:-translate-y-0.5 hover:bg-white hover:shadow-sm",
        !inMonth && "opacity-40"
      )}
      aria-label={`${formatDisplayDate(date)}${entry ? ", has journal entry" : ", no entry"}`}
    >
      <p className={clsx("text-sm font-bold", today && "text-rose")}>{day}</p>
      <div className="mt-2 flex gap-1">
        {entry?.photos.length ? <Camera aria-hidden="true" size={14} className="text-rose" /> : null}
        {entry && isEntryComplete(entry) ? <CheckCircle2 aria-hidden="true" size={14} className="text-leaf" /> : null}
      </div>
    </button>
  );
}

function EntryDetailModal({ entry, people, onClose }: { entry: JournalEntry; people: PersonTag[]; onClose: () => void }) {
  const tagged = entryPeople(entry, people);
  const responses = entry.sessions.flatMap((session) => session.responses).filter((response) => response.text.trim());

  return (
    <div className="fixed inset-0 z-50 grid bg-ink/42 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Memory detail">
      <section className="journal-scrollbar relative mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[30px] bg-journal-surface shadow-photo">
        <div className="flex items-start justify-between gap-4 border-b border-journal-line p-5 sm:p-6">
          <div>
            <p className="text-sm font-bold text-rose">{formatDisplayDate(entry.localDate)}</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Memory from this day</h2>
            <p className="mt-1 text-sm text-warm-gray">Photos, nice things, people, and tiny details saved together.</p>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-journal-raised text-soft-ink" aria-label="Close memory">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="journal-scrollbar overflow-y-auto p-5 sm:p-6">
          {entry.photos.length > 0 ? (
            <div className={clsx("grid gap-3", entry.photos.length > 1 ? "md:grid-cols-2" : "")}>
              {entry.photos.map((photo) => (
                <figure key={photo.id} className="grid gap-2">
                  <JournalPhoto src={photo.previewUrl} alt={photo.caption || "Journal memory"} className="max-h-[520px] w-full rounded-[24px] object-cover shadow-sm" />
                  {photo.caption.trim() ? <figcaption className="px-1 text-sm font-semibold text-soft-ink">{photo.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-[24px] bg-[linear-gradient(135deg,#8da38e,#e6c392_52%,#b96464)] p-8 text-center text-white">
              <div>
                <Sparkles aria-hidden="true" className="mx-auto" size={28} />
                <p className="mt-3 text-lg font-bold">A text-only memory, still worth keeping.</p>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="grid gap-4">
              {responses.length > 0 ? (
                <section className="rounded-journal border border-journal-line bg-white p-5">
                  <h3 className="text-lg font-bold">Reflections</h3>
                  <div className="mt-4 grid gap-4">
                    {responses.map((response) => (
                      <article key={response.id} className="rounded-2xl bg-journal-raised p-4">
                        <p className="text-sm font-bold text-rose">{response.promptText}</p>
                        <p className="mt-2 whitespace-pre-line text-soft-ink">{response.text}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {entry.details.length > 0 ? (
                <section className="rounded-journal border border-journal-line bg-white p-5">
                  <h3 className="text-lg font-bold">Little Details</h3>
                  <div className="mt-4 grid gap-3">
                    {entry.details.map((detail) => {
                      const detailPeople = people.filter((person) => detail.personTagIds.includes(person.id));
                      return (
                        <article key={detail.id} className="rounded-2xl bg-journal-raised p-4">
                          <p className="text-soft-ink">{detail.text}</p>
                          {detailPeople.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {detailPeople.map((person) => (
                                <span key={person.id} className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${person.color}1f`, color: person.color }}>
                                  {person.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="grid content-start gap-4">
              <section className="rounded-journal border border-journal-line bg-white p-5">
                <h3 className="font-bold">People</h3>
                {tagged.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tagged.map((person) => (
                      <span key={person.id} className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ backgroundColor: `${person.color}1f`, color: person.color }}>
                        {person.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-warm-gray">No people tagged.</p>
                )}
              </section>

              <section className="rounded-journal border border-journal-line bg-white p-5">
                <h3 className="font-bold">Saved because</h3>
                <p className="mt-2 text-sm text-warm-gray">
                  {isEntryComplete(entry)
                    ? "This day has at least one photo or reflection, so it counts toward the habit."
                    : "This entry is still open for a photo or a few words."}
                </p>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

function JournalPhoto({
  src,
  alt,
  className,
  loading
}: {
  src?: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(!src);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (image.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <span className={clsx("grid place-items-center bg-journal-raised text-warm-gray", className)} aria-label={alt || "Memory without a loaded photo"}>
        <Sparkles aria-hidden="true" />
      </span>
    );
  }

  return <img ref={imageRef} src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}

function PromptSnapshot({ prompts }: { prompts: PromptTemplate[] }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Bell} title="Today's prompts" />
      <div className="grid gap-2">
        {prompts.filter((prompt) => prompt.isEnabled).map((prompt) => (
          <p key={prompt.id} className="rounded-2xl bg-journal-raised p-3 text-sm text-soft-ink">{prompt.prompt}</p>
        ))}
      </div>
    </section>
  );
}

function CompletionCard({ entry }: { entry: JournalEntry }) {
  const complete = isEntryComplete(entry);
  const photoText = entry.photos.length ? `${entry.photos.length} photo${entry.photos.length === 1 ? "" : "s"}` : null;
  const detailText = entry.details.length ? `${entry.details.length} little detail${entry.details.length === 1 ? "" : "s"}` : null;
  const responseCount = entry.sessions.flatMap((session) => session.responses).filter((response) => response.text.trim()).length;
  const captionCount = entry.photos.filter((photo) => photo.caption.trim()).length;
  const savedPieces = [photoText, responseCount ? `${responseCount} reflection${responseCount === 1 ? "" : "s"}` : null, detailText].filter(Boolean);
  return (
    <section className={clsx("rounded-journal border p-5", complete ? "border-leaf/20 bg-leaf/10" : "border-journal-line bg-journal-surface")}>
      <p className={clsx("flex items-center gap-2 font-bold", complete ? "text-leaf" : "text-soft-ink")}>
        <CheckCircle2 aria-hidden="true" size={19} />
        {complete ? "Today is kept" : "Still open"}
      </p>
      <p className="mt-2 text-sm text-warm-gray">
        {complete
          ? `${savedPieces.join(", ") || "A good thing"} saved. This day already has a place to live.`
          : "Add one photo or one nice thing when you are ready."}
      </p>
      {complete ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-soft-ink">
          <span className="rounded-2xl bg-white/70 px-2 py-3">{entry.photos.length ? "Photo day" : "Text day"}</span>
          <span className="rounded-2xl bg-white/70 px-2 py-3">{captionCount ? `${captionCount} caption${captionCount === 1 ? "" : "s"}` : "Caption open"}</span>
          <span className="rounded-2xl bg-white/70 px-2 py-3">{entry.details.length ? "Details kept" : "Details open"}</span>
        </div>
      ) : null}
    </section>
  );
}

function PersonChips({
  people,
  selectedIds,
  onToggle,
  compact = false,
  disabled = false
}: {
  people: PersonTag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {people.map((person) => {
        const active = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            onClick={() => onToggle(person.id)}
            disabled={disabled}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 font-bold",
              compact ? "min-h-8 text-xs" : "min-h-10 text-sm",
              active ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray"
            )}
            style={active ? { backgroundColor: `${person.color}1f`, color: person.color } : undefined}
            aria-pressed={active}
          >
            {active ? <CheckCircle2 aria-hidden="true" size={14} /> : null}
            {person.name}
          </button>
        );
      })}
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header>
      <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-warm-gray">{subtitle}</p>
    </header>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose/10 text-rose">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div>
        <h2 className="font-bold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-warm-gray">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function StreakPill({ days }: { days: number }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rose/10 px-4 text-sm font-bold text-rose">
      <Sparkles aria-hidden="true" size={16} />
      {days} day streak
    </span>
  );
}

function SaveStatePill({ state, error }: { state: SaveState; error?: string | null }) {
  const labelByState: Record<SaveState, string> = {
    saved: "Saved",
    saving: "Saving",
    offline: "Offline",
    error: "Sync issue",
    local: "Local only",
    readonly: "Read only"
  };
  return (
    <span
      title={error ?? undefined}
      className={clsx(
        "inline-flex rounded-full px-3 py-1.5 text-xs font-bold",
        state === "error" ? "bg-rose/10 text-rose" : state === "saved" ? "bg-leaf/10 text-leaf" : "bg-white text-warm-gray"
      )}
    >
      {labelByState[state]}
    </span>
  );
}

function MetricCard({ title, value, suffix }: { title: string; value: string; suffix: string }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <p className="text-sm font-bold text-warm-gray">{title}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
      <p className="text-sm text-warm-gray">{suffix}</p>
    </section>
  );
}

function MemoryStatPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <section className="flex min-h-16 items-center gap-3 rounded-journal border border-journal-line bg-journal-surface px-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose/10 text-rose">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </section>
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

function EmptyState({ title, message, action, actionLabel = "Open Today" }: { title: string; message: string; action: () => void; actionLabel?: string }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-8 text-center">
      <Sparkles aria-hidden="true" className="mx-auto text-rose" size={32} />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-warm-gray">{message}</p>
      <button onClick={action} className="mt-5 rounded-full bg-rose px-5 py-3 font-bold text-white">{actionLabel}</button>
    </section>
  );
}

function makeEntry(workspaceId: string, localDate: string, prompts: PromptTemplate[], cadence: RitualCadence): JournalEntry {
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

function trimTrailingBlankLines(lines: string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && !next[next.length - 1]?.trim()) {
    next.pop();
  }
  return next;
}

function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(String(reader.result));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => resolve(String(reader.result));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function responseErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
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
