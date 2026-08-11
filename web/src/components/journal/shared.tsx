/* eslint-disable @next/next/no-img-element -- Journal photos can be local data URLs or private signed storage URLs. */

import { tagChipStyle } from "@/lib/tag-colors";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Bell, CheckCircle2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PersonTag, PromptTemplate } from "@/types/journal";
import type { SaveState } from "@/components/journal/helpers";

export function JournalPhoto({
  src,
  alt,
  className,
  loading
}: {
  src?: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(!src);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (image.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    return (
      <span className={clsx("grid place-items-center bg-journal-raised text-warm-gray", className)} aria-label={alt || "Memory without a loaded photo"}>
        <Sparkles aria-hidden="true" />
      </span>
    );
  }

  return <img ref={imageRef} src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}

export function SaveStatePill({ state, error }: { state: SaveState; error?: string | null }) {
  const labelByState: Record<SaveState, string> = {
    saved: "Saved",
    saving: "Saving",
    offline: "Offline",
    error: "Sync issue",
    local: "Local only",
    readonly: "Read only"
  };
  return (
    <span
      title={error ?? undefined}
      className={clsx(
        "inline-flex rounded-full px-3 py-1.5 text-xs font-bold",
        state === "error" ? "bg-rose/10 text-rose" : state === "saved" ? "bg-leaf/10 text-leaf" : "bg-white text-warm-gray"
      )}
    >
      {labelByState[state]}
    </span>
  );
}

export function PromptSnapshot({ prompts }: { prompts: PromptTemplate[] }) {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-5">
      <SectionTitle icon={Bell} title="Today's prompts" />
      <div className="grid gap-2">
        {prompts.filter((prompt) => prompt.isEnabled).map((prompt) => (
          <p key={prompt.id} className="rounded-2xl bg-journal-raised p-3 text-sm text-soft-ink">{prompt.prompt}</p>
        ))}
      </div>
    </section>
  );
}

export function PersonChips({
  people,
  selectedIds,
  onToggle,
  compact = false,
  disabled = false
}: {
  people: PersonTag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {people.map((person) => {
        const active = selectedIds.includes(person.id);
        return (
          <button
            key={person.id}
            onClick={() => onToggle(person.id)}
            disabled={disabled}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full px-3 font-bold",
              compact ? "min-h-8 text-xs" : "min-h-10 text-sm",
              active ? "bg-rose/10 text-rose" : "bg-journal-raised text-warm-gray"
            )}
            style={active ? tagChipStyle(person.color) : undefined}
            aria-pressed={active}
          >
            {active ? <CheckCircle2 aria-hidden="true" size={14} /> : null}
            {person.name}
          </button>
        );
      })}
    </div>
  );
}

export function ReadOnlyNotice() {
  return (
    <section className="rounded-journal border border-journal-line bg-journal-surface p-4 text-sm leading-6 text-warm-gray">
      Viewer access is read-only for this workspace. Memories, prompts, people tags, photos, and deletes are disabled.
    </section>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header>
      <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-warm-gray">{subtitle}</p>
    </header>
  );
}

export function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose/10 text-rose">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div>
        <h2 className="font-bold">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-warm-gray">{subtitle}</p> : null}
      </div>
    </div>
  );
}
