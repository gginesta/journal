import type { PersonTag, Workspace } from "@/types/journal";

export type MemoryFocus = "solo" | "partner" | "family" | "custom";

const childSignals = ["kid", "child", "son", "daughter", "baby", "family"];
const partnerSignals = ["partner", "wife", "husband", "spouse"];

export function inferMemoryFocus(workspace: Workspace | null, people: PersonTag[]): MemoryFocus {
  const labels = people.map((person) => person.name.toLowerCase());
  if (workspace?.kind === "household" || labels.some((label) => childSignals.some((signal) => label.includes(signal)))) return "family";
  if (labels.some((label) => partnerSignals.some((signal) => label.includes(signal)))) return "partner";
  if (people.some((person) => !["me", "kid 1", "kid 2", "partner", "family"].includes(person.name.toLowerCase()))) return "custom";
  return "solo";
}

export function littleDetailsNudgeCopy(focus: MemoryFocus) {
  if (focus === "family") {
    return {
      title: "Tiny family details",
      prompt: "Any little phase, funny pronunciation, snack, routine, or habit worth keeping?"
    };
  }
  if (focus === "partner") {
    return {
      title: "Small things together",
      prompt: "Any quiet routine, phrase, kindness, place, or ordinary moment you might want back later?"
    };
  }
  if (focus === "custom") {
    return {
      title: "Tiny details",
      prompt: "Any phrase, favorite, place, milestone, habit, or little thread worth finding again?"
    };
  }
  return {
    title: "Tiny details",
    prompt: "Any phrase, habit, milestone, comfort, or little thing about this season worth remembering?"
  };
}

export function sharedJournalCopy(workspace: Workspace | null, people: PersonTag[]) {
  const focus = inferMemoryFocus(workspace, people);
  if (focus === "family") {
    return {
      title: "A private family journal",
      body: "A shared place for the memories you both want to keep: the photos, phrases, tiny phases, and ordinary good days."
    };
  }
  if (focus === "partner") {
    return {
      title: "A private journal for two",
      body: "Keep the small routines, kind moments, and photos you may both want to find again later."
    };
  }
  if (focus === "custom") {
    return {
      title: "A private shared journal",
      body: "Use this space for the people, places, projects, or themes you want to remember together."
    };
  }
  return {
    title: "Your private journal",
    body: "Keep one good thing at a time. You can invite someone later if this becomes a memory space to share."
  };
}
