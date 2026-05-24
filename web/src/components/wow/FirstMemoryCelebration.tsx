"use client";

import { CalendarClock, Camera, CheckCircle2, Sparkles, X } from "lucide-react";
import {
  FIRST_MEMORY_CELEBRATION_RETURN_WINDOWS,
  type FirstMemoryCelebrationEntry,
  isFirstMemoryMeaningfulEntry
} from "@/lib/first-memory-celebration";

type FirstMemoryCelebrationProps = {
  entry?: FirstMemoryCelebrationEntry | null;
  onDismiss?: () => void;
  onOpenMemoryLane?: () => void;
  className?: string;
};

function entryKind(entry?: FirstMemoryCelebrationEntry | null): "text" | "photo" | "mixed" | "memory" {
  if (!entry) return "memory";

  const hasTypedResponse = (entry.sessions ?? []).some((session) =>
    (session.responses ?? []).some((response) => (response.text ?? "").trim().length > 0)
  );
  const hasPhoto = (entry.photos ?? []).length > 0;

  if (hasTypedResponse && hasPhoto) return "mixed";
  if (hasPhoto) return "photo";
  if (hasTypedResponse) return "text";
  return "memory";
}

const entryKindCopy = {
  text: "Your words are saved.",
  photo: "Your photo is saved.",
  mixed: "Your words and photo are saved.",
  memory: "Your first memory is saved."
};

export function FirstMemoryCelebration({
  entry,
  onDismiss,
  onOpenMemoryLane,
  className = ""
}: FirstMemoryCelebrationProps) {
  const kind = isFirstMemoryMeaningfulEntry(entry ?? {}) ? entryKind(entry) : "memory";

  return (
    <section
      className={`relative overflow-hidden rounded-journal border border-rose/15 bg-[linear-gradient(135deg,#fffdf8,#f7fbf2_52%,#fff7f1)] shadow-sm ${className}`}
      aria-labelledby="first-memory-celebration-title"
    >
      <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <div className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-rose/10 px-3 text-xs font-bold text-rose">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            First memory saved
          </div>

          <h2 id="first-memory-celebration-title" className="text-xl font-bold leading-7 text-ink sm:text-2xl">
            This memory is now part of Memory Lane.
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-soft-ink sm:text-base">
            {entryKindCopy[kind]} Soon it can return as a quiet look-back: tomorrow, next week, or one month from now.
          </p>
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/80 text-warm-gray shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-rose/15 md:static"
            aria-label="Dismiss first memory celebration"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <div className="grid gap-3 md:col-span-2">
          <div className="grid gap-2 border-y border-journal-line py-3 sm:grid-cols-3">
            {FIRST_MEMORY_CELEBRATION_RETURN_WINDOWS.map((window) => (
              <div key={window.id} className="flex gap-3 py-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-leaf shadow-sm">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{window.label}</span>
                  <span className="block text-xs leading-5 text-warm-gray">{window.description}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-leaf">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Saved with at least one response or photo.
            </div>

            {onOpenMemoryLane ? (
              <button
                type="button"
                onClick={onOpenMemoryLane}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose px-4 text-sm font-bold text-white shadow-sm transition hover:bg-rose/90 focus:outline-none focus:ring-4 focus:ring-rose/20"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Visit Memory Lane
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FirstMemoryCelebration;
