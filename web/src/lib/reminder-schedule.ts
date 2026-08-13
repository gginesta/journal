// Pure due-window computation for the reminder dispatcher. The cron fires
// every 15 minutes; a reminder is due when its local wall-clock time falls
// inside the window the current tick belongs to (now floored to the window
// start), so a tick at 21:03 delivers a 21:00 reminder exactly once.

export type ReminderKind = "morning" | "evening";

export type ReminderSchedulePrefs = {
  cadence: "evening" | "once_daily" | "morning_evening" | "anytime";
  eveningTime: string;
  morningTime: string;
  // IANA zone the times were chosen in; null/undefined means UTC (legacy rows).
  timezone?: string | null;
};

export const dispatchWindowMinutes = 15;

// Accepts "21:00" and the Postgres time form "21:00:00".
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function localMinutesOfDay(nowUtc: Date, timezone: string | null | undefined): number {
  const parts = formatParts(nowUtc, timezone || "UTC") ?? formatParts(nowUtc, "UTC");
  const hour = Number(parts?.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts?.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function formatParts(nowUtc: Date, timeZone: string): Intl.DateTimeFormatPart[] | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(nowUtc);
  } catch {
    // Unknown zone names in stored data degrade to UTC instead of never firing.
    return null;
  }
}

export function dueReminder(
  prefs: ReminderSchedulePrefs,
  nowUtc: Date,
  windowMinutes: number = dispatchWindowMinutes
): ReminderKind | null {
  if (prefs.cadence === "anytime") return null;

  const nowMinutes = localMinutesOfDay(nowUtc, prefs.timezone);
  const windowStart = Math.floor(nowMinutes / windowMinutes) * windowMinutes;
  const isInWindow = (time: string) => {
    const minutes = parseTimeToMinutes(time);
    return minutes !== null && minutes >= windowStart && minutes < windowStart + windowMinutes;
  };

  // evening and once_daily nudge at the evening time; morning_evening adds the
  // morning time; anytime never pushes.
  if (isInWindow(prefs.eveningTime)) return "evening";
  if (prefs.cadence === "morning_evening" && isInWindow(prefs.morningTime)) return "morning";
  return null;
}
