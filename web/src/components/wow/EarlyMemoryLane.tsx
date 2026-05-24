import { CalendarClock, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import clsx from "clsx";
import { getEarlyMemoryLaneSummary } from "../../lib/early-memory-lane";

export type EarlyMemoryLaneProps = {
  completedEntryCount: number;
  className?: string;
};

export function EarlyMemoryLane({ completedEntryCount, className }: EarlyMemoryLaneProps) {
  const summary = getEarlyMemoryLaneSummary(completedEntryCount);

  return (
    <section
      className={clsx(
        "grid gap-4",
        className
      )}
      aria-label="Early Memory Lane"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose/10 text-rose">
          <Clock3 aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-warm-gray">Memory Lane</p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-ink">
            {summary.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-warm-gray">{summary.body}</p>
        </div>
      </div>

      <p className="rounded-2xl bg-journal-raised p-3 text-sm font-semibold leading-6 text-soft-ink" aria-live="polite">
        {summary.progressLabel}
      </p>

      <ol className="divide-y divide-journal-line overflow-hidden rounded-2xl border border-journal-line bg-white">
        {summary.milestones.map((milestone) => (
          <li key={milestone.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex min-w-0 gap-3">
              <span
                className={clsx(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full",
                  milestone.isReady ? "bg-leaf/10 text-leaf" : "bg-journal-raised text-warm-gray"
                )}
              >
                {milestone.isReady ? <CheckCircle2 aria-hidden="true" size={17} /> : <CalendarClock aria-hidden="true" size={17} />}
              </span>
              <div className="min-w-0">
                <p className="font-bold leading-5 text-ink">{milestone.label}</p>
                <p className="mt-1 text-sm leading-5 text-warm-gray">{milestone.description}</p>
              </div>
            </div>
            <span
              className={clsx(
                "inline-flex min-h-9 w-fit items-center rounded-full px-3 text-xs font-bold",
                milestone.isReady ? "bg-leaf/10 text-leaf" : "bg-journal-raised text-soft-ink"
              )}
            >
              {milestone.statusLabel}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function NoMemoryLaneMatches(props: EarlyMemoryLaneProps) {
  return <EarlyMemoryLane {...props} />;
}

export function MemoryLaneNoMatches({ completedEntryCount, className }: EarlyMemoryLaneProps) {
  return (
    <div className={clsx("grid gap-3", className)}>
      <div className="flex items-center gap-2 text-sm font-bold text-rose">
        <Sparkles aria-hidden="true" size={17} />
        <span>No look-backs yet</span>
      </div>
      <EarlyMemoryLane completedEntryCount={completedEntryCount} />
    </div>
  );
}
