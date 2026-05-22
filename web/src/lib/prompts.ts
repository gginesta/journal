import type { Mood } from "@/types/journal";

export type GratitudePromptPackId =
  | "default-gratitude"
  | "savoring"
  | "appreciation"
  | "self-kindness"
  | "hard-day"
  | "family-relationships";

export type GratitudePromptPack = {
  id: GratitudePromptPackId;
  title: string;
  suggestions: readonly string[];
};

export type GratitudeGuide = {
  pack: GratitudePromptPack;
  moodCopy: string;
  suggestions: readonly string[];
};

export const gratitudePromptPacks: readonly GratitudePromptPack[] = [
  {
    id: "default-gratitude",
    title: "Small Gratitude",
    suggestions: [
      "Something ordinary that helped today",
      "A moment that felt easier than expected",
      "One small comfort I noticed",
      "A simple thing I am glad was here",
      "A tiny win I do not want to skip"
    ]
  },
  {
    id: "savoring",
    title: "Savoring",
    suggestions: [
      "A sound, smell, or color I want to remember",
      "A moment I would pause for one more second",
      "Something that felt warm, calm, or alive",
      "A good detail from the room, meal, walk, or weather",
      "One part of today that deserves a slower look"
    ]
  },
  {
    id: "appreciation",
    title: "Appreciation",
    suggestions: [
      "Someone made one ordinary part of the day easier",
      "A kindness I received or noticed",
      "A person, place, or routine I am grateful for",
      "Something helpful I did not have to carry alone",
      "A small effort from someone else that mattered"
    ]
  },
  {
    id: "self-kindness",
    title: "Self-kindness",
    suggestions: [
      "Something I handled as well as I could",
      "A way I was gentle with myself today",
      "One thing I can let be enough",
      "A choice that protected a little peace",
      "A small sign I kept going"
    ]
  },
  {
    id: "hard-day",
    title: "Hard Day",
    suggestions: [
      "One bearable moment, even if the day was hard",
      "Something that did not make things worse",
      "A tiny comfort I can honestly name",
      "One thing I got through",
      "A small kindness, rest, or breath I can keep"
    ]
  },
  {
    id: "family-relationships",
    title: "Family and Relationships",
    suggestions: [
      "A small exchange with someone I care about",
      "A routine, joke, phrase, or look worth keeping",
      "Someone being themselves in a way I want to remember",
      "A moment of care, patience, or repair",
      "A little togetherness from today"
    ]
  }
] as const;

const guideCopyByMood: Record<Mood | "default", string> = {
  low: "If today was heavy, keep this honest and tiny. One bearable moment counts.",
  quiet: "No need to make today louder. Notice one soft detail and leave the rest.",
  good: "Pick a starter or write your own. It will be added below your words.",
  bright: "Pick a starter or write your own. It will be added below your words.",
  glowing: "Pick a starter or write your own. It will be added below your words.",
  default: "Pick a starter or write your own. It will be added below your words."
};

const packById = new Map(gratitudePromptPacks.map((pack) => [pack.id, pack]));

export function gratitudeGuideForEntry({
  localDate,
  mood,
  hasRelationships = false
}: {
  localDate: string;
  mood: Mood;
  hasRelationships?: boolean;
}): GratitudeGuide {
  const pack = selectPromptPack({ localDate, mood, hasRelationships });
  return {
    pack,
    moodCopy: guideCopyByMood[mood] ?? guideCopyByMood.default,
    suggestions: rotateSuggestions(pack.suggestions, stableIndex(`${localDate}:${mood}:${pack.id}`, pack.suggestions.length)).slice(0, 3)
  };
}

export function addSuggestionToReflectionText(currentText: string, suggestion: string, visibleLineLimit = 3): string {
  const trimmedSuggestion = suggestion.trim();
  if (!trimmedSuggestion) return currentText;

  const alreadyUsed = currentText
    .split("\n")
    .some((line) => line.trim().toLowerCase() === trimmedSuggestion.toLowerCase());
  if (alreadyUsed) return currentText;

  if (!currentText) return trimmedSuggestion;

  const lines = currentText.split("\n");
  const firstBlankIndex = lines.slice(0, visibleLineLimit).findIndex((line) => !line.trim());
  if (firstBlankIndex >= 0) {
    const next = [...lines];
    next[firstBlankIndex] = trimmedSuggestion;
    return trimTrailingBlankLines(next).join("\n");
  }

  if (lines.length < visibleLineLimit) {
    return [...lines, trimmedSuggestion].join("\n");
  }

  const appendIndex = Math.max(0, Math.min(visibleLineLimit - 1, lines.length - 1));
  const next = [...lines];
  next[appendIndex] = `${next[appendIndex]}${next[appendIndex].trim() ? "; " : ""}${trimmedSuggestion}`;
  return next.join("\n");
}

function selectPromptPack({
  localDate,
  mood,
  hasRelationships
}: {
  localDate: string;
  mood: Mood;
  hasRelationships: boolean;
}): GratitudePromptPack {
  if (mood === "low") return requiredPack("hard-day");
  if (mood === "quiet") return requiredPack("self-kindness");

  const candidateIds: GratitudePromptPackId[] = hasRelationships
    ? ["family-relationships", "appreciation", "default-gratitude", "savoring", "self-kindness"]
    : ["default-gratitude", "savoring", "appreciation", "self-kindness"];
  return requiredPack(candidateIds[stableIndex(`${localDate}:${mood}:${hasRelationships}`, candidateIds.length)]);
}

function requiredPack(id: GratitudePromptPackId): GratitudePromptPack {
  const pack = packById.get(id);
  if (!pack) throw new Error(`Missing gratitude prompt pack: ${id}`);
  return pack;
}

function rotateSuggestions(suggestions: readonly string[], startIndex: number): readonly string[] {
  return suggestions.map((_, index) => suggestions[(startIndex + index) % suggestions.length]);
}

function stableIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && !next[next.length - 1]?.trim()) {
    next.pop();
  }
  return next;
}
