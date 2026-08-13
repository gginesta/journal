import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import type { JournalEntry, JournalSession, MemoryDetail, Mood, PersonTag, PromptTemplate, Workspace } from "@/types/journal";
import { formatDisplayDate, toLocalDate } from "@/lib/dates";
import { isFeatureVisible, type ExperienceMode } from "@/lib/experience-mode";
import { firstResponseExcerpt, isEntryComplete, memoryLaneMatches, streakSummary } from "@/lib/journal-logic";
import { addSuggestionToReflectionText, gratitudeGuideForEntry } from "@/lib/prompts";
import { meaningfulFirstMemoryEntries } from "@/lib/first-memory-celebration";
import { FirstMemoryCelebration } from "@/components/wow/FirstMemoryCelebration";
import { LittleDetailsNudge } from "@/components/wow/LittleDetailsNudge";
import {
  detailCategories,
  moodOptions,
  normalizePhotoOrder,
  type DetailCategory,
  type SaveState
} from "@/components/journal/helpers";
import { quietExhaleStorageKey, savedSummary, visibleNiceThingRowCount } from "@/components/journal/today-logic";
import { MemoryLanePanel } from "@/components/journal/MemoryLane";
import { PhotoHero } from "@/components/journal/PhotoHero";
import {
  JournalPhoto,
  PersonChips,
  PromptSnapshot,
  ReadOnlyNotice,
  SaveStatePill,
  SectionTitle
} from "@/components/journal/shared";

