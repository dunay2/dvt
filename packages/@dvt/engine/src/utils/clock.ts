import type { IsoUtcString } from '@dvt/contracts';

export interface IClock {
  nowIsoUtc(): IsoUtcString;
}

// Regex for strict ISO UTC: YYYY-MM-DDTHH:mm:ss.mmmZ
const ISO_UTC_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Helper: Check leap year
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Helper: Days in month
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1]!; // month is validated before calling
}

function assertInRange({
  value,
  min,
  max,
  label,
  iso,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  iso: IsoUtcString;
}): void {
  if (value < min || value > max) throw new Error(`Invalid ${label} in ISO UTC: ${iso}`);
}

function parseIsoParts(iso: IsoUtcString): {
  year: number;
  month: number;
  day: number;
  hour: number;
  min: number;
  sec: number;
  milli: number;
} {
  const match = ISO_UTC_REGEX.exec(iso);
  if (!match) throw new Error(`Invalid ISO UTC format: ${iso}`);

  const [_, y, mo, d, h, mi, s, ms] = match;
  return {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    min: Number(mi),
    sec: Number(s),
    milli: Number(ms),
  };
}

function validateIsoParts(parts: ReturnType<typeof parseIsoParts>, iso: IsoUtcString): void {
  assertInRange({ value: parts.month, min: 1, max: 12, label: 'month', iso });
  assertInRange({
    value: parts.day,
    min: 1,
    max: daysInMonth(parts.year, parts.month),
    label: 'day',
    iso,
  });
  assertInRange({ value: parts.hour, min: 0, max: 23, label: 'time', iso });
  assertInRange({ value: parts.min, min: 0, max: 59, label: 'time', iso });
  assertInRange({ value: parts.sec, min: 0, max: 59, label: 'time', iso });
  assertInRange({ value: parts.milli, min: 0, max: 999, label: 'time', iso });
}

function pad(n: number, w: number): string {
  return n.toString().padStart(w, '0');
}

// Howard Hinnant's days-from-civil algorithm (proleptic Gregorian)
function daysFromCivil(y: number, m: number, d: number): number {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468; // 1970-01-01 is day 0
}

function civilFromDays(days: number): { year: number; month: number; day: number } {
  days += 719468;
  const era = Math.floor(days / 146097);
  const doe = days - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  let y = yoe + era * 400;
  let doy = doe - (yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  let mp = Math.floor((5 * doy + 2) / 153);
  let d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  let m = mp < 10 ? mp + 3 : mp - 9;
  y += m <= 2 ? 1 : 0;
  return { year: y, month: m, day: d };
}

// Parse strict ISO UTC string to epoch ms
export function parseIsoUtcToEpochMs(iso: IsoUtcString): number {
  const parts = parseIsoParts(iso);
  validateIsoParts(parts, iso);

  const days = daysFromCivil(parts.year, parts.month, parts.day);
  return (
    days * MS_PER_DAY +
    parts.hour * MS_PER_HOUR +
    parts.min * MS_PER_MINUTE +
    parts.sec * MS_PER_SECOND +
    parts.milli
  );
}

// Convert epoch ms to strict ISO UTC string
export function epochMsToIsoUtc(ms: number): IsoUtcString {
  if (!Number.isFinite(ms) || ms < 0) throw new Error(`Invalid epoch ms: ${ms}`);

  const days = Math.floor(ms / MS_PER_DAY);
  let rem = ms % MS_PER_DAY;
  const { year, month, day } = civilFromDays(days);

  const hour = Math.floor(rem / MS_PER_HOUR);
  rem %= MS_PER_HOUR;
  const min = Math.floor(rem / MS_PER_MINUTE);
  rem %= MS_PER_MINUTE;
  const sec = Math.floor(rem / MS_PER_SECOND);
  rem %= MS_PER_SECOND;
  const milli = rem;

  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T${pad(hour, 2)}:${pad(min, 2)}:${pad(sec, 2)}.${pad(milli, 3)}Z` as IsoUtcString;
}

/**
 * Deterministic, Date-free clock for tests and workflows.
 * Each call returns base + n ms as strict ISO UTC string.
 */
export class SequenceClock implements IClock {
  private counter = 0;
  private readonly baseEpochMs: number;

  constructor(baseIsoUtc: IsoUtcString = '2026-02-12T00:00:00.000Z') {
    this.baseEpochMs = parseIsoUtcToEpochMs(baseIsoUtc);
  }

  nowIsoUtc(): IsoUtcString {
    const ms = this.baseEpochMs + this.counter;
    this.counter += 1;
    return epochMsToIsoUtc(ms);
  }
}
