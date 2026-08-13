import { tagChipStyle } from "@/lib/tag-colors";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ArrowRight, CalendarDays, Image as ImageIcon, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { JournalEntry, MemoryDetail, PersonTag } from "@/types/journal";
import { formatDisplayDate, toLocalDate } from "@/lib/dates";
import { isFeatureVisible, type ExperienceMode } from "@/lib/experience-mode";
import { entryPeople, firstResponseExcerpt, isEntryComplete, searchEntries } from "@/lib/journal-logic";
import { listMemoryDetails } from "@/lib/memory-details";
import { detailCategories, type DetailCategory } from "@/components/journal/helpers";
import { JournalPhoto, PersonChips } from "@/components/journal/shared";
import { formatMemoryDayLabel, groupEntriesByMonth } from "@/components/journal/memories-helpers";

type MemoryFilter = "all" | "photos" | "text";

type MemoryMode = "entries" | "details";

// The Warm Album motion voice: slow-out, subtle, 200–900ms. globals.css
// collapses these durations under prefers-reduced-motion.
const slowOut = "transition duration-300 ease-[cubic-bezier(.3,0,.2,1)]";
const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30 focus-visible:ring-offset-2 focus-visible:ring-offset-journal-bg";

export function MemoriesView({
  entries,
  experienceMode,
  people,
  onOpenToday,
  onOpenEntry,
  onAddDetail,
  onUpdateDetail,
  onDeleteDetail,
  canEdit,
  archive,
  onLoadOlder
}: {
  entries: JournalEntry[];
  experienceMode: ExperienceMode;
  people: PersonTag[];
  onOpenToday: () => void;
  onOpenEntry: (entryId: string) => void;
  onAddDetail: (detail: { localDate: string; text: string; category: DetailCategory; personTagIds: string[] }) => void;
  onUpdateDetail: (entryId: string, detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) => void;
  onDeleteDetail: (entryId: string, detailId: string) => void;
  canEdit: boolean;
  archive?: { hasMore: boolean; loading: boolean };
  onLoadOlder?: () => void;
}) {
  const [mode, setMode] = useState<MemoryMode>("entries");
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemoryFilter>("all");
  const [category, setCategory] = useState<DetailCategory | "all">("all");
  const debouncedQuery = useDebouncedValue(query);
  // SPEC-7: Simple keeps search (it still matches details/people text) but
  // hides the filter chips and the Little Details repository management mode.
  const showRepository = isFeatureVisible(experienceMode, "detailsRepository");
  const showFilters = isFeatureVisible(experienceMode, "memoriesFilters");
  const activeMode: MemoryMode = showRepository ? mode : "entries";

  const hasHistory = useMemo(() => entries.some(isEntryComplete), [entries]);
  const allDetails = useMemo(() => listMemoryDetails(entries, people), [entries, people]);

  const searched = useMemo(() => searchEntries(entries, people, debouncedQuery), [entries, people, debouncedQuery]);
  const filtered = useMemo(() => {
    return searched.filter((entry) => {
      if (personId && !entryPeople(entry, people).some((person) => person.id === personId)) return false;
      if (filter === "photos") return entry.photos.length > 0;
      if (filter === "text") return entry.photos.length === 0;
      return true;
    });
  }, [searched, people, personId, filter]);
  const monthGroups = useMemo(() => groupEntriesByMonth(filtered), [filtered]);

  function openRepository(nextCategory: DetailCategory | "all" = "all") {
    setCategory(nextCategory);
    setMode("details");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <header>
        <h1 className="text-[28px] font-bold leading-[31px] tracking-[-0.01em]">Memories</h1>
      </header>

      {!hasHistory ? (
        <AlbumStartsEmptyState onOpenToday={onOpenToday} />
      ) : (
        <>
          <label className="relative block">
            <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={activeMode === "details" ? "Search little details" : "Search memories"}
              placeholder={activeMode === "details" ? "Search little details, dates, or people" : "Search moments, details, captions…"}
              className={clsx(
                "min-h-12 w-full rounded-card border border-journal-line bg-journal-surface pl-11 pr-4 text-base text-ink shadow-card outline-none placeholder:text-warm-gray focus:ring-4 focus:ring-rose/15",
                slowOut
              )}
            />
          </label>

          {showFilters || showRepository ? (
            <div role="group" aria-label="Filters" className="flex flex-wrap gap-2">
              {showFilters ? (
                <>
                  <FilterChip
                    active={activeMode === "entries" && filter === "all"}
                    onClick={() => {
                      setMode("entries");
                      setFilter("all");
                      setPersonId(null);
                    }}
                  >
                    All
                  </FilterChip>
                  <FilterChip
                    active={activeMode === "entries" && filter === "photos"}
                    onClick={() => {
                      setMode("entries");
                      setFilter("photos");
                    }}
                  >
                    Photos
                  </FilterChip>
                  <FilterChip
                    active={activeMode === "entries" && filter === "text"}
                    onClick={() => {
                      setMode("entries");
                      setFilter("text");
                    }}
                  >
                    Text only
                  </FilterChip>
                  {people.map((person) => (
                    <FilterChip
                      key={person.id}
                      active={personId === person.id}
                      onClick={() => setPersonId(personId === person.id ? null : person.id)}
                    >
                      {person.name}
                    </FilterChip>
                  ))}
                </>
              ) : null}
              {showRepository ? (
                <FilterChip active={activeMode === "details"} onClick={() => openRepository(category)}>
                  Little Details
                </FilterChip>
              ) : null}
            </div>
          ) : null}

          {activeMode === "details" ? (
            <LittleDetailsRepository
              entries={entries}
              people={people}
              canEdit={canEdit}
              query={debouncedQuery}
              personId={personId}
              category={category}
              onCategoryChange={setCategory}
              onClearFilters={() => {
                setQuery("");
                setPersonId(null);
                setCategory("all");
              }}
              onOpenEntry={onOpenEntry}
              onAddDetail={onAddDetail}
              onUpdateDetail={onUpdateDetail}
              onDeleteDetail={onDeleteDetail}
            />
          ) : (
            <>
              {filtered.length === 0 ? (
                <EmptyState
                  title="No memories found"
                  message="Try another search, clear the person filter, or add today's first memory."
                  action={onOpenToday}
                />
              ) : (
                monthGroups.map((group, groupIndex) => (
                  <section key={group.key} aria-label={group.ariaLabel}>
                    <h2 className="mb-2.5 mt-1 text-[15px] font-bold text-soft-ink">
                      {group.title}{" "}
                      <span className="font-semibold text-warm-gray">
                        · {group.dayCount} {group.dayCount === 1 ? "day" : "days"} kept
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                      {group.entries.map((entry, index) => (
                        <MemoryCard
                          key={entry.id}
                          entry={entry}
                          people={people}
                          onOpen={onOpenEntry}
                          featured={groupIndex === 0 && index === 0 && entry.photos.length > 0}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
              {showRepository && allDetails.length > 0 ? (
                <LittleDetailsSummary details={allDetails} onOpenEntry={onOpenEntry} onOpenRepository={openRepository} />
              ) : null}
              {archive?.hasMore && onLoadOlder ? (
                <button
                  type="button"
                  onClick={onLoadOlder}
                  disabled={archive.loading}
                  className={clsx(
                    "mx-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-journal-line bg-journal-surface px-5 text-sm font-bold text-soft-ink hover:bg-journal-raised disabled:opacity-60",
                    slowOut,
                    focusRing
                  )}
                >
                  {archive.loading ? "Bringing back older days…" : "Load older memories"}
                </button>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

// The Memories-before-history moment from empty-day-one.dc.html: two stacked
// "photos" waiting to exist, then a single warm invitation back to Today.
function AlbumStartsEmptyState({ onOpenToday }: { onOpenToday: () => void }) {
  return (
    <section className="flex flex-col items-center gap-3.5 px-6 py-14 text-center">
      <div className="relative h-[120px] w-[150px]" aria-hidden="true">
        <div className="absolute left-2 top-3.5 h-[88px] w-[104px] -rotate-[5deg] rounded-card border border-journal-line bg-journal-raised" />
        <div className="absolute left-[30px] top-2 grid h-[88px] w-[104px] rotate-3 place-items-center rounded-card border-[1.5px] border-dashed border-rose/30 bg-journal-surface text-rose">
          <ImageIcon aria-hidden="true" size={26} strokeWidth={1.8} />
        </div>
      </div>
      <h2 className="text-[19px] font-bold text-ink">Your album starts tonight</h2>
      <p className="max-w-[250px] text-sm leading-[1.55] text-warm-gray">
        Every day you keep lands here — photos, lines, and little details, all searchable later.
      </p>
      <button
        type="button"
        onClick={onOpenToday}
        className={clsx(
          "mt-1 inline-flex min-h-12 items-center gap-2 rounded-full bg-rose px-6 text-[15px] font-bold text-white shadow-lg shadow-rose/25 hover:bg-rose-pressed",
          slowOut,
          focusRing
        )}
      >
        Keep today&rsquo;s first memory
        <ArrowRight aria-hidden="true" size={15} strokeWidth={2.2} />
      </button>
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-bold",
        slowOut,
        focusRing,
        active ? "bg-rose text-white shadow-sm" : "border border-journal-line bg-journal-surface text-soft-ink hover:bg-journal-raised"
      )}
    >
      {children}
    </button>
  );
}

// The Little Details keepsake box at the foot of the album: category chips and
// the freshest few details, each a doorway into its day or the full repository.
function LittleDetailsSummary({
  details,
  onOpenEntry,
  onOpenRepository
}: {
  details: ReturnType<typeof listMemoryDetails>;
  onOpenEntry: (entryId: string) => void;
  onOpenRepository: (category: DetailCategory | "all") => void;
}) {
  const presentCategories = detailCategories.filter((option) => details.some((item) => item.detail.category === option.id));
  return (
    <section aria-label="Little Details" className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-ink">Little Details</h2>
        <button
          type="button"
          onClick={() => onOpenRepository("all")}
          className={clsx("inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-rose hover:text-rose-pressed", slowOut, focusRing)}
        >
          See all {details.length}
          <ArrowRight aria-hidden="true" size={14} />
        </button>
      </div>
      {presentCategories.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {presentCategories.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onOpenRepository(option.id)}
              className={clsx(
                "inline-flex min-h-11 items-center rounded-full bg-journal-raised px-3.5 text-xs font-bold text-warm-gray hover:bg-rose/10 hover:text-rose",
                slowOut,
                focusRing
              )}
            >
              {option.title}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-2.5 grid gap-2">
        {details.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenEntry(item.entry.id)}
            className={clsx("rounded-control bg-journal-raised px-3.5 py-3 text-left hover:bg-rose/10", slowOut, focusRing)}
          >
            <p className="text-sm leading-snug text-ink">{item.detail.text}</p>
            <p className="mt-1 text-xs font-semibold text-warm-gray">
              {[item.people[0]?.name, formatDisplayDate(item.localDate, "short")].filter(Boolean).join(" · ")}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function LittleDetailsRepository({
  entries,
  people,
  canEdit,
  query,
  personId,
  category,
  onCategoryChange,
  onClearFilters,
  onOpenEntry,
  onAddDetail,
  onUpdateDetail,
  onDeleteDetail
}: {
  entries: JournalEntry[];
  people: PersonTag[];
  canEdit: boolean;
  query: string;
  personId: string | null;
  category: DetailCategory | "all";
  onCategoryChange: (category: DetailCategory | "all") => void;
  onClearFilters: () => void;
  onOpenEntry: (entryId: string) => void;
  onAddDetail: (detail: { localDate: string; text: string; category: DetailCategory; personTagIds: string[] }) => void;
  onUpdateDetail: (entryId: string, detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) => void;
  onDeleteDetail: (entryId: string, detailId: string) => void;
}) {
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
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Detail categories">
        <CategoryChip active={category === "all"} onClick={() => onCategoryChange("all")}>
          All categories
        </CategoryChip>
        {detailCategories.map((option) => (
          <CategoryChip key={option.id} active={category === option.id} onClick={() => onCategoryChange(option.id)}>
            {option.title}
          </CategoryChip>
        ))}
        <span className="ml-auto text-[13px] font-bold text-warm-gray">
          {details.length} detail{details.length === 1 ? "" : "s"}
        </span>
      </div>

      <section className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
        <div className="grid gap-2.5 lg:grid-cols-[150px_170px_1fr_auto]">
          <input
            type="date"
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)}
            disabled={!canEdit}
            className="min-h-12 rounded-control border border-journal-line bg-journal-surface px-3 font-semibold outline-none focus:ring-4 focus:ring-rose/15"
            aria-label="Detail date"
          />
          <select
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value as DetailCategory)}
            disabled={!canEdit}
            className="min-h-12 rounded-control border border-journal-line bg-journal-surface px-3 font-semibold outline-none focus:ring-4 focus:ring-rose/15"
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
            className="min-h-12 min-w-0 rounded-control border border-journal-line bg-journal-surface px-3 text-base outline-none placeholder:text-warm-gray focus:ring-4 focus:ring-rose/15"
          />
          <button
            type="button"
            onClick={addDetail}
            disabled={!canEdit}
            className={clsx("inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-rose px-5 text-sm font-bold text-white hover:bg-rose-pressed", slowOut, focusRing)}
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
          action={onClearFilters}
          actionLabel="Clear filters"
        />
      ) : (
        <div className="grid gap-2.5">
          {details.map((item) => (
            <LittleDetailRow
              key={item.id}
              item={item}
              people={people}
              canEdit={canEdit}
              onOpenEntry={onOpenEntry}
              onUpdateDetail={onUpdateDetail}
              onDeleteDetail={onDeleteDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// The clean-list row from the mockup: the detail reads as kept text with its
// person · date meta, and editing controls stay tucked behind an Edit toggle.
function LittleDetailRow({
  item,
  people,
  canEdit,
  onOpenEntry,
  onUpdateDetail,
  onDeleteDetail
}: {
  item: ReturnType<typeof listMemoryDetails>[number];
  people: PersonTag[];
  canEdit: boolean;
  onOpenEntry: (entryId: string) => void;
  onUpdateDetail: (entryId: string, detailId: string, updater: (detail: MemoryDetail) => MemoryDetail) => void;
  onDeleteDetail: (entryId: string, detailId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[22px] text-ink">{item.detail.text}</p>
          <p className="mt-1 text-xs font-semibold text-warm-gray">
            {[item.people.map((person) => person.name).join(", ") || null, item.categoryLabel, formatDisplayDate(item.localDate, "short")]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onOpenEntry(item.entry.id)}
            className={clsx("inline-flex min-h-11 items-center gap-1.5 rounded-full bg-journal-raised px-3 text-xs font-bold text-soft-ink hover:bg-rose/10 hover:text-rose", slowOut, focusRing)}
          >
            <CalendarDays aria-hidden="true" size={14} />
            Open entry
          </button>
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              aria-pressed={editing}
              className={clsx(
                "inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold",
                slowOut,
                focusRing,
                editing ? "bg-rose/10 text-rose" : "bg-journal-raised text-soft-ink hover:bg-rose/10 hover:text-rose"
              )}
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDeleteDetail(item.entry.id, item.detail.id)}
            disabled={!canEdit}
            className={clsx("grid min-h-11 w-11 place-items-center rounded-full bg-journal-raised text-warm-gray hover:text-rose", slowOut, focusRing)}
            aria-label="Delete little detail"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      {editing && canEdit ? (
        <div className="mt-3 border-t border-journal-line pt-3">
          <div className="grid gap-2.5 lg:grid-cols-[170px_1fr]">
            <select
              value={item.detail.category}
              onChange={(event) =>
                onUpdateDetail(item.entry.id, item.detail.id, (detail) => ({
                  ...detail,
                  category: event.target.value as DetailCategory
                }))
              }
              className="min-h-11 rounded-control border border-journal-line bg-journal-surface px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-rose/15"
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
              className="min-h-16 rounded-control border border-journal-line bg-journal-surface p-3 text-base outline-none focus:ring-4 focus:ring-rose/15"
              aria-label="Edit little detail"
            />
          </div>
          {people.length > 0 ? (
            <div className="mt-3">
              <PersonChips
                compact
                people={people}
                selectedIds={item.detail.personTagIds}
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
        </div>
      ) : null}
    </article>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex min-h-11 items-center rounded-full px-3.5 text-xs font-bold",
        slowOut,
        focusRing,
        active ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray hover:bg-rose/10 hover:text-rose"
      )}
    >
      {children}
    </button>
  );
}

// Photo days read as album prints; text-only days get the paper note card so
// they feel as loved as a photo — never an oversized photo placeholder.
export function MemoryCard({
  entry,
  people,
  compact = false,
  featured = false,
  onOpen
}: {
  entry: JournalEntry;
  people: PersonTag[];
  compact?: boolean;
  featured?: boolean;
  onOpen?: (entryId: string) => void;
}) {
  const tagged = entryPeople(entry, people);
  const photo = entry.photos[0];
  const excerpt = firstResponseExcerpt(entry);
  const dayLabel = formatMemoryDayLabel(entry.localDate);
  const peopleChips =
    tagged.length > 0 ? (
      <span className="mt-2.5 flex flex-wrap gap-1.5">
        {tagged.slice(0, 3).map((person) => (
          <span key={person.id} className="rounded-full px-2.5 py-1 text-xs font-bold" style={tagChipStyle(person.color)}>
            {person.name}
          </span>
        ))}
      </span>
    ) : null;

  if (!photo) {
    return (
      <article
        className={clsx(
          "rounded-journal border border-journal-line shadow-card has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-rose/30",
          "bg-[repeating-linear-gradient(0deg,transparent,transparent_22px,theme(colors.journal.line)_23px),linear-gradient(160deg,theme(colors.journal.surface),theme(colors.journal.raised))]",
          "hover:-translate-y-0.5 hover:shadow-journal",
          slowOut
        )}
      >
        <button type="button" onClick={() => onOpen?.(entry.id)} className="block h-full w-full p-3.5 text-left focus-visible:outline-none">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-warm-gray">{dayLabel}</span>
          <span className="mt-2 line-clamp-4 block text-[15px] italic leading-relaxed text-ink">
            {excerpt ? <>&ldquo;{excerpt}&rdquo;</> : "Open memory"}
          </span>
          <span className="mt-2.5 block text-xs font-bold text-warm-gray">A text-only day</span>
          {peopleChips}
        </button>
      </article>
    );
  }

  const primaryText = photo.caption.trim() || excerpt || "Open memory";
  return (
    <article
      className={clsx(
        "overflow-hidden rounded-journal bg-journal-surface shadow-card has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-rose/30",
        "hover:-translate-y-0.5 hover:shadow-journal",
        slowOut,
        featured && "sm:col-span-2"
      )}
    >
      <button type="button" onClick={() => onOpen?.(entry.id)} className="block h-full w-full text-left focus-visible:outline-none">
        <JournalPhoto
          src={photo.thumbnailUrl || photo.previewUrl}
          alt=""
          className={clsx("w-full object-cover", !compact && featured ? "h-56 sm:h-64" : "h-40")}
          loading="lazy"
        />
        <div className="px-3.5 pb-3.5 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose">{dayLabel}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink">{primaryText}</p>
          {peopleChips}
        </div>
      </button>
    </article>
  );
}

// Search re-scans the whole archive; a short debounce keeps that scan off the
// per-keystroke render path.
function useDebouncedValue<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function EmptyState({ title, message, action, actionLabel = "Open Today" }: { title: string; message: string; action: () => void; actionLabel?: string }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-8 text-center shadow-card">
      <Sparkles aria-hidden="true" className="mx-auto text-rose" size={32} />
      <h2 className="mt-4 text-[22px] font-bold leading-[25px]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-[22px] text-warm-gray">{message}</p>
      <button
        onClick={action}
        className={clsx("mt-5 min-h-12 rounded-full bg-rose px-5 font-bold text-white hover:bg-rose-pressed", slowOut, focusRing)}
      >
        {actionLabel}
      </button>
    </section>
  );
}
