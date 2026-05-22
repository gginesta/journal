"use client";

/* eslint-disable @next/next/no-img-element -- Journal photos can be local data URLs or private signed storage URLs. */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import {
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
  Workspace
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AppTab = "today" | "memories" | "calendar" | "insights" | "settings";
type SaveState = "saved" | "saving" | "offline";
type MemoryFilter = "all" | "photos" | "text";
type DetailCategory = MemoryDetail["category"];

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

const detailCategories: Array<{ id: DetailCategory; title: string }> = [
  { id: "note", title: "Note" },
  { id: "phrase", title: "Phrase" },
  { id: "favorite", title: "Favorite" },
  { id: "routine", title: "Routine" },
  { id: "milestone", title: "Milestone" },
  { id: "quote", title: "Quote" }
];

const storageKey = "photo-gratitude-web-state-v1";

export function JournalApp({ initialData }: { initialData: JournalBootstrap }) {
  const [tab, setTab] = useState<AppTab>("today");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialData.activeWorkspaceId);
  const [workspaces, setWorkspaces] = useState(initialData.workspaces);
  const [people, setPeople] = useState(initialData.people);
  const [prompts, setPrompts] = useState(initialData.prompts);
  const [entries, setEntries] = useState(initialData.entries);
  const [reminders, setReminders] = useState(initialData.reminders);
  const [saveState, setSaveState] = useState<SaveState>(initialData.mode === "demo" ? "offline" : "saved");
  const [isPending, startTransition] = useTransition();
  const didMountPersistence = useRef(false);

  useEffect(() => {
    if (initialData.mode !== "demo") return;
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as Pick<JournalBootstrap, "entries" | "people" | "prompts" | "workspaces" | "reminders" | "activeWorkspaceId">;
      setEntries(parsed.entries);
      setPeople(parsed.people);
      setPrompts(parsed.prompts);
      setWorkspaces(parsed.workspaces);
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
      JSON.stringify({ entries, people, prompts, workspaces, reminders, activeWorkspaceId })
    );
  }, [entries, people, prompts, workspaces, reminders, activeWorkspaceId, initialData.mode]);

  useEffect(() => {
    function updateOfflineState() {
      if (!navigator.onLine) {
        setSaveState("offline");
      } else if (initialData.mode === "supabase") {
        setSaveState("saved");
      }
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
    if (!didMountPersistence.current) {
      didMountPersistence.current = true;
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/journal/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            people: workspacePeople,
            prompts: workspacePrompts,
            reminders,
            entries: workspaceEntries
          })
        });

        if (!response.ok) throw new Error("Sync failed");
        setSaveState("saved");
      } catch {
        setSaveState("offline");
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [activeWorkspaceId, workspaceEntries, workspacePeople, workspacePrompts, reminders, initialData.mode, initialData.profile]);

  useEffect(() => {
    setEntries((current) => {
      if (current.some((entry) => entry.id === todayEntry.id)) return current;
      return [todayEntry, ...current];
    });
  }, [todayEntry]);

  function mutateEntries(updater: (entries: JournalEntry[]) => JournalEntry[]) {
    setSaveState("saving");
    startTransition(() => {
      setEntries((current) => updater(current));
      if (initialData.mode === "demo") {
        window.setTimeout(() => setSaveState("offline"), 450);
      }
    });
  }

  function updateEntry(entryId: string, updater: (entry: JournalEntry) => JournalEntry) {
    mutateEntries((current) => current.map((entry) => (entry.id === entryId ? updater(entry) : entry)));
  }

  function addPerson(name: string): PersonTag | null {
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
    setSaveState("saving");
    setPeople((current) => [...current, person]);
    return person;
  }

  async function addWorkspace(kind: "personal" | "household") {
    if (initialData.mode === "supabase") {
      setSaveState("saving");
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
      setSaveState("offline");
      return;
    }

    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: kind === "personal" ? "My journal" : "Household journal",
      kind,
      role: "owner"
    };
    setWorkspaces((current) => [...current, workspace]);
    setActiveWorkspaceId(workspace.id);
  }

  async function deleteWorkspaceEntries() {
    setEntries((current) => current.filter((entry) => entry.workspaceId !== activeWorkspaceId));
    if (initialData.mode !== "supabase") return;

    setSaveState("saving");
    const response = await fetch("/api/journal/delete-workspace-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspaceId })
    });
    setSaveState(response.ok ? "saved" : "offline");
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    window.location.href = "/login";
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
          mode={initialData.mode}
        />

        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          {tab === "today" ? (
            <TodayView
              entry={todayEntry}
              entries={workspaceEntries}
              people={workspacePeople}
              prompts={workspacePrompts}
              saveState={saveState}
              onUpdateEntry={updateEntry}
              onAddPerson={addPerson}
              onOpenEntry={setSelectedEntryId}
            />
          ) : null}

          {tab === "memories" ? (
            <MemoriesView
              entries={workspaceEntries}
              people={workspacePeople}
              onOpenToday={() => setTab("today")}
              onOpenEntry={setSelectedEntryId}
            />
          ) : null}

          {tab === "calendar" ? <CalendarView entries={workspaceEntries} people={workspacePeople} onOpenEntry={setSelectedEntryId} /> : null}

          {tab === "insights" ? <InsightsView entries={workspaceEntries} /> : null}

          {tab === "settings" ? (
            <SettingsView
              profile={initialData.profile}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              reminders={reminders}
              prompts={workspacePrompts}
              people={workspacePeople}
              entries={workspaceEntries}
              setActiveWorkspaceId={setActiveWorkspaceId}
              setReminders={setReminders}
              setPrompts={setPrompts}
              setPeople={setPeople}
              addWorkspace={addWorkspace}
              deleteWorkspaceData={deleteWorkspaceEntries}
              signOut={signOut}
            />
          ) : null}
        </main>
      </div>

      <MobileTabs activeTab={tab} setTab={setTab} />
      {selectedEntry ? <EntryDetailModal entry={selectedEntry} people={workspacePeople} onClose={() => setSelectedEntryId(null)} /> : null}
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
  mode
}: {
  activeTab: AppTab;
  setTab: (tab: AppTab) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;
  saveState: SaveState;
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
          <SaveStatePill state={saveState} />
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

function TodayView({
  entry,
  entries,
  people,
  prompts,
  saveState,
  onUpdateEntry,
  onAddPerson,
  onOpenEntry
}: {
  entry: JournalEntry;
  entries: JournalEntry[];
  people: PersonTag[];
  prompts: PromptTemplate[];
  saveState: SaveState;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
  onAddPerson: (name: string) => PersonTag | null;
  onOpenEntry: (entryId: string) => void;
}) {
  const summary = streakSummary(entries);
  const matches = memoryLaneMatches(entries).filter((match) => match.entryId !== entry.id);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warm-gray">{formatDisplayDate(entry.localDate)}</p>
            <h1 className="mt-2 max-w-2xl text-4xl font-bold leading-[1.02] tracking-normal sm:text-5xl">
              What felt good today?
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StreakPill days={summary.current} />
            <SaveStatePill state={saveState} />
          </div>
        </header>

        <PhotoHero
          entry={entry}
          onAddPhoto={(photo) =>
            onUpdateEntry(entry.id, (current) => ({
              ...current,
              photos: [...current.photos, photo].slice(0, 2),
              updatedAt: new Date().toISOString()
            }))
          }
          onRemovePhoto={(photoId) =>
            onUpdateEntry(entry.id, (current) => ({
              ...current,
              photos: current.photos.filter((photo) => photo.id !== photoId),
              updatedAt: new Date().toISOString()
            }))
          }
        />

        <PromptPanel entry={entry} onUpdateEntry={onUpdateEntry} />
        <PeoplePanel entry={entry} people={people} onUpdateEntry={onUpdateEntry} onAddPerson={onAddPerson} />
        <LittleDetailsPanel entry={entry} people={people} onUpdateEntry={onUpdateEntry} />
        <MoodPanel entry={entry} onUpdateEntry={onUpdateEntry} />
      </section>

      <aside className="grid content-start gap-5">
        <CompletionCard entry={entry} />
        <MemoryLanePanel matches={matches} entries={entries} onOpenEntry={onOpenEntry} />
        <PromptSnapshot prompts={prompts} />
      </aside>
    </div>
  );
}

