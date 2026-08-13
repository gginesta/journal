// Experience mode (SPEC-7): the user-facing Simple/Full toggle.
//
// The mode changes only which UI surfaces render. It never changes data, the
// sync protocol, or the entry model — everything created in Full stays stored,
// still appears read-only where it already renders (entry detail, search), and
// returns fully editable when the user switches back.
//
// Pure logic only: no JSX, no I/O. The capability map is transcribed from
// docs/SPEC.md SPEC-7 and asserted against spec/fixtures/experience-mode.json
// by web/tests/spec-conformance.test.ts; iOS mirrors it 1:1 as
// Services/ExperienceMode.swift.

export type ExperienceMode = "simple" | "full";

// New users start in Simple — it makes the "under a minute" promise
// structural. Existing beta users are grandfathered into Full by the
// 202608110002_experience_mode migration backfill.
export const defaultExperienceMode: ExperienceMode = "simple";

// Demo mode starts in Full. The demo is a showcase and its fixture data
// already contains people tags and Little Details — starting Simple would hide
// the surfaces that explain that data. Real new accounts still start Simple.
export const demoDefaultExperienceMode: ExperienceMode = "full";

// Every gateable surface, in capability-map order (docs/SPEC.md SPEC-7).
// Surfaces without a key (Beta/Account settings, onboarding, first-memory
// celebration, starter guide, entry detail modal) always render in both modes.
export const featureKeys = [
  "todayTab",
  "memoriesTab",
  "settingsTab",
  "calendarTab",
  "insightsTab",
  "photoHero",
  "threeNiceThings",
  "completionCard",
  "streakPill",
  "moodPicker",
  "peopleTags",
  "littleDetailsPanel",
  "gratitudeGuide",
  "pickMeUpMemory",
  "promptSnapshot",
  "memoryLanePanel",
  "memoriesSearch",
  "memoriesFilters",
  "detailsRepository",
  "promptEditor",
  "peopleTagEditor",
  "remindersSection",
  "workspacesSection",
  "dataExport",
  "experienceToggle"
] as const;

export type FeatureKey = (typeof featureKeys)[number];

// The Simple column of the SPEC-7 capability matrix: the ritual itself
// (photo + three lines + done), the read-only rediscovery payoff, and the
// trust/plumbing Settings sections that must never gate.
export const simpleFeatures: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  "todayTab",
  "memoriesTab",
  "settingsTab",
  "photoHero",
  "threeNiceThings",
  "completionCard",
  "streakPill",
  "memoryLanePanel",
  "memoriesSearch",
  "remindersSection",
  "workspacesSection",
  "dataExport",
  "experienceToggle"
]);

export function isExperienceMode(value: unknown): value is ExperienceMode {
  return value === "simple" || value === "full";
}

export function isFeatureVisible(mode: ExperienceMode, feature: FeatureKey): boolean {
  return mode === "full" || simpleFeatures.has(feature);
}

const tabOrder = ["today", "memories", "calendar", "insights", "settings"] as const;

export type ExperienceTab = (typeof tabOrder)[number];

export function visibleTabs(mode: ExperienceMode): ExperienceTab[] {
  return tabOrder.filter((tab) => isFeatureVisible(mode, `${tab}Tab`));
}
