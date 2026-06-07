import { describe, expect, it } from "vitest";
import { applyOnboardingSetupToPeople, splitFlexibleTags, workspaceHasMeaningfulData } from "../src/lib/onboarding";
import type { JournalEntry, PersonTag } from "../src/types/journal";

const workspaceId = "ws-1";

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: overrides.id ?? "entry-1",
    workspaceId,
    localDate: "2026-06-07",
    mood: "good",
    note: "",
    sessions: [],
    photos: [],
    personTagIds: [],
    details: [],
    createdAt: "2026-06-07T20:00:00.000Z",
    updatedAt: "2026-06-07T20:00:00.000Z",
    ...overrides
  };
}

function completeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return entry({
    sessions: [
      {
        id: "s-1",
        kind: "evening",
        responses: [{ id: "r-1", promptId: "p-1", promptTitle: "", promptText: "", promptOrder: 0, text: "A good day" }]
      }
    ],
    ...overrides
  });
}

describe("applyOnboardingSetupToPeople", () => {
  it("creates real named tags from a family setup without any generic placeholders", () => {
    const result = applyOnboardingSetupToPeople({
      people: [],
      entries: [],
      workspaceId,
      setup: {
        focus: "family",
        names: { me: "Steph", partner: "Guillermo", children: ["Mia", "Theo"], others: [] }
      }
    });

    const names = result.map((person) => person.name);
    expect(names).toEqual(["Steph", "Guillermo", "Mia", "Theo"]);
    expect(names).not.toContain("Family");
    expect(names.some((name) => /kid|child/i.test(name))).toBe(false);
    expect(result.every((person) => person.isDefault === false)).toBe(true);
  });

  it("creates a single 'me' tag for a solo setup", () => {
    const result = applyOnboardingSetupToPeople({
      people: [],
      entries: [],
      workspaceId,
      setup: { focus: "self", names: { me: "Steph", partner: "", children: [], others: [] } }
    });
    expect(result.map((person) => person.name)).toEqual(["Steph"]);
  });

  it("splits comma and newline separated custom tags for the 'other' focus", () => {
    const result = applyOnboardingSetupToPeople({
      people: [],
      entries: [],
      workspaceId,
      setup: { focus: "other", names: { me: "", partner: "", children: [], others: ["Travel, Work wins\nFriends"] } }
    });
    expect(result.map((person) => person.name)).toEqual(["Travel", "Work wins", "Friends"]);
  });

  it("ignores blank names", () => {
    const result = applyOnboardingSetupToPeople({
      people: [],
      entries: [],
      workspaceId,
      setup: { focus: "family", names: { me: "Steph", partner: "", children: ["", "  "], others: [] } }
    });
    expect(result.map((person) => person.name)).toEqual(["Steph"]);
  });

  it("never drops a tag that is referenced by an existing entry", () => {
    const referenced: PersonTag = { id: "grandma", workspaceId, name: "Grandma", color: "#000", sortOrder: 0, isDefault: true };
    const result = applyOnboardingSetupToPeople({
      people: [referenced],
      entries: [entry({ personTagIds: ["grandma"] })],
      workspaceId,
      setup: { focus: "self", names: { me: "Steph", partner: "", children: [], others: [] } }
    });
    expect(result.some((person) => person.id === "grandma")).toBe(true);
  });
});

describe("workspaceHasMeaningfulData", () => {
  it("is false for an empty workspace", () => {
    expect(workspaceHasMeaningfulData({ people: [], entries: [], workspaceId })).toBe(false);
  });

  it("ignores empty placeholder entries", () => {
    expect(workspaceHasMeaningfulData({ people: [], entries: [entry()], workspaceId })).toBe(false);
  });

  it("is true when a complete entry exists", () => {
    expect(workspaceHasMeaningfulData({ people: [], entries: [completeEntry()], workspaceId })).toBe(true);
  });

  it("is true when a user-created (non-default) person tag exists", () => {
    const person: PersonTag = { id: "p1", workspaceId, name: "Mia", color: "#000", sortOrder: 0, isDefault: false };
    expect(workspaceHasMeaningfulData({ people: [person], entries: [], workspaceId })).toBe(true);
  });

  it("is false when only default tags exist", () => {
    const person: PersonTag = { id: "p1", workspaceId, name: "Family", color: "#000", sortOrder: 0, isDefault: true };
    expect(workspaceHasMeaningfulData({ people: [person], entries: [], workspaceId })).toBe(false);
  });
});

describe("splitFlexibleTags", () => {
  it("dedupes case-insensitively and trims", () => {
    expect(splitFlexibleTags(["Travel, travel", " Work "])).toEqual(["Travel", "Work"]);
  });
});
