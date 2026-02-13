import type { IsoUtcString } from '@dvt/contracts';

export interface IClock {
  nowIsoUtc(): IsoUtcString;
}

// Regex for strict ISO UTC: YYYY-MM-DDTHH:mm:ss.mmmZ
const ISO_UTC_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

// Helper: Check leap year
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Helper: Days in month
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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
  const m = ISO_UTC_REGEX.exec(iso);
  if (!m) throw new Error(`Invalid ISO UTC format: ${iso}`);
  const [_, y, mo, d, h, mi, s, ms] = m;
  const year = Number(y),
    month = Number(mo),
    day = Number(d);
  const hour = Number(h),
    min = Number(mi),
    sec = Number(s),
    milli = Number(ms);
  if (month < 1 || month > 12) throw new Error(`Invalid month in ISO UTC: ${iso}`);
  let dim = DAYS_IN_MONTH[month - 1]!; // validated month in 1..12 above
  if (month === 2 && isLeapYear(year)) dim = 29;
  if (day < 1 || day > dim) throw new Error(`Invalid day in ISO UTC: ${iso}`);
  if (hour > 23 || min > 59 || sec > 59 || milli > 999)
    throw new Error(`Invalid time in ISO UTC: ${iso}`);
  const days = daysFromCivil(year, month, day);
  return days * 86400000 + hour * 3600000 + min * 60000 + sec * 1000 + milli;
}

// Convert epoch ms to strict ISO UTC string
export function epochMsToIsoUtc(ms: number): IsoUtcString {
  if (!Number.isFinite(ms) || ms < 0) throw new Error(`Invalid epoch ms: ${ms}`);
  const days = Math.floor(ms / 86400000);
  let rem = ms % 86400000;
  const { year, month, day } = civilFromDays(days);
  const hour = Math.floor(rem / 3600000);
  rem %= 3600000;
  const min = Math.floor(rem / 60000);
  rem %= 60000;
  const sec = Math.floor(rem / 1000);
  rem %= 1000;
  const milli = rem;
  // Pad to fixed width
  const pad = (n: number, w: number) => n.toString().padStart(w, '0');
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
