import { useMemo } from "react";
import clsx from "clsx";
import type { JournalEntry } from "@/types/journal";
import { toLocalDate } from "@/lib/dates";
import { JournalPhoto } from "@/components/journal/shared";
import {
  daysKeptStory,
  gentlePatterns,
  monthLetter,
  yearInPhotos
} from "@/components/journal/insights-story";

// Warm Album Insights: a story about the archive, never a report card.
// Days-kept framing stays warm-gray and non-punitive (no broken-chain or
// loss states), the mosaic carries text alternatives for every photo, and
// nothing here animates — reduced-motion needs no special casing.
export function InsightsView({ entries }: { entries: JournalEntry[] }) {
  const today = toLocalDate();
  const { kept, letter, mosaic, patterns } = useMemo(
    () => ({
      kept: daysKeptStory(entries, today),
      letter: monthLetter(entries, today),
      mosaic: yearInPhotos(entries, today),
      patterns: gentlePatterns(entries)
    }),
    [entries, today]
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <header>
        <h1 className="text-[28px] font-bold leading-[1.11] tracking-[-0.01em]">Your story so far</h1>
        <p className="mt-2 text-[13px] leading-[1.5] text-warm-gray">Not a report card. Just the shape of what you noticed.</p>
      </header>

      <section className="flex items-center gap-4 rounded-journal border border-journal-line bg-journal-surface p-5 shadow-card">
        <h2 className="sr-only">Days kept</h2>
        <div className="shrink-0">
          <p className="text-[32px] font-bold leading-none text-warm-gray">{kept.count}</p>
          <p className="mt-1 text-[13px] font-bold text-soft-ink">{kept.countLabel}</p>
        </div>
        <div aria-hidden="true" className="w-px self-stretch bg-journal-line" />
        <p className="flex-1 text-[13px] leading-[1.55] text-warm-gray">{kept.note}</p>
      </section>

      <section className="rounded-journal border border-journal-line bg-gradient-to-b from-journal-surface to-journal-raised p-5 shadow-card">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-rose">{letter.eyebrow}</h2>
        <p className="mt-3 text-[15px] italic leading-[1.6] text-ink">{letter.body}</p>
      </section>

      <section className="rounded-journal border border-journal-line bg-journal-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-semibold">Your year in photos</h2>
          {mosaic.countLabel ? <p className="text-[13px] font-semibold text-warm-gray">{mosaic.countLabel}</p> : null}
        </div>
        <ul className="mt-3 grid list-none grid-cols-6 gap-1 p-0">
          {mosaic.tiles.map((tile) => (
            <li key={tile.id}>
              <JournalPhoto src={tile.src} alt={tile.alt} loading="lazy" className="aspect-square w-full rounded-md object-cover" />
            </li>
          ))}
          {Array.from({ length: mosaic.placeholders }, (_, index) => (
            <li key={`placeholder-${index}`} aria-hidden="true">
              <div className="aspect-square w-full rounded-md border border-dashed border-ink/15 bg-journal-raised" />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-[1.5] text-warm-gray">
          {mosaic.tiles.length > 0
            ? "The empty squares are days still to come — the mosaic fills as the year does."
            : "Photos you add will gather here — the mosaic fills as the year does."}
        </p>
      </section>

      <section className="rounded-journal border border-journal-line bg-journal-surface p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">What keeps showing up</h2>
        {patterns.length > 0 ? (
          <ul className="mt-3 grid list-none gap-2 p-0">
            {patterns.map((pattern, index) => (
              <li key={pattern.id} className="flex items-center gap-2.5">
                <span
                  className={clsx(
                    "inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-[13px] font-bold",
                    patternChipClasses[index % patternChipClasses.length]
                  )}
                >
                  {pattern.label}
                </span>
                <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-journal-raised">
                  <span
                    className={clsx("block h-full rounded-full", patternBarClasses[index % patternBarClasses.length])}
                    style={{ width: `${Math.max(8, Math.round(pattern.share * 100))}%` }}
                  />
                </span>
                <span className="shrink-0 text-[13px] font-bold text-warm-gray">{pattern.countLabel}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[15px] leading-[1.6] text-warm-gray">
            Once a few days are kept, the moods they landed on will gently gather here.
          </p>
        )}
      </section>
    </div>
  );
}

// Decorative rotation only — the text label and day count on each row carry
// the meaning, never the color.
const patternChipClasses = [
  "bg-rose/10 text-rose",
  "bg-leaf/10 text-leaf-deep",
  "bg-dawn/25 text-soft-ink",
  "bg-journal-raised text-soft-ink"
];

const patternBarClasses = ["bg-rose/45", "bg-leaf/45", "bg-dawn/70", "bg-warm-gray/40"];
