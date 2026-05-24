import { describe, expect, it } from "vitest";
import { earlyMemoryLaneMilestones, getEarlyMemoryLaneSummary } from "../src/lib/early-memory-lane";

describe("early memory lane helpers", () => {
  it("returns an encouraging empty-state summary for no completed entries", () => {
    const summary = getEarlyMemoryLaneSummary(0);

    expect(summary.headline).toBe("Your Memory Lane is starting.");
    expect(summary.nextMilestone?.label).toBe("Yesterday");
    expect(summary.progressLabel).toBe("1 more entry until yesterday starts showing up.");
    expect(summary.milestones.map((milestone) => milestone.statusLabel)).toEqual([
      "1 more entry",
      "7 more entries",
      "30 more entries",
      "365 more entries"
    ]);
  });

  it("progresses through yesterday, week, month, and anniversary milestones", () => {
    expect(earlyMemoryLaneMilestones(1).map((milestone) => [milestone.label, milestone.statusLabel])).toEqual([
      ["Yesterday", "Ready now"],
      ["Last week", "6 more entries"],
      ["One month", "29 more entries"],
      ["Future anniversaries", "364 more entries"]
    ]);

    expect(getEarlyMemoryLaneSummary(7).nextMilestone?.label).toBe("One month");
    expect(getEarlyMemoryLaneSummary(30).nextMilestone?.label).toBe("Future anniversaries");
  });

  it("normalizes unsafe counts before calculating countdown copy", () => {
    expect(getEarlyMemoryLaneSummary(-3).completedEntryCount).toBe(0);
    expect(getEarlyMemoryLaneSummary(6.9).progressLabel).toBe("1 more entry until last week starts showing up.");
  });

  it("marks all milestones ready once anniversary history exists", () => {
    const summary = getEarlyMemoryLaneSummary(365);

    expect(summary.nextMilestone).toBeNull();
    expect(summary.progressLabel).toBe("Your journal has enough history for anniversary memories to keep returning.");
    expect(summary.milestones.every((milestone) => milestone.isReady)).toBe(true);
  });
});