// Warm Album Today: one keepsake photo hero as the emotional anchor, the
// numbered nice-things list, the quiet-exhale completion, and Memory Lane as
// the fixed signature slot after completion. Full mode adds mood, people, and
// Little Details as quiet optional rows, each marked by an eyebrow label.
export function TodayView({
  entry,
  entries,
  experienceMode,
  people,
  workspace,
  prompts,
  saveState,
  saveError,
  canEdit,
  showStarterGuide,
  showFirstMemoryCelebration,
  onUpdateEntry,
  onAddPerson,
  isEntryStale = false,
  currentUserId = null,
  memberNames = {},
  guideRequestToken = 0,
  onOpenEntry,
  onFocusFirstReflection,
  onDismissStarterGuide,
  onDismissFirstMemoryCelebration
}: {
  entry: JournalEntry;
  entries: JournalEntry[];
  experienceMode: ExperienceMode;
  people: PersonTag[];
  workspace: Workspace | null;
  prompts: PromptTemplate[];
  saveState: SaveState;
  saveError: string | null;
  canEdit: boolean;
  showStarterGuide: boolean;
  showFirstMemoryCelebration: boolean;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
  onAddPerson: (name: string) => PersonTag | null;
  onOpenEntry: (entryId: string) => void;
  onFocusFirstReflection: () => void;
  onDismissStarterGuide: () => void;
  onDismissFirstMemoryCelebration: () => void;
  isEntryStale?: boolean;
  currentUserId?: string | null;
  memberNames?: Record<string, string>;
  // Bumped by the mobile "More" menu to open the gentle starters from anywhere.
  guideRequestToken?: number;
}) {
  const [showMoreForToday, setShowMoreForToday] = useState(false);
  const [startersOpen, setStartersOpen] = useState(false);
  const today = toLocalDate();
  const summary = useMemo(() => streakSummary(entries, today), [entries, today]);
  const matches = useMemo(
    () => memoryLaneMatches(entries, today).filter((match) => match.entryId !== entry.id),
    [entries, today, entry.id]
  );
  const firstMeaningfulEntry = meaningfulFirstMemoryEntries(entries)[0] ?? entry;
  const isFull = experienceMode === "full";
  const guideVisible = isFeatureVisible(experienceMode, "gratitudeGuide");
  const complete = isEntryComplete(entry);
  const exhale = useQuietExhale(entry.workspaceId, entry.localDate);
  const guide = gratitudeGuideForEntry({
    localDate: entry.localDate,
    mood: entry.mood,
    hasRelationships: entry.personTagIds.length > 0 || people.length > 1
  });

  useEffect(() => {
    if (!guideRequestToken || !guideVisible) return;
    setStartersOpen(true);
    window.setTimeout(() => {
      document.getElementById("gratitude-starters")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [guideRequestToken, guideVisible]);

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

  const startersBlock = guideVisible ? (
    <GratitudeStarters
      guide={guide}
      canEdit={canEdit}
      open={startersOpen}
      onToggle={() => setStartersOpen((current) => !current)}
      onUseSuggestion={useGuideSuggestion}
    />
  ) : null;

  return (
    <div className={clsx("mx-auto grid gap-6", isFull ? "max-w-6xl xl:grid-cols-[minmax(0,1fr)_360px]" : "max-w-2xl")}>
      <section className="grid gap-4">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warm-gray">
              {formatDisplayDate(entry.localDate)}
              {summary.completedDays === 0 ? " · Day one" : ""}
            </p>
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

        {isEntryStale ? (
          <section className="rounded-journal border border-dawn/40 bg-dawn/10 p-4 text-sm leading-6 text-soft-ink" role="status">
            <p className="font-bold">This day changed on another device.</p>
            <p className="mt-1">
              The newer copy was kept safe. Refresh this page to see it before editing again, so nothing gets lost.
            </p>
          </section>
        ) : null}

        {showFirstMemoryCelebration ? (
          <FirstMemoryCelebration
            entry={firstMeaningfulEntry}
            onDismiss={onDismissFirstMemoryCelebration}
            onOpenMemoryLane={() => onOpenEntry(firstMeaningfulEntry.id ?? entry.id)}
          />
        ) : null}

        {showStarterGuide ? (
          <StarterGuideCard
            entry={entry}
            onFocusFirstReflection={onFocusFirstReflection}
            onDismiss={onDismissStarterGuide}
          />
        ) : null}

        {/* The keepsake card + nice things breathe together during the
            quiet-exhale save; the wrapper is still on every other render. */}
        <div className={clsx("grid gap-4", exhale.phase === "playing" ? "wa-exhale" : null)}>
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
          <PromptPanel
            entry={entry}
            prompts={prompts}
            canEdit={canEdit}
            currentUserId={currentUserId}
            memberNames={memberNames}
            onUpdateEntry={onUpdateEntry}
            footer={startersBlock}
          />
        </div>

        <CompletionMoment entry={entry} complete={complete} canEdit={canEdit} phase={exhale.phase} onKeep={exhale.keep} />

        {/* SPEC-7: Simple hides the metadata inputs. Their stored data still
            renders in the entry detail modal and stays searchable. */}
        {isFeatureVisible(experienceMode, "littleDetailsPanel") ? (
          <LittleDetailsPanel entry={entry} people={people} workspace={workspace} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
        ) : null}
        {isFeatureVisible(experienceMode, "moodPicker") ? (
          <MoodPanel entry={entry} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
        ) : null}
        {isFeatureVisible(experienceMode, "peopleTags") ? (
          <PeoplePanel entry={entry} people={people} canEdit={canEdit} onUpdateEntry={onUpdateEntry} onAddPerson={onAddPerson} />
        ) : null}

        {/* SPEC-7: Memory Lane is the fixed signature slot after completion —
            the read-only rediscovery payoff that makes the ritual worth it. */}
        <MemoryLanePanel matches={matches} entries={entries} onOpenEntry={onOpenEntry} />
      </section>

      {isFull ? (
        <aside aria-label="More for today" className="grid content-start gap-5">
          <button
            type="button"
            onClick={() => setShowMoreForToday((current) => !current)}
            aria-expanded={showMoreForToday}
            className="flex min-h-12 items-center justify-between rounded-journal border border-journal-line bg-journal-surface px-5 text-left text-sm font-bold text-soft-ink xl:hidden"
          >
            More for today
            <ChevronDown aria-hidden="true" size={18} className={clsx("transition", showMoreForToday ? "rotate-180" : "")} />
          </button>
          <div className={clsx("grid gap-5", showMoreForToday ? "" : "hidden xl:grid")}>
            {isFeatureVisible(experienceMode, "pickMeUpMemory") ? (
              <PickMeUpMemoryCard entries={entries} onOpenEntry={onOpenEntry} />
            ) : null}
            {isFeatureVisible(experienceMode, "promptSnapshot") ? (
              <div className="hidden xl:block">
                <PromptSnapshot prompts={prompts} />
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

type ExhalePhase = "open" | "playing" | "kept";

// The quiet exhale plays once per day (localStorage flag, mirroring the
// first-memory celebration); editing after completion never re-plays it, and
// reduced motion jumps straight to the settled band.
function useQuietExhale(workspaceId: string, localDate: string) {
  const storageKey = quietExhaleStorageKey(workspaceId, localDate);
  const [phase, setPhase] = useState<ExhalePhase>("open");

  useEffect(() => {
    setPhase(window.localStorage.getItem(storageKey) === "true" ? "kept" : "open");
  }, [storageKey]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setTimeout(() => setPhase("kept"), 2400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function keep() {
    if (phase !== "open") return;
    window.localStorage.setItem(storageKey, "true");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduced ? "kept" : "playing");
  }

  return { phase, keep };
}

function CompletionMoment({
  entry,
  complete,
  canEdit,
  phase,
  onKeep
}: {
  entry: JournalEntry;
  complete: boolean;
  canEdit: boolean;
  phase: ExhalePhase;
  onKeep: () => void;
}) {
  if (!complete) {
    return (
      <section className="rounded-journal border border-journal-line bg-journal-surface p-4">
        <p className="font-bold text-soft-ink">Still open</p>
        <p className="mt-1 text-sm text-warm-gray">Add one photo or one nice thing when you are ready.</p>
      </section>
    );
  }

  // Viewers and revisits see the settled band; the ceremony only plays on the
  // editor's first "Keep today" of the day.
  if (canEdit && phase === "open") {
    return (
      <button
        type="button"
        onClick={onKeep}
        className="min-h-14 w-full rounded-full bg-rose text-base font-bold text-white shadow-[0_12px_30px_rgba(173,49,69,0.3)] transition hover:bg-rose-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
      >
        Keep today
      </button>
    );
  }

  const playing = phase === "playing";

  return (
    <div className="relative">
      {playing ? (
        <>
          <div
            aria-hidden="true"
            className="wa-glow pointer-events-none absolute -inset-7"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(54,122,99,0.22), transparent 65%)" }}
          />
          {/* The button's ghost fades and rises over the incoming band; the
              transform lives on the wrapper so the exit animation can own the
              inner element's transform. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2">
            <span className="wa-keep-button-out grid min-h-14 place-items-center rounded-full bg-rose text-base font-bold text-white">
              Keep today
            </span>
          </span>
        </>
      ) : null}
      <section
        role="status"
        aria-label="Saved"
        className={clsx(
          "relative flex items-center gap-3.5 rounded-journal border border-leaf/20 bg-leaf/10 px-4 py-3.5",
          playing ? "wa-band-in" : null
        )}
      >
        <span className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf text-white", playing ? "wa-check-pop" : null)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12.5l5 5L20 7" className={playing ? "wa-check-draw" : undefined} />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-bold text-leaf-deep">Saved to your story</p>
          <p className="mt-0.5 text-[13px] text-soft-ink">{savedSummary(entry)}</p>
        </div>
      </section>
    </div>
  );
}

// "N days kept": warm-gray, secondary, never rose, no loss states ever. The
// number cross-fades up 4px on the first save of the day.
function StreakPill({ days }: { days: number }) {
  const previous = useRef(days);
  const [rising, setRising] = useState(false);

  useEffect(() => {
    if (days > previous.current) {
      setRising(true);
      previous.current = days;
      const timer = window.setTimeout(() => setRising(false), 450);
      return () => window.clearTimeout(timer);
    }
    previous.current = days;
  }, [days]);

  if (days <= 0) return null;

  return (
    <span className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-journal-line bg-journal-surface/85 px-3 text-xs font-bold text-warm-gray">
      <Sparkles aria-hidden="true" size={13} className="text-rose" />
      <span key={days} className={clsx("inline-block", rising ? "wa-streak-in" : null)}>
        {days} {days === 1 ? "day" : "days"} kept
      </span>
    </span>
  );
}

function GratitudeStarters({
  guide,
  canEdit,
  open,
  onToggle,
  onUseSuggestion
}: {
  guide: ReturnType<typeof gratitudeGuideForEntry>;
  canEdit: boolean;
  open: boolean;
  onToggle: () => void;
  onUseSuggestion: (suggestion: string) => void;
}) {
  return (
    <div id="gratitude-starters" className="mt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 px-1 text-left text-[13px] font-semibold text-warm-gray transition hover:text-rose focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
      >
        <Sparkles aria-hidden="true" size={14} className="text-rose" />
        Not sure what to write? Three gentle starters
      </button>
      {open ? (
        <div className="mt-2 grid gap-2">
          <p className="sr-only">{guide.moodCopy}</p>
          {guide.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onUseSuggestion(suggestion)}
              disabled={!canEdit}
              className="flex min-h-12 items-center justify-between gap-3 rounded-card bg-journal-raised px-3 py-2 text-left text-sm font-semibold leading-5 text-soft-ink transition hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
              aria-label={`Use suggestion: ${suggestion}`}
            >
              <span>{suggestion}</span>
              <Plus aria-hidden="true" className="shrink-0 text-rose" size={16} />
            </button>
          ))}
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-warm-gray">{guide.pack.title} pack</p>
        </div>
      ) : null}
    </div>
  );
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
        <JournalPhoto src={photo?.thumbnailUrl || photo?.previewUrl} alt={photo?.caption || ""} className="h-32 w-full object-cover" loading="lazy" />
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

// Also rendered inside EntryDetailModal so past days can be backfilled with
// the exact Today editing behavior (own-session scoping included).
export function PromptPanel({
  entry,
  prompts,
  canEdit,
  currentUserId,
  memberNames,
  onUpdateEntry,
  primaryFieldId = "nice-thing-0",
  footer = null
}: {
  entry: JournalEntry;
  prompts: PromptTemplate[];
  canEdit: boolean;
  currentUserId: string | null;
  memberNames: Record<string, string>;
  onUpdateEntry: (entryId: string, updater: (entry: JournalEntry) => JournalEntry) => void;
  // The Today view anchors its "focus first reflection" affordance on this id;
  // pass null anywhere a second PromptPanel could mount over Today (the entry
  // modal) so the id stays unique in the document.
  primaryFieldId?: string | null;
  // Today appends the gentle starters here (full mode); the modal passes nothing.
  footer?: ReactNode;
}) {
  // Per-person sections: each member writes in their own session; unowned
  // legacy sessions belong to whoever edits them first.
  const ownsSession = (session: JournalSession) => !session.createdBy || session.createdBy === currentUserId;
  const ownResponses = entry.sessions.filter(ownsSession).flatMap((session) => session.responses);
  const primary = ownResponses[0] ?? null;
  const secondary = ownResponses.slice(1);
  const sectionRef = useRef<HTMLElement | null>(null);
  // Add-as-you-go: one row visible at first; "Add another, if it fits"
  // reveals the next of three. Resets per entry (the modal reuses this panel).
  const [revealedRows, setRevealedRows] = useState(1);
  useEffect(() => {
    setRevealedRows(1);
  }, [entry.id]);
  const otherSections = entry.sessions
    .filter((session) => !ownsSession(session))
    .map((session) => ({
      session,
      texts: session.responses.flatMap((response) => response.text.split("\n")).map((line) => line.trim()).filter(Boolean)
    }))
    .filter((section) => section.texts.length > 0);

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

  // A member writing on a day someone else started gets their own section.
  function updatePrimaryText(text: string) {
    if (primary) {
      updateResponse(primary.id, text);
      return;
    }
    onUpdateEntry(entry.id, (current) => {
      const enabled = prompts.filter((prompt) => prompt.isEnabled);
      const newSession: JournalSession = {
        id: crypto.randomUUID(),
        kind: current.sessions[0]?.kind ?? "evening",
        createdBy: currentUserId,
        responses: (enabled.length > 0 ? enabled : prompts.slice(0, 1)).map((prompt, index) => ({
          id: crypto.randomUUID(),
          promptId: prompt.id,
          promptTitle: prompt.title,
          promptText: prompt.prompt,
          promptOrder: prompt.sortOrder,
          text: index === 0 ? text : ""
        }))
      };
      return { ...current, sessions: [...current.sessions, newSession], updatedAt: new Date().toISOString() };
    });
  }

  const lines = (primary?.text ?? "").split("\n");
  const visibleRows = visibleNiceThingRowCount(primary?.text?.trim() ? lines : [], revealedRows);

  function addAnotherRow() {
    const next = Math.min(3, visibleRows + 1);
    setRevealedRows(next);
    window.setTimeout(() => {
      const areas = sectionRef.current?.querySelectorAll<HTMLTextAreaElement>("textarea[data-nice-row]");
      areas?.[areas.length - 1]?.focus();
    }, 40);
  }

  return (
    <section ref={sectionRef} className="rounded-journal border border-journal-line bg-journal-surface p-[18px] shadow-card">
      <div className="mb-3.5">
        <h2 className="text-base font-bold">Three nice things</h2>
        <p className="mt-0.5 text-sm text-warm-gray">{primary?.promptText ?? prompts.find((prompt) => prompt.isEnabled)?.prompt ?? ""}</p>
      </div>

      <div className="grid gap-2.5">
        {Array.from({ length: visibleRows }, (_, index) => (
          <label key={index} className="flex gap-3 rounded-card bg-journal-raised p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose/10 text-[13px] font-bold text-rose">
              {index + 1}
            </span>
            <textarea
              id={index === 0 ? (primaryFieldId ?? undefined) : undefined}
              data-nice-row
              aria-label={`Nice thing ${index + 1}`}
              value={lines[index] ?? ""}
              onChange={(event) => {
                const next = [...lines];
                next[index] = event.target.value;
                updatePrimaryText(trimTrailingBlankLines(next).join("\n"));
              }}
              rows={1}
              placeholder={["A small good thing", "Another nice moment", "One more, if it fits"][index]}
              disabled={!canEdit}
              className="min-h-8 flex-1 border-0 bg-transparent text-base outline-none"
            />
          </label>
        ))}
        {visibleRows < 3 ? (
          <button
            type="button"
            onClick={addAnotherRow}
            disabled={!canEdit}
            className="flex min-h-12 items-center gap-3 rounded-card border-[1.5px] border-dashed border-ink/15 px-3 text-left text-sm font-semibold text-warm-gray transition hover:border-rose/40 hover:text-rose focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/5">
              <Plus aria-hidden="true" size={14} />
            </span>
            Add another, if it fits
          </button>
        ) : null}
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

      {otherSections.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {otherSections.map(({ session, texts }) => (
            <div key={session.id} className="rounded-2xl bg-journal-raised p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">
                {(session.createdBy && memberNames[session.createdBy]) || "A household member"}&apos;s reflections
              </p>
              <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-soft-ink">
                {texts.map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {footer}
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
    <section className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-warm-gray">People, optional</h2>
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
  workspace,
  canEdit,
  onUpdateEntry
}: {
  entry: JournalEntry;
  people: PersonTag[];
  workspace: Workspace | null;
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
    <section className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-warm-gray">Little Details · optional</h2>

      <div className="grid gap-3">
        {entry.details.length === 0 ? <LittleDetailsNudge workspace={workspace} people={people} /> : null}

        {entry.details.map((detail) => (
          <article key={detail.id} className="rounded-card bg-journal-raised p-4">
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
                aria-label="Little detail text"
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

      <div className="mt-4 grid gap-3 rounded-card border border-journal-line bg-white p-3">
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

// Simple faces with text labels (never color-only meaning). The five mouths
// step from rough to glowing across the existing mood ids.
const moodFacePaths: Record<Mood, string> = {
  low: "M8.5 16.5c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8",
  quiet: "M8.5 15.5h7",
  good: "M8.5 15c1 .6 2.2.9 3.5.9s2.5-.3 3.5-.9",
  bright: "M8 14c1.2 1.6 2.6 2.4 4 2.4s2.8-.8 4-2.4",
  glowing: "M7.5 13.5c.8 2.2 2.4 3.4 4.5 3.4s3.7-1.2 4.5-3.4z"
};

function MoodFace({ mood }: { mood: Mood }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d={moodFacePaths[mood]} />
      <path d="M9 10h.01M15 10h.01" />
    </svg>
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
    <section className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-warm-gray">How was today · optional</h2>
      <div className="grid grid-cols-5 gap-1.5">
        {moodOptions.map((mood) => {
          const active = entry.mood === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => onUpdateEntry(entry.id, (current) => ({ ...current, mood: mood.id, updatedAt: new Date().toISOString() }))}
              disabled={!canEdit}
              aria-pressed={active}
              className={clsx(
                "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-control text-[11px] font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30",
                active ? "border-[1.5px] border-rose/35 bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray"
              )}
            >
              <MoodFace mood={mood.id} />
              {mood.title}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && !next[next.length - 1]?.trim()) {
    next.pop();
  }
  return next;
}