function PhotoHero({
  entry,
  onAddPhoto,
  onRemovePhoto
}: {
  entry: JournalEntry;
  onAddPhoto: (photo: PhotoAttachment) => void;
  onRemovePhoto: (photoId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heroPhoto = entry.photos[0];
  const remainingSlots = Math.max(0, 2 - entry.photos.length);

  async function handleFiles(files: FileList | null) {
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
      for (const file of selected) {
        const previewUrl = await fileToCompressedDataUrl(file);
        onAddPhoto({
          id: crypto.randomUUID(),
          entryId: entry.id,
          storagePath: "",
          thumbnailPath: "",
          previewUrl,
          caption: "",
          sortOrder: entry.photos.length,
          createdAt: new Date().toISOString()
        });
      }
      setStatus("Photo saved locally for the beta.");
    } catch {
      setError("That photo could not be added. Try a smaller image or a different file.");
      setStatus(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] bg-ink shadow-photo">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex min-h-[290px] w-full items-end overflow-hidden p-5 text-left text-white sm:min-h-[470px] sm:p-6"
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
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">Photo of the day</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight">
            {entry.photos.length === 0 ? "Start with one photo, if one moment stands out." : "Let the photo hold most of the story."}
          </h2>
          <p className="mt-2 text-sm text-white/86">
            {entry.photos.length < 2 ? "One or two photos is plenty. Text is optional." : "Two photos saved. Tap remove if today feels simpler."}
          </p>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-3 bg-journal-surface p-4">
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={remainingSlots === 0}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white"
        >
          <ImagePlus aria-hidden="true" size={18} />
          {entry.photos.length === 0 ? "Add photo" : remainingSlots > 0 ? "Add one more" : "Two photos saved"}
        </button>

        {entry.photos.map((photo) => (
          <div key={photo.id} className="group relative">
            <img src={photo.previewUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            <button
              type="button"
              onClick={() => onRemovePhoto(photo.id)}
              className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-white shadow"
              aria-label="Remove photo"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ))}
        <div className="min-w-[180px] flex-1 text-sm text-warm-gray">
          {error ? <p className="font-semibold text-rose">{error}</p> : <p>{status ?? `${remainingSlots} photo slot${remainingSlots === 1 ? "" : "s"} open.`}</p>}
        </div>
      </div>
    </section>
  );
}

function PromptPanel({
  entry,
  onUpdateEntry
}: {
  entry: JournalEntry;
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
              value={lines[index] ?? ""}
              onChange={(event) => {
                const next = [...lines];
                next[index] = event.target.value;
                updateResponse(primary.id, trimTrailingBlankLines(next).join("\n"));
              }}
              rows={1}
              placeholder={["A small good thing", "Another nice moment", "One more, if it fits"][index]}
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
  onUpdateEntry,
  onAddPerson
}: {
  entry: JournalEntry;
  people: PersonTag[];
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
      <PersonChips people={people} selectedIds={entry.personTagIds} onToggle={toggle} />
      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
          placeholder="Add a private person"
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-journal-line bg-journal-raised px-3 outline-none focus:ring-4 focus:ring-rose/15"
        />
        <button onClick={add} className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose" aria-label="Add person">
          <Plus aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function LittleDetailsPanel({
  entry,
  people,
  onUpdateEntry
}: {
  entry: JournalEntry;
  people: PersonTag[];
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
          className="min-h-11 min-w-0 flex-1 rounded-2xl border border-journal-line bg-journal-raised px-3 outline-none focus:ring-4 focus:ring-rose/15"
        />
        <button onClick={addDetail} className="grid h-11 w-11 place-items-center rounded-full bg-rose/10 text-rose" aria-label="Add little detail">
          <Plus aria-hidden="true" />
        </button>
        </div>
      </div>
    </section>
  );
}

function MoodPanel({
  entry,
  onUpdateEntry
}: {
  entry: JournalEntry;
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
  onOpenEntry
}: {
  entries: JournalEntry[];
  people: PersonTag[];
  onOpenToday: () => void;
  onOpenEntry: (entryId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemoryFilter>("all");

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
  workspaces,
  activeWorkspaceId,
  reminders,
  prompts,
  people,
  entries,
  setActiveWorkspaceId,
  setReminders,
  setPrompts,
  setPeople,
  addWorkspace,
  deleteWorkspaceData,
  signOut
}: {
  profile: { email: string; displayName: string } | null;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  reminders: ReminderPreferences;
  prompts: PromptTemplate[];
  people: PersonTag[];
  entries: JournalEntry[];
  setActiveWorkspaceId: (id: string) => void;
  setReminders: (preferences: ReminderPreferences) => void;
  setPrompts: React.Dispatch<React.SetStateAction<PromptTemplate[]>>;
  setPeople: React.Dispatch<React.SetStateAction<PersonTag[]>>;
  addWorkspace: (kind: "personal" | "household") => void;
  deleteWorkspaceData: () => void;
  signOut: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <PageHeader title="Settings" subtitle="Plain controls for privacy, prompts, people, export, and household access." />
      <SettingsSection title="Account">
        <p className="text-warm-gray">{profile?.email ?? "Local demo user"}</p>
        <button onClick={signOut} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-bold text-white">
          <LogOut aria-hidden="true" size={16} />
          Sign out
        </button>
      </SettingsSection>

      <SettingsSection title="Workspaces">
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

      <SettingsSection title="Reminders">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold text-soft-ink">
            Cadence
            <select
              value={reminders.cadence}
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
              onChange={(event) => setReminders({ ...reminders, eveningTime: event.target.value })}
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-normal outline-none"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-soft-ink">
            Morning
            <input
              type="time"
              value={reminders.morningTime}
              onChange={(event) => setReminders({ ...reminders, morningTime: event.target.value })}
              className="min-h-11 rounded-2xl border border-journal-line bg-white px-3 font-normal outline-none"
            />
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Prompts">
        <div className="grid gap-3">
          {prompts.map((prompt) => (
            <input
              key={prompt.id}
              value={prompt.prompt}
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
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((person) => (
            <input
              key={person.id}
              value={person.name}
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
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-journal-raised px-4 text-sm font-bold text-rose"
          >
            <Trash2 aria-hidden="true" size={16} />
            Delete workspace entries
          </button>
        </div>
      </SettingsSection>
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
  const fallback = entries.find((entry) => entry.localDate !== toLocalDate());

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Clock3} title="Memory Lane" subtitle="A little window back to days like this one." />
      <div className="grid gap-3">
        {matches.length > 0
          ? matches.map((match) => {
              const entry = entries.find((candidate) => candidate.id === match.entryId);
              return entry ? (
                <MemoryLaneCard
                  key={match.id}
                  entry={entry}
                  label={match.dayDistance === 0 ? match.label : `Around ${match.label}`}
                  onOpen={onOpenEntry}
                />
              ) : null;
            })
          : fallback
            ? <MemoryLaneCard entry={fallback} label="Recent memory" onOpen={onOpenEntry} />
            : <p className="rounded-2xl bg-journal-raised p-4 text-sm text-warm-gray">Older entries will appear here as your journal grows.</p>}
      </div>
    </section>
  );
}

function MemoryLaneCard({ entry, label, onOpen }: { entry: JournalEntry; label: string; onOpen: (entryId: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(entry.id)} className="flex gap-3 rounded-2xl bg-journal-raised p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
      {entry.photos[0] ? (
        <img src={entry.photos[0].previewUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
      ) : (
        <span className="grid h-20 w-20 place-items-center rounded-2xl bg-mist text-warm-gray">
          <Sparkles aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-warm-gray">{formatDisplayDate(entry.localDate, "short")}</p>
        <p className="mt-1 line-clamp-2 text-sm text-soft-ink">{firstResponseExcerpt(entry) ?? "Open memory"}</p>
      </div>
    </button>
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
  return (
    <article className="overflow-hidden rounded-journal border border-journal-line bg-journal-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-photo">
      <button type="button" onClick={() => onOpen?.(entry.id)} className="block h-full w-full text-left">
      {entry.photos[0] ? (
        <img src={entry.photos[0].previewUrl} alt="" className={clsx("w-full object-cover", compact ? "h-40" : "h-60")} loading="lazy" />
      ) : (
        <div className={clsx("grid place-items-center bg-journal-raised text-warm-gray", compact ? "h-28" : "h-44")}>
          <Sparkles aria-hidden="true" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold">{formatDisplayDate(entry.localDate, "short")}</p>
          {isEntryComplete(entry) ? <CheckCircle2 aria-label="Complete entry" className="text-leaf" size={18} /> : null}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-warm-gray">{firstResponseExcerpt(entry) ?? "Open memory"}</p>
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
                <img key={photo.id} src={photo.previewUrl} alt={photo.caption || "Journal memory"} className="max-h-[520px] w-full rounded-[24px] object-cover shadow-sm" />
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
  const savedPieces = [photoText, responseCount ? `${responseCount} reflection${responseCount === 1 ? "" : "s"}` : null, detailText].filter(Boolean);
  return (
    <section className={clsx("rounded-journal border p-5", complete ? "border-leaf/20 bg-leaf/10" : "border-journal-line bg-journal-surface")}>
      <p className={clsx("flex items-center gap-2 font-bold", complete ? "text-leaf" : "text-soft-ink")}>
        <CheckCircle2 aria-hidden="true" size={19} />
        {complete ? "Today is kept" : "Still open"}
      </p>
      <p className="mt-2 text-sm text-warm-gray">
        {complete
          ? `${savedPieces.join(", ") || "A good thing"} saved. You can keep editing, but this day already has a place to live.`
          : "Add one photo or one nice thing when you are ready."}
      </p>
    </section>
  );
}

function PersonChips({
  people,
  selectedIds,
  onToggle,
  compact = false
}: {
  people: PersonTag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {people.map((person) => {
        const active = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            onClick={() => onToggle(person.id)}
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

function SaveStatePill({ state }: { state: SaveState }) {
  const label = state === "saving" ? "Saving" : state === "offline" ? "Saved locally" : "Saved";
  return <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-warm-gray">{label}</span>;
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

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action: () => void }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-8 text-center">
      <Sparkles aria-hidden="true" className="mx-auto text-rose" size={32} />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-warm-gray">{message}</p>
      <button onClick={action} className="mt-5 rounded-full bg-rose px-5 py-3 font-bold text-white">Open Today</button>
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

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
