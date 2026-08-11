import { useMemo } from "react";
import type { JournalEntry } from "@/types/journal";
import { toLocalDate } from "@/lib/dates";
import { isEntryComplete, streakSummary } from "@/lib/journal-logic";
import { moodOptions } from "@/components/journal/helpers";
import { PageHeader } from "@/components/journal/shared";

export function InsightsView({ entries }: { entries: JournalEntry[] }) {
  const today = toLocalDate();
  const { summary, photoDays, completeDays, moodCounts } = useMemo(
    () => ({
      summary: streakSummary(entries, today),
      photoDays: entries.filter((entry) => entry.photos.length > 0).length,
      completeDays: entries.filter(isEntryComplete).length,
      moodCounts: moodOptions.map((mood) => ({
        ...mood,
        count: entries.filter((entry) => entry.mood === mood.id).length
      }))
    }),
    [entries, today]
  );

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

function MetricCard({ title, value, suffix }: { title: string; value: string; suffix: string }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <p className="text-sm font-bold text-warm-gray">{title}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
      <p className="text-sm text-warm-gray">{suffix}</p>
    </section>
  );
}
