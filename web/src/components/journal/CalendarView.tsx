import { useMemo, useState } from "react";
import clsx from "clsx";
import { Camera, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import type { JournalEntry, PersonTag } from "@/types/journal";
import { daysInCalendarMonth, formatDisplayDate, toLocalDate } from "@/lib/dates";
import { calendarDayAction, isEntryComplete } from "@/lib/journal-logic";
import { MemoryCard } from "@/components/journal/MemoriesView";
import { PageHeader } from "@/components/journal/shared";

export function CalendarView({
  entries,
  people,
  onOpenEntry,
  onStartDay
}: {
  entries: JournalEntry[];
  people: PersonTag[];
  onOpenEntry: (entryId: string) => void;
  // When provided (editors/owners), tapping an empty past day starts a
  // backfill entry for that date; without it, empty days stay inert.
  onStartDay?: (date: string) => void;
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
            return <CalendarCell key={day.date} date={day.date} inMonth={day.inMonth} entry={entry} onOpenEntry={onOpenEntry} onStartDay={onStartDay} />;
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

function CalendarCell({
  date,
  inMonth,
  entry,
  onOpenEntry,
  onStartDay
}: {
  date: string;
  inMonth: boolean;
  entry?: JournalEntry;
  onOpenEntry: (entryId: string) => void;
  onStartDay?: (date: string) => void;
}) {
  const day = Number(date.slice(-2));
  const today = date === toLocalDate();
  const action = calendarDayAction({ date, hasEntry: Boolean(entry), canStart: Boolean(onStartDay) });
  const ariaSuffix = entry ? ", has journal entry" : action === "start" ? ", no entry yet, start this day" : ", no entry";
  return (
    <button
      type="button"
      disabled={action === "none"}
      onClick={() => (entry ? onOpenEntry(entry.id) : action === "start" ? onStartDay?.(date) : undefined)}
      className={clsx(
        "min-h-16 rounded-2xl border p-2 text-left transition",
        today ? "border-rose" : "border-journal-line",
        entry ? "bg-journal-raised" : "bg-white/42",
        action !== "none" && "hover:-translate-y-0.5 hover:bg-white hover:shadow-sm",
        !inMonth && "opacity-40"
      )}
      aria-label={`${formatDisplayDate(date)}${ariaSuffix}`}
    >
      <p className={clsx("text-sm font-bold", today && "text-rose")}>{day}</p>
      <div className="mt-2 flex gap-1">
        {entry?.photos.length ? <Camera aria-hidden="true" size={14} className="text-rose" /> : null}
        {entry && isEntryComplete(entry) ? <CheckCircle2 aria-hidden="true" size={14} className="text-leaf" /> : null}
      </div>
    </button>
  );
}
