import { describe, expect, it } from "vitest";
import {
  defaultExperienceMode,
  demoDefaultExperienceMode,
  featureKeys,
  isExperienceMode,
  isFeatureVisible,
  simpleFeatures,
  visibleTabs
} from "../src/lib/experience-mode";

describe("experience-mode defaults", () => {
  it("new users start in Simple", () => {
    expect(defaultExperienceMode).toBe("simple");
  });

  it("the demo showcase starts in Full", () => {
    expect(demoDefaultExperienceMode).toBe("full");
  });
});

describe("isExperienceMode", () => {
  it("accepts the two valid modes", () => {
    expect(isExperienceMode("simple")).toBe(true);
    expect(isExperienceMode("full")).toBe(true);
  });

  it("rejects anything else (bad localStorage or payload values)", () => {
    for (const value of ["Simple", "FULL", "", null, undefined, 3, {}, ["simple"]]) {
      expect(isExperienceMode(value)).toBe(false);
    }
  });
});

describe("isFeatureVisible", () => {
  it("Full shows every feature", () => {
    for (const feature of featureKeys) {
      expect(isFeatureVisible("full", feature)).toBe(true);
    }
  });

  it("Simple keeps the ritual, the rediscovery payoff, and the trust surfaces", () => {
    for (const feature of [
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
    ] as const) {
      expect(isFeatureVisible("simple", feature)).toBe(true);
    }
  });

  it("Simple hides the analysis, metadata, and customization surfaces", () => {
    for (const feature of [
      "calendarTab",
      "insightsTab",
      "moodPicker",
      "peopleTags",
      "littleDetailsPanel",
      "gratitudeGuide",
      "pickMeUpMemory",
      "promptSnapshot",
      "memoriesFilters",
      "detailsRepository",
      "promptEditor",
      "peopleTagEditor"
    ] as const) {
      expect(isFeatureVisible("simple", feature)).toBe(false);
    }
  });

  it("simpleFeatures is exactly the Simple-visible subset of the key universe", () => {
    const visible = featureKeys.filter((feature) => isFeatureVisible("simple", feature));
    expect(new Set(visible)).toEqual(new Set(simpleFeatures));
  });
});

describe("visibleTabs", () => {
  it("Full keeps all five tabs in order", () => {
    expect(visibleTabs("full")).toEqual(["today", "memories", "calendar", "insights", "settings"]);
  });

  it("Simple drops Calendar and Insights but keeps Settings reachable to toggle back", () => {
    expect(visibleTabs("simple")).toEqual(["today", "memories", "settings"]);
  });
});
