import { Clock3 } from "lucide-react";
import type { JournalEntry } from "@/types/journal";
import { formatDisplayDate, toLocalDate } from "@/lib/dates";
import { firstResponseExcerpt, isEntryComplete, memoryLaneMatches } from "@/lib/journal-logic";
import { MemoryLaneNoMatches } from "@/components/wow/EarlyMemoryLane";
import { JournalPhoto, SectionTitle } from "@/components/journal/shared";

export function MemoryLanePanel({
  matches,
  entries,
  onOpenEntry
}: {
  matches: ReturnType<typeof memoryLaneMatches>;
  entries: JournalEntry[];
  onOpenEntry: (entryId: string) => void;
}) {
  const fallback = entries
    .filter((entry) => entry.localDate !== toLocalDate() && isEntryComplete(entry))
    .sort((left, right) => right.localDate.localeCompare(left.localDate))[0];
  const completeCount = entries.filter(isEntryComplete).length;

  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Clock3} title="Memory Lane" subtitle="A little window back to recent, monthly, and anniversary moments." />
      <div className="grid gap-3">
        {matches.length > 0
          ? matches.map((match) => {
              const entry = entries.find((candidate) => candidate.id === match.entryId);
              return entry ? (
                <MemoryLaneCard
                  key={match.id}
                  entry={entry}
                  label={memoryLaneLabel(match)}
                  onOpen={onOpenEntry}
                />
              ) : null;
            })
          : fallback
            ? <MemoryLaneCard entry={fallback} label="Recent good thing" onOpen={onOpenEntry} />
            : <MemoryLaneEmpty completeCount={completeCount} />}
      </div>
    </section>
  );
}

function memoryLaneLabel(match: ReturnType<typeof memoryLaneMatches>[number]) {
  if (match.label === "Recent good thing" || match.label === "Yesterday" || match.dayDistance === 0) return match.label;
  return `Around ${match.label}`;
}

function MemoryLaneCard({ entry, label, onOpen }: { entry: JournalEntry; label: string; onOpen: (entryId: string) => void }) {
  const photo = entry.photos[0];
  const text = photo?.caption.trim() || firstResponseExcerpt(entry) || entry.details.find((detail) => detail.text.trim())?.text || "Open memory";

  return (
    <button type="button" onClick={() => onOpen(entry.id)} className="flex gap-3 rounded-2xl bg-journal-raised p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
      <JournalPhoto src={photo?.previewUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
      <div className="min-w-0">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-warm-gray">{formatDisplayDate(entry.localDate, "short")}</p>
        <p className="mt-1 line-clamp-2 text-sm text-soft-ink">{text}</p>
      </div>
    </button>
  );
}

function MemoryLaneEmpty({ completeCount }: { completeCount: number }) {
  return <MemoryLaneNoMatches completedEntryCount={completeCount} />;
}
