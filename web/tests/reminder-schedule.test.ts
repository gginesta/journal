import { describe, expect, it } from "vitest";
import { dueReminder, localMinutesOfDay, parseTimeToMinutes } from "../src/lib/reminder-schedule";

function prefs(overrides: Partial<Parameters<typeof dueReminder>[0]> = {}) {
  return {
    cadence: "evening" as const,
    eveningTime: "21:00",
    morningTime: "08:30",
    timezone: null,
    ...overrides
  };
}

describe("parseTimeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseTimeToMinutes("21:00")).toBe(21 * 60);
    expect(parseTimeToMinutes("08:30")).toBe(8 * 60 + 30);
  });

  it("parses the Postgres time form HH:MM:SS", () => {
    expect(parseTimeToMinutes("21:00:00")).toBe(21 * 60);
  });

  it("rejects garbage and out-of-range values", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("evening")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("12:75")).toBeNull();
  });
});

describe("localMinutesOfDay", () => {
  it("treats a missing timezone as UTC", () => {
    expect(localMinutesOfDay(new Date("2026-08-11T21:07:00Z"), null)).toBe(21 * 60 + 7);
  });

  it("converts into a non-UTC zone", () => {
    // 01:00 UTC on Aug 12 is 21:00 on Aug 11 in New York (EDT, UTC-4).
    expect(localMinutesOfDay(new Date("2026-08-12T01:00:00Z"), "America/New_York")).toBe(21 * 60);
  });

  it("handles half-hour offsets", () => {
    // 15:30 UTC is 21:00 in Kolkata (UTC+5:30).
    expect(localMinutesOfDay(new Date("2026-08-11T15:30:00Z"), "Asia/Kolkata")).toBe(21 * 60);
  });

  it("falls back to UTC for an unknown zone name", () => {
    expect(localMinutesOfDay(new Date("2026-08-11T21:00:00Z"), "Not/AZone")).toBe(21 * 60);
  });
});

describe("dueReminder", () => {
  it("fires the evening reminder inside its 15-minute window", () => {
    expect(dueReminder(prefs(), new Date("2026-08-11T21:00:00Z"))).toBe("evening");
    expect(dueReminder(prefs(), new Date("2026-08-11T21:07:00Z"))).toBe("evening");
    expect(dueReminder(prefs(), new Date("2026-08-11T21:14:59Z"))).toBe("evening");
  });

  it("stays quiet outside the window", () => {
    expect(dueReminder(prefs(), new Date("2026-08-11T20:59:00Z"))).toBeNull();
    expect(dueReminder(prefs(), new Date("2026-08-11T21:15:00Z"))).toBeNull();
    expect(dueReminder(prefs(), new Date("2026-08-11T09:00:00Z"))).toBeNull();
  });

  it("floors the tick to the window start, so a late cron still matches", () => {
    // Tick at 21:14 belongs to the 21:00 window; a 21:05 reminder is due.
    expect(dueReminder(prefs({ eveningTime: "21:05" }), new Date("2026-08-11T21:14:00Z"))).toBe("evening");
    // Tick at 21:16 belongs to the 21:15 window; a 21:05 reminder is not.
    expect(dueReminder(prefs({ eveningTime: "21:05" }), new Date("2026-08-11T21:16:00Z"))).toBeNull();
  });

  it("uses the evening time for once_daily", () => {
    expect(dueReminder(prefs({ cadence: "once_daily" }), new Date("2026-08-11T21:00:00Z"))).toBe("evening");
    expect(dueReminder(prefs({ cadence: "once_daily" }), new Date("2026-08-11T08:30:00Z"))).toBeNull();
  });

  it("fires both times for morning_evening", () => {
    expect(dueReminder(prefs({ cadence: "morning_evening" }), new Date("2026-08-11T08:30:00Z"))).toBe("morning");
    expect(dueReminder(prefs({ cadence: "morning_evening" }), new Date("2026-08-11T21:00:00Z"))).toBe("evening");
  });

  it("ignores the morning time for the evening cadence", () => {
    expect(dueReminder(prefs({ cadence: "evening" }), new Date("2026-08-11T08:30:00Z"))).toBeNull();
  });

  it("never pushes for anytime", () => {
    expect(dueReminder(prefs({ cadence: "anytime" }), new Date("2026-08-11T21:00:00Z"))).toBeNull();
  });

  it("respects the stored timezone in summer and winter", () => {
    const newYork = prefs({ timezone: "America/New_York" });
    // EDT (UTC-4): local 21:00 is 01:00 UTC the next day.
    expect(dueReminder(newYork, new Date("2026-08-12T01:00:00Z"))).toBe("evening");
    expect(dueReminder(newYork, new Date("2026-08-11T21:00:00Z"))).toBeNull();
    // EST (UTC-5): local 21:00 is 02:00 UTC the next day.
    expect(dueReminder(newYork, new Date("2026-01-16T02:00:00Z"))).toBe("evening");
    expect(dueReminder(newYork, new Date("2026-01-16T01:00:00Z"))).toBeNull();
  });

  it("handles half-hour timezone offsets", () => {
    const kolkata = prefs({ timezone: "Asia/Kolkata" });
    expect(dueReminder(kolkata, new Date("2026-08-11T15:30:00Z"))).toBe("evening");
    expect(dueReminder(kolkata, new Date("2026-08-11T21:00:00Z"))).toBeNull();
  });

  it("accepts Postgres time values with seconds", () => {
    expect(dueReminder(prefs({ eveningTime: "21:00:00" }), new Date("2026-08-11T21:03:00Z"))).toBe("evening");
  });

  it("stays quiet when the stored time is unparseable", () => {
    expect(dueReminder(prefs({ eveningTime: "not a time" }), new Date("2026-08-11T21:00:00Z"))).toBeNull();
  });
});
