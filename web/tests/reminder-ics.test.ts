import { describe, expect, it } from "vitest";
import type { ReminderPreferences } from "../src/types/journal";
import { buildReminderIcs } from "../src/lib/reminder-ics";

function prefs(overrides: Partial<ReminderPreferences> = {}): ReminderPreferences {
  return {
    cadence: "evening",
    remindersEnabled: true,
    eveningTime: "21:00",
    morningTime: "08:30",
    timezone: null,
    ...overrides
  };
}

// Local-time constructor keeps DTSTART assertions independent of the test
// runner's timezone.
const now = new Date(2026, 7, 11, 12, 0, 0);

describe("buildReminderIcs", () => {
  it("produces a valid calendar wrapper with CRLF line endings", () => {
    const ics = buildReminderIcs(prefs(), now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Photo Gratitude Journal//Reminders//EN");
    expect(ics).not.toContain("\n\n");
  });

  it("contains one daily evening event at the chosen time", () => {
    const ics = buildReminderIcs(prefs({ eveningTime: "20:15" }), now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("DTSTART:20260811T201500");
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("SUMMARY:Keep today — Photo Gratitude Journal");
    expect(ics).toContain("DESCRIPTION:One photo or one line is enough.");
    expect(ics).toContain("UID:pgj-evening-reminder@photo-gratitude-journal");
  });

  it("adds a morning event for the morning_evening cadence", () => {
    const ics = buildReminderIcs(prefs({ cadence: "morning_evening", morningTime: "08:30" }), now);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART:20260811T083000");
    expect(ics).toContain("UID:pgj-morning-reminder@photo-gratitude-journal");
  });

  it("keeps a single event for once_daily and anytime", () => {
    expect(buildReminderIcs(prefs({ cadence: "once_daily" }), now).match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(buildReminderIcs(prefs({ cadence: "anytime" }), now).match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("accepts Postgres time values with seconds", () => {
    const ics = buildReminderIcs(prefs({ eveningTime: "21:00:00" }), now);
    expect(ics).toContain("DTSTART:20260811T210000");
  });

  it("includes a display alarm so calendar apps actually nudge", () => {
    const ics = buildReminderIcs(prefs(), now);
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("ACTION:DISPLAY");
    expect(ics).toContain("TRIGGER:PT0M");
  });
});
