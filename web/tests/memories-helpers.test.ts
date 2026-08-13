import { describe, expect, it } from "vitest";
import type { JournalEntry } from "../src/types/journal";
import { formatMemoryDayLabel, groupEntriesByMonth } from "../src/components/journal/memories-helpers";

function entry(id: string, localDate: string): JournalEntry {
  return {
    id,
    workspaceId: "w1",
    localDate,
    mood: "good",
    note: "",
    createdAt: `${localDate}T00:00:00.000Z`,
    updatedAt: `${localDate}T00:00:00.000Z`,
    personTagIds: [],
    photos: [],
    sessions: [],
    details: []
  };
}

describe("memories month grouping", () => {
  it("groups entries under newest-first month sections with newest-first days", () => {
    const groups = groupEntriesByMonth(
      [entry("a", "2026-07-30"), entry("b", "2026-08-12"), entry("c", "2026-08-09"), entry("d", "2026-08-11")],
      "2026-08-13"
    );

    expect(groups.map((group) => group.key)).toEqual(["2026-08", "2026-07"]);
    expect(groups[0].entries.map((item) => item.id)).toEqual(["b", "d", "c"]);
    expect(groups[1].entries.map((item) => item.id)).toEqual(["a"]);
  });

  it("counts distinct kept days per month", () => {
    const groups = groupEntriesByMonth([entry("a", "2026-08-12"), entry("b", "2026-08-12"), entry("c", "2026-08-09")], "2026-08-13");
    expect(groups).toHaveLength(1);
    expect(groups[0].dayCount).toBe(2);
  });

  it("shows the year in the title only once the month is from another year", () => {
    const groups = groupEntriesByMonth([entry("a", "2026-08-12"), entry("b", "2025-12-31")], "2026-08-13");
    expect(groups[0].title).not.toContain("2026");
    expect(groups[1].title).toContain("2025");
    // Screen readers always get month + year, current year included.
    expect(groups[0].ariaLabel).toContain("2026");
    expect(groups[1].ariaLabel).toContain("2025");
  });

  it("formats memory day labels with a weekday, month, and day", () => {
    const expected = new Date(2026, 7, 12).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    expect(formatMemoryDayLabel("2026-08-12")).toBe(expected);
  });
});
