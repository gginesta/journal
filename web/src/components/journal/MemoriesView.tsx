import { tagChipStyle } from "@/lib/tag-colors";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, CalendarDays, Camera, CheckCircle2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { JournalEntry, MemoryDetail, PersonTag } from "@/types/journal";
import { formatDisplayDate, toLocalDate } from "@/lib/dates";
import { entryPeople, firstResponseExcerpt, isEntryComplete, searchEntries } from "@/lib/journal-logic";
import { listMemoryDetails } from "@/lib/memory-details";
import { detailCategories, type DetailCategory } from "@/components/journal/helpers";
import { JournalPhoto, PageHeader, PersonChips } from "@/components/journal/shared";

type MemoryFilter = "all" | "photos" | "text";

type MemoryMode = "entries" | "details";

export function MemoriesView({
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
      <section className="grid grid-cols-3 gap-2 sm:gap-3">
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
            aria-label="Filter memories"
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
                      style={tagChipStyle(person.color)}
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

export function MemoryCard({
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
      {photo?.previewUrl ? (
        <JournalPhoto src={photo.previewUrl} alt="" className={clsx("w-full object-cover", compact ? "h-40" : "h-60")} loading="lazy" />
      ) : null}
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
              <span key={person.id} className="rounded-full px-2.5 py-1 text-xs font-bold" style={tagChipStyle(person.color)}>
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

function MemoryStatPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <section className="flex min-h-16 items-center gap-3 rounded-journal border border-journal-line bg-journal-surface px-3 sm:px-4">
      <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-rose/10 text-rose sm:grid">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
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
