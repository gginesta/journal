import type { ReminderPreferences } from "@/types/journal";
import { parseTimeToMinutes } from "@/lib/reminder-schedule";

// Calendar fallback for people who skip or can't use push: a small .ics with a
// daily repeating event at the chosen reminder time(s). Times are floating
// local times (no TZID), so the event follows the device's own clock.

const calendarName = "Photo Gratitude Journal";

type IcsEvent = {
  uid: string;
  time: string;
  summary: string;
  description: string;
};

export function buildReminderIcs(reminders: ReminderPreferences, now: Date = new Date()): string {
  const events: IcsEvent[] = [
    {
      uid: "pgj-evening-reminder",
      time: reminders.eveningTime,
      summary: "Keep today — Photo Gratitude Journal",
      description: "One photo or one line is enough."
    }
  ];
  if (reminders.cadence === "morning_evening") {
    events.push({
      uid: "pgj-morning-reminder",
      time: reminders.morningTime,
      summary: "A quiet moment — Photo Gratitude Journal",
      description: "What would you like to notice today?"
    });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Photo Gratitude Journal//Reminders//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`
  ];
  for (const event of events) {
    const minutes = parseTimeToMinutes(event.time) ?? 21 * 60;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@photo-gratitude-journal`,
      `DTSTAMP:${utcTimestamp(now)}`,
      `DTSTART:${localDate(now)}T${paddedTime(minutes)}00`,
      "DURATION:PT15M",
      "RRULE:FREQ=DAILY",
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(event.summary)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function localDate(now: Date): string {
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function paddedTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`;
}

function utcTimestamp(now: Date): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
