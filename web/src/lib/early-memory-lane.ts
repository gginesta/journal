export type EarlyMemoryLaneMilestoneId = "yesterday" | "last-week" | "one-month" | "anniversary";

export type EarlyMemoryLaneMilestone = {
  id: EarlyMemoryLaneMilestoneId;
  label: string;
  value: string;
  description: string;
  threshold: number;
  isReady: boolean;
  remainingEntries: number;
  statusLabel: string;
};

export type EarlyMemoryLaneSummary = {
  completedEntryCount: number;
  headline: string;
  body: string;
  nextMilestone: EarlyMemoryLaneMilestone | null;
  progressLabel: string;
  milestones: EarlyMemoryLaneMilestone[];
};

const milestoneBlueprints: Array<Omit<EarlyMemoryLaneMilestone, "isReady" | "remainingEntries" | "statusLabel">> = [
  {
    id: "yesterday",
    label: "Yesterday",
    value: "1 kept day",
    description: "After the first saved entry, Memory Lane can start returning yesterday's small good thing.",
    threshold: 1
  },
  {
    id: "last-week",
    label: "Last week",
    value: "7 kept days",
    description: "A week of entries gives the lane enough texture to bring back this time last week.",
    threshold: 7
  },
  {
    id: "one-month",
    label: "One month",
    value: "30 kept days",
    description: "As the month fills in, older photos and notes can return when they feel newly useful.",
    threshold: 30
  },
  {
    id: "anniversary",
    label: "Future anniversaries",
    value: "365 kept days",
    description: "The longer the journal grows, the more birthdays, seasons, and annual rhythms can resurface.",
    threshold: 365
  }
];

function entryWord(count: number): string {
  return count === 1 ? "entry" : "entries";
}

function milestoneStatus(threshold: number, completedEntryCount: number): string {
  const remaining = Math.max(threshold - completedEntryCount, 0);
  if (remaining === 0) return "Ready now";
  return `${remaining} more ${entryWord(remaining)}`;
}

export function getEarlyMemoryLaneSummary(completedEntryCount: number): EarlyMemoryLaneSummary {
  const safeCount = Math.max(0, Math.floor(completedEntryCount));
  const milestones = milestoneBlueprints.map((milestone) => {
    const remainingEntries = Math.max(milestone.threshold - safeCount, 0);
    return {
      ...milestone,
      isReady: remainingEntries === 0,
      remainingEntries,
      statusLabel: milestoneStatus(milestone.threshold, safeCount)
    };
  });
  const nextMilestone = milestones.find((milestone) => !milestone.isReady) ?? null;

  return {
    completedEntryCount: safeCount,
    headline: "Your Memory Lane is starting.",
    body: safeCount === 0
      ? "Save one photo, note, or tiny detail and this space will have somewhere warm to begin."
      : "Every kept entry gives Memory Lane more to bring back: yesterday, last week, one month, and future anniversaries as your journal grows.",
    nextMilestone,
    progressLabel: nextMilestone
      ? `${nextMilestone.statusLabel} until ${nextMilestone.label.toLowerCase()} starts showing up.`
      : "Your journal has enough history for anniversary memories to keep returning.",
    milestones
  };
}

export function earlyMemoryLaneMilestones(completedEntryCount: number): EarlyMemoryLaneMilestone[] {
  return getEarlyMemoryLaneSummary(completedEntryCount).milestones;
}
