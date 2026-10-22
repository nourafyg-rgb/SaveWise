export function toKwdMills(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 1000);
}

export function fromKwdMills(mills: number): number {
  return mills / 1000;
}

export function roundKwd(amount: number): number {
  return fromKwdMills(toKwdMills(amount));
}

export function hasAtMostThreeDecimals(amount: number): boolean {
  return (
    Number.isFinite(amount) &&
    Math.abs(amount * 1000 - Math.round(amount * 1000)) < 0.000001
  );
}

function getDayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not determine the calendar day for this time zone.");
  }
  return `${year}-${month}-${day}`;
}

function previousDay(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
}

export function getStreakSummary(
  completedAtDates: Date[],
  now: Date,
  timeZone: string,
): { currentStreak: number; longestStreak: number; savedToday: boolean } {
  const dayKeys = new Set(
    completedAtDates.map((date) => getDayKey(date, timeZone)),
  );
  const sortedDays = [...dayKeys].sort();
  const today = getDayKey(now, timeZone);
  const yesterday = previousDay(today);

  let longestStreak = 0;
  let runningStreak = 0;
  let previous: string | null = null;
  for (const day of sortedDays) {
    if (previous && previousDay(day) === previous) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runningStreak);
    previous = day;
  }

  const latestEligibleDay = dayKeys.has(today)
    ? today
    : dayKeys.has(yesterday)
      ? yesterday
      : null;
  let currentStreak = 0;
  if (latestEligibleDay) {
    let cursor = latestEligibleDay;
    while (dayKeys.has(cursor)) {
      currentStreak += 1;
      cursor = previousDay(cursor);
    }
  }

  return {
    currentStreak,
    longestStreak,
    savedToday: dayKeys.has(today),
  };
}

export function normalizeTimeZone(value: string): string | null {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions()
      .timeZone;
  } catch {
    return null;
  }
}
