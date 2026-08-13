/* eslint-disable @next/next/no-img-element -- Journal photos can be local data URLs or private signed storage URLs. */

// Memory Lane — Today's signature slot (Warm Album redesign). The first match
// arrives as a blurred keepsake that clears on tap ("the wrapping paper");
// each card unwraps once per day and stays open on revisits.

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import type { JournalEntry } from "@/types/journal";
import { formatDisplayDate, parseLocalDate, toLocalDate } from "@/lib/dates";
import { firstResponseExcerpt, isEntryComplete, memoryLaneMatches } from "@/lib/journal-logic";
import { laneRevealStorageKey, memoryLaneDisplayLabel } from "@/components/journal/today-logic";
import { MemoryLaneNoMatches } from "@/components/wow/EarlyMemoryLane";
import { JournalPhoto } from "@/components/journal/shared";

export function MemoryLanePanel({
  matches,
  entries,
  onOpenEntry
}: {
  matches: ReturnType<typeof memoryLaneMatches>;
  entries: JournalEntry[];
  onOpenEntry: (entryId: string) => void;
}) {
  const today = toLocalDate();
  const fallback = entries
    .filter((entry) => entry.localDate !== today && isEntryComplete(entry))
    .sort((left, right) => right.localDate.localeCompare(left.localDate))[0];
  const completeCount = entries.filter(isEntryComplete).length;

  const cards = matches.length > 0
    ? matches.flatMap((match) => {
        const entry = entries.find((candidate) => candidate.id === match.entryId);
        return entry ? [{ entry, label: memoryLaneDisplayLabel(match) }] : [];
      })
    : fallback
      ? [{ entry: fallback, label: "Recent good thing" }]
      : [];

  if (cards.length === 0) {
    // Day one gets the promise; a few kept days without ladder matches get the
    // early-milestones explainer instead.
    if (completeCount === 0) return <DayOneLaneCard />;
    return (
      <section className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
        <MemoryLaneNoMatches completedEntryCount={completeCount} />
      </section>
    );
  }

  const [primary, ...rest] = cards;

  return (
    <section aria-label="Memory Lane" className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <MemoryLaneReveal entry={primary.entry} label={primary.label} shownOnDate={today} onOpen={onOpenEntry} />
      {rest.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {rest.map(({ entry, label }) => (
            <MemoryLaneRow key={entry.id} entry={entry} label={label} onOpen={onOpenEntry} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function laneDateLabel(localDate: string): string {
  return parseLocalDate(localDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function laneExcerpt(entry: JournalEntry): string {
  return (
    entry.photos[0]?.caption.trim() ||
    firstResponseExcerpt(entry) ||
    entry.details.find((detail) => detail.text.trim())?.text ||
    "Open this memory"
  );
}

type RevealState = "hidden" | "revealing" | "revealed";

function MemoryLaneReveal({
  entry,
  label,
  shownOnDate,
  onOpen
}: {
  entry: JournalEntry;
  label: string;
  shownOnDate: string;
  onOpen: (entryId: string) => void;
}) {
  const photo = entry.photos[0];
  const storageKey = laneRevealStorageKey(shownOnDate, entry.id);
  // "revealing" animates; "revealed" (restored from the per-day flag) renders
  // the open steady state with no transition, so revisits never re-play.
  const [state, setState] = useState<RevealState>("hidden");

  useEffect(() => {
    setState(window.localStorage.getItem(storageKey) === "true" ? "revealed" : "hidden");
  }, [storageKey]);

  const revealed = state !== "hidden";

  function reveal() {
    if (revealed) {
      onOpen(entry.id);
      return;
    }
    window.localStorage.setItem(storageKey, "true");
    setState("revealing");
  }

  const eyebrow = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose">{label}</h2>
      <p className="mb-2.5 text-xs font-semibold text-warm-gray">{laneDateLabel(entry.localDate)}</p>
    </div>
  );

  // Text-only memories have no photo to unwrap — they are a steady open card.
  if (!photo) {
    return (
      <div>
        {eyebrow}
        <p className="rounded-card bg-journal-raised p-3 text-[15px] leading-6 text-ink">{laneExcerpt(entry)}</p>
        <OpenDayRow entryId={entry.id} onOpen={onOpen} />
      </div>
    );
  }

  return (
    <div>
      {eyebrow}
      <button
        type="button"
        onClick={reveal}
        aria-label={revealed ? `Open this memory from ${laneDateLabel(entry.localDate)}` : `Reveal the memory from ${label.toLowerCase()}`}
        className="relative block w-full overflow-hidden rounded-card bg-journal-raised text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
      >
        {/* Blur 16px -> 0 and scale 1.1 -> 1 over 800/900ms on the wrapper, so
            the photo itself is the wrapping paper; restores ("revealed") skip
            the transition entirely and render the open steady state. */}
        <span
          className="block"
          style={{
            filter: revealed ? "blur(0px)" : "blur(16px) saturate(1.05)",
            transform: revealed ? "scale(1)" : "scale(1.1)",
            transition:
              state === "revealing"
                ? "filter 0.8s cubic-bezier(0.3,0,0.2,1), transform 0.9s cubic-bezier(0.3,0,0.2,1)"
                : undefined
          }}
        >
          <JournalPhoto
            src={photo.thumbnailUrl || photo.previewUrl}
            alt={revealed ? photo.caption || "Memory photo" : ""}
            className="block h-[190px] w-full object-cover sm:h-[240px]"
            loading="lazy"
          />
        </span>
        <span
          className="absolute inset-0 grid place-items-center bg-journal-bg/15"
          style={{
            opacity: revealed ? 0 : 1,
            transition: state === "revealing" ? "opacity 0.35s ease" : undefined,
            pointerEvents: "none"
          }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-journal-surface/95 px-4 py-2.5 text-[13px] font-bold text-soft-ink shadow-card">
            <Sparkles aria-hidden="true" size={14} className="text-rose" />
            Tap to look back
          </span>
        </span>
      </button>
      {revealed ? (
        <div className={state === "revealing" ? "wa-lane-text-in" : undefined}>
          <p className="mt-3 text-[15px] leading-6 text-ink">{laneExcerpt(entry)}</p>
          <OpenDayRow entryId={entry.id} onOpen={onOpen} />
        </div>
      ) : null}
    </div>
  );
}

function OpenDayRow({ entryId, onOpen }: { entryId: string; onOpen: (entryId: string) => void }) {
  return (
    <div className="mt-1 flex justify-end">
      <button
        type="button"
        onClick={() => onOpen(entryId)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-bold text-rose transition hover:text-rose-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
      >
        Open this day
        <ArrowRight aria-hidden="true" size={15} />
      </button>
    </div>
  );
}

function MemoryLaneRow({ entry, label, onOpen }: { entry: JournalEntry; label: string; onOpen: (entryId: string) => void }) {
  const photo = entry.photos[0];
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      className="flex gap-3 rounded-card bg-journal-raised p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30"
    >
      <JournalPhoto src={photo?.thumbnailUrl || photo?.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-card object-cover" loading="lazy" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{label}</p>
        <p className="text-xs font-semibold text-warm-gray">{formatDisplayDate(entry.localDate, "short")}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-soft-ink">{laneExcerpt(entry)}</p>
      </div>
    </button>
  );
}

// Today's day-one promise (empty-day-one mockup): what this slot becomes.
function DayOneLaneCard() {
  return (
    <section aria-label="Memory Lane" className="rounded-journal border border-journal-line bg-journal-surface p-4 shadow-card">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose">Memory Lane</h2>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-journal-raised text-rose">
          <Sparkles aria-hidden="true" size={17} />
        </span>
        <div>
          <p className="text-[14.5px] font-bold text-ink">Tonight becomes tomorrow&rsquo;s look-back</p>
          <p className="mt-1 text-[13px] leading-[1.55] text-warm-gray">
            Keep today, and tomorrow this spot shows it back to you. Then 3 days, a week, a month &mdash; small gifts you leave yourself.
          </p>
        </div>
      </div>
    </section>
  );
}
