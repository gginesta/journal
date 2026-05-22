import type { JournalEntry, PersonTag } from "@/types/journal";

export type OnboardingFocus = "self" | "partner" | "family" | "other";

export type OnboardingSetup = {
  focus: OnboardingFocus;
  names: {
    me: string;
    partner: string;
    children: string[];
    others: string[];
  };
};

export const onboardingFocusOptions: Array<{ id: OnboardingFocus; title: string; text: string }> = [
  { id: "self", title: "Just me", text: "Personal milestones, moods, routines, and small wins." },
  { id: "partner", title: "Me and my partner", text: "Dates, quiet teamwork, home rhythms, and things worth remembering together." },
  { id: "family", title: "Family / kids", text: "Funny phrases, phases, favorites, and shared days with a household." },
  { id: "other", title: "Other people or themes", text: "Friends, travel, work wins, creative projects, or any thread you want to find again." }
];

export const onboardingStorageVersion = "v3";
export const onboardingStorageKey = `photo-gratitude-onboarding-${onboardingStorageVersion}`;

const genericDefaultNames = new Set(["kid 1", "kid 2", "partner", "family"]);
const colors = ["#5B8DEF", "#E76F51", "#F4A261", "#2A9D8F", "#7C6F64", "#B96464"];

export function applyOnboardingSetupToPeople({
  people,
  entries,
  workspaceId,
  setup
}: {
  people: PersonTag[];
  entries: JournalEntry[];
  workspaceId: string;
  setup: OnboardingSetup;
}): PersonTag[] {
  const usedTagIds = new Set<string>();
  for (const entry of entries) {
    if (entry.workspaceId !== workspaceId) continue;
    entry.personTagIds.forEach((id) => usedTagIds.add(id));
    entry.details.forEach((detail) => detail.personTagIds.forEach((id) => usedTagIds.add(id)));
  }

  let next = people.filter((person) => {
    if (person.workspaceId !== workspaceId) return true;
    if (!person.isDefault) return true;
    if (usedTagIds.has(person.id)) return true;
    return !genericDefaultNames.has(person.name.toLowerCase());
  });

  const workspaceTags = () => next.filter((person) => person.workspaceId === workspaceId);

  function upsertPerson(name: string, aliases: string[]) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
    const existing = workspaceTags().find((person) => normalizedAliases.includes(person.name.toLowerCase()));
    if (existing) {
      next = next.map((person) => (person.id === existing.id ? { ...person, name: trimmed } : person));
      return;
    }

    const duplicate = workspaceTags().find((person) => person.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return;

    next = [
      ...next,
      {
        id: crypto.randomUUID(),
        workspaceId,
        name: trimmed,
        color: colors[workspaceTags().length % colors.length] ?? "#7C6F64",
        sortOrder: workspaceTags().length,
        isDefault: false
      }
    ];
  }

  if (setup.focus === "self" || setup.focus === "partner" || setup.focus === "family") {
    upsertPerson(setup.names.me, ["me", "self"]);
  }

  if (setup.focus === "partner" || setup.focus === "family") {
    upsertPerson(setup.names.partner, ["partner"]);
  }

  if (setup.focus === "family") {
    setup.names.children.forEach((childName, index) => {
      upsertPerson(childName, [`kid ${index + 1}`, `child ${index + 1}`]);
    });
    upsertPerson("Family", ["family", "household"]);
  }

  if (setup.focus === "other") {
    splitFlexibleTags(setup.names.others).forEach((label) => upsertPerson(label, []));
  }

  return next.map((person, index) => (person.workspaceId === workspaceId ? { ...person, sortOrder: index } : person));
}

export function splitFlexibleTags(values: string[]): string[] {
  const tags = values.flatMap((value) => value.split(/[\n,]/).map((part) => part.trim()));
  return tags.filter((tag, index) => tag && tags.findIndex((candidate) => candidate.toLowerCase() === tag.toLowerCase()) === index);
}

export function findPersonalizedPersonName<T extends { name: string }>(people: T[], defaultName: string) {
  const person = people.find((candidate) => candidate.name.toLowerCase() === defaultName.toLowerCase());
  if (!person || person.name === defaultName) return "";
  return person.name;
}
