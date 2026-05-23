export function toLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(value: string, style: "short" | "long" = "long"): string {
  return parseLocalDate(value).toLocaleDateString(undefined, {
    weekday: style === "long" ? "long" : undefined,
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: style === "long" ? "numeric" : undefined
  });
}

export function addMonths(value: string, count: number): string {
  const date = parseLocalDate(value);
  date.setMonth(date.getMonth() + count);
  return toLocalDate(date);
}

export function addYears(value: string, count: number): string {
  const date = parseLocalDate(value);
  date.setFullYear(date.getFullYear() + count);
  return toLocalDate(date);
}

export function addDays(value: string, count: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + count);
  return toLocalDate(date);
}

export function dayDistance(lhs: string, rhs: string): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((parseLocalDate(lhs).getTime() - parseLocalDate(rhs).getTime()) / oneDay);
}

export function monthStart(value: string): Date {
  const date = parseLocalDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInCalendarMonth(value: string): Array<{ date: string; inMonth: boolean }> {
  const start = monthStart(value);
  const firstWeekday = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(1 - firstWeekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date: toLocalDate(date),
      inMonth: date.getMonth() === start.getMonth()
    };
  });
}
