/**
 * Timezone-aware period helpers (Europe/Bucharest).
 *
 * Charts and share-of-airplay define:
 * - week  = Monday 00:00 -> Sunday 23:59:59 local Bucharest time (ISO week)
 * - month = calendar month, local Bucharest time
 *
 * All functions return UTC Date instants that correspond to local-midnight
 * boundaries, so they can be passed straight into SQL comparisons against
 * timestamptz/timestamp columns stored in UTC.
 */

export const CHART_TZ = "Europe/Bucharest";

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getLocalParts(date: Date, tz: string): LocalParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // "24" can appear at midnight with hour12:false in some ICU versions
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * UTC instant of local midnight (00:00) on the given local calendar date in tz.
 * Two-pass offset correction handles DST transitions.
 */
function localMidnightUtc(year: number, month: number, day: number, tz: string): Date {
  // First guess: treat local midnight as if it were UTC midnight.
  let guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  for (let i = 0; i < 2; i++) {
    const local = getLocalParts(guess, tz);
    const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const target = Date.UTC(year, month - 1, day, 0, 0, 0);
    const diff = target - asUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

/** ISO day-of-week (1 = Monday ... 7 = Sunday) of the local date in tz. */
function localIsoWeekday(date: Date, tz: string): number {
  const local = getLocalParts(date, tz);
  // Build a UTC date carrying the local calendar date; weekday is tz-independent then.
  const utc = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const dow = utc.getUTCDay(); // 0 = Sunday
  return dow === 0 ? 7 : dow;
}

/** Start of the local ISO week (Monday 00:00 Bucharest) containing `ref`, as a UTC instant. */
export function startOfWeek(ref: Date = new Date(), tz: string = CHART_TZ): Date {
  const local = getLocalParts(ref, tz);
  const weekday = localIsoWeekday(ref, tz);
  // Walk back (weekday - 1) local days. Use UTC date arithmetic on the local
  // calendar date (calendar math is tz-independent), then anchor at local midnight.
  const anchor = new Date(Date.UTC(local.year, local.month - 1, local.day));
  anchor.setUTCDate(anchor.getUTCDate() - (weekday - 1));
  return localMidnightUtc(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), tz);
}

/** Start of the local calendar day (00:00 Bucharest) containing `ref`, as a UTC instant. */
export function startOfDay(ref: Date = new Date(), tz: string = CHART_TZ): Date {
  const local = getLocalParts(ref, tz);
  return localMidnightUtc(local.year, local.month, local.day, tz);
}

/** Start of the local calendar month containing `ref`, as a UTC instant. */
export function startOfMonth(ref: Date = new Date(), tz: string = CHART_TZ): Date {
  const local = getLocalParts(ref, tz);
  return localMidnightUtc(local.year, local.month, 1, tz);
}

/** Shift a local-midnight instant by whole local days (DST-safe). */
export function addLocalDays(instant: Date, days: number, tz: string = CHART_TZ): Date {
  const local = getLocalParts(instant, tz);
  const anchor = new Date(Date.UTC(local.year, local.month - 1, local.day));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return localMidnightUtc(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), tz);
}

/** Start of the local calendar month `months` before the month containing `instant`. */
export function addLocalMonths(instant: Date, months: number, tz: string = CHART_TZ): Date {
  const local = getLocalParts(instant, tz);
  const totalMonths = local.year * 12 + (local.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12 + 12) % 12 + 1;
  return localMidnightUtc(year, month, 1, tz);
}

export type ChartPeriod = "week" | "month";

export interface PeriodWindow {
  /** Current period start (inclusive). */
  start: Date;
  /** Current period end (exclusive) — "now" for the running period. */
  end: Date;
  /** Previous full period start (inclusive). */
  prevStart: Date;
  /** Previous full period end (exclusive) == current period start. */
  prevEnd: Date;
}

/**
 * Current running period (week-to-date / month-to-date, Bucharest) plus the
 * previous full period used for delta computation.
 */
export function periodWindow(period: ChartPeriod, now: Date = new Date()): PeriodWindow {
  if (period === "month") {
    const start = startOfMonth(now);
    return { start, end: now, prevStart: addLocalMonths(start, -1), prevEnd: start };
  }
  const start = startOfWeek(now);
  return { start, end: now, prevStart: addLocalDays(start, -7), prevEnd: start };
}
