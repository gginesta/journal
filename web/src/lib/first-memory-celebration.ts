import type { JournalEntry, PhotoAttachment } from "@/types/journal";

type FirstMemorySession = {
  responses?: Array<{
    text?: string | null;
  }>;
};

export type FirstMemoryCelebrationEntry = Pick<JournalEntry, "id" | "sessions" | "photos"> | {
  id?: string;
  sessions?: FirstMemorySession[] | null;
  photos?: PhotoAttachment[] | Array<unknown> | null;
};

export type FirstMemoryCelebrationVisibilityInput = {
  entries: FirstMemoryCelebrationEntry[];
  dismissed?: boolean | null;
  dismissalStorageValue?: string | null;
};

export const FIRST_MEMORY_CELEBRATION_STORAGE_KEY = "photo-gratitude-journal:first-memory-celebration-dismissed";

export const FIRST_MEMORY_CELEBRATION_RETURN_WINDOWS = [
  {
    id: "tomorrow",
    label: "Tomorrow",
    description: "A small nudge can bring this first memory back while it still feels close."
  },
  {
    id: "next-week",
    label: "Next week",
    description: "Memory Lane can turn today into a gentle look-back when the week has moved on."
  },
  {
    id: "one-month",
    label: "One month",
    description: "Soon it can become a monthly marker of what mattered right now."
  }
] as const;

export function firstMemoryCelebrationStorageKey(workspaceId?: string | null): string {
  const trimmedWorkspaceId = workspaceId?.trim();
  return trimmedWorkspaceId
    ? `${FIRST_MEMORY_CELEBRATION_STORAGE_KEY}:${trimmedWorkspaceId}`
    : FIRST_MEMORY_CELEBRATION_STORAGE_KEY;
}

export function isFirstMemoryMeaningfulEntry(entry: FirstMemoryCelebrationEntry): boolean {
  const hasTypedResponse = (entry.sessions ?? []).some((session) =>
    (session.responses ?? []).some((response) => (response.text ?? "").trim().length > 0)
  );
  const hasPhoto = (entry.photos ?? []).length > 0;

  return hasTypedResponse || hasPhoto;
}

export function meaningfulFirstMemoryEntries(entries: FirstMemoryCelebrationEntry[]): FirstMemoryCelebrationEntry[] {
  return entries.filter(isFirstMemoryMeaningfulEntry);
}

export function isFirstMemoryCelebrationDismissed(
  dismissed?: boolean | null,
  dismissalStorageValue?: string | null
): boolean {
  return dismissed === true || dismissalStorageValue === "true";
}

export function shouldShowFirstMemoryCelebration({
  entries,
  dismissed,
  dismissalStorageValue
}: FirstMemoryCelebrationVisibilityInput): boolean {
  if (isFirstMemoryCelebrationDismissed(dismissed, dismissalStorageValue)) return false;
  return meaningfulFirstMemoryEntries(entries).length === 1;
}
