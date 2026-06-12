import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, ChevronDown, Heart, Plus, Sparkles, Trash2, Users } from "lucide-react";
import type { JournalEntry, MemoryDetail, PersonTag, PromptTemplate, Workspace } from "@/types/journal";
import { formatDisplayDate, toLocalDate } from "@/lib/dates";
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
import { MemoryLanePanel } from "@/components/journal/MemoryLane";
import { PhotoHero } from "@/components/journal/PhotoHero";
import { ReadOnlyNotice } from "@/components/journal/SettingsView";
import {
  JournalPhoto,
  PersonChips,
  PromptSnapshot,
  SaveStatePill,
  SectionTitle
} from "@/components/journal/shared";

export function TodayView({
  entry,
  entries,
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
  onOpenEntry,
  onFocusFirstReflection,
  onDismissStarterGuide,
  onDismissFirstMemoryCelebration
}: {
  entry: JournalEntry;
  entries: JournalEntry[];
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
}) {
  const [showMoreForToday, setShowMoreForToday] = useState(false);
  const summary = streakSummary(entries);
  const matches = memoryLaneMatches(entries).filter((match) => match.entryId !== entry.id);
  const firstMeaningfulEntry = meaningfulFirstMemoryEntries(entries)[0] ?? entry;
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

        <PhotoHero
          entry={entry}
          canEdit={canEdit}
          showGuidance={!entries.some((candidate) => candidate.photos.length > 0)}
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
        <LittleDetailsPanel entry={entry} people={people} workspace={workspace} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
        <MoodPanel entry={entry} canEdit={canEdit} onUpdateEntry={onUpdateEntry} />
      </section>

      <aside aria-label="More for today" className="grid content-start gap-5">
        <CompletionCard entry={entry} />
        <button
          type="button"
          onClick={() => setShowMoreForToday((current) => !current)}
          aria-expanded={showMoreForToday}
          className="flex min-h-12 items-center justify-between rounded-journal border border-journal-line bg-journal-surface px-5 text-left text-sm font-bold text-soft-ink xl:hidden"
        >
          More for today: a look back, gentle starters
          <ChevronDown aria-hidden="true" size={18} className={clsx("transition", showMoreForToday ? "rotate-180" : "")} />
        </button>
        <div className={clsx("grid gap-5", showMoreForToday ? "" : "hidden xl:grid")}>
          <PickMeUpMemoryCard entries={entries} onOpenEntry={onOpenEntry} />
          <GratitudeGuideCard guide={guide} canEdit={canEdit} onUseSuggestion={useGuideSuggestion} />
          <MemoryLanePanel matches={matches} entries={entries} onOpenEntry={onOpenEntry} />
          <div className="hidden xl:block">
            <PromptSnapshot prompts={prompts} />
          </div>
        </div>
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
              aria-label={`Nice thing ${index + 1}`}
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
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle
        icon={Sparkles}
        title="Little Details"
        subtitle="Tiny phases, favorites, routines, milestones, or funny lines."
      />

      <div className="grid gap-3">
        {entry.details.length === 0 ? <LittleDetailsNudge workspace={workspace} people={people} /> : null}

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

function StreakPill({ days }: { days: number }) {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rose/10 px-4 text-sm font-bold text-rose">
      <Sparkles aria-hidden="true" size={16} />
      {days} day streak
    </span>
  );
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && !next[next.length - 1]?.trim()) {
    next.pop();
  }
  return next;
}
