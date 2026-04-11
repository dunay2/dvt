import type { IsoUtcString, NonBlankString, Sha256HexString, StepId } from '../types/contracts.js';

export const NON_BLANK_STRING_MESSAGE = 'String must contain at least one non-whitespace character';
export const STRICT_ISO_UTC_STRING_MESSAGE =
  'String must be a strict ISO UTC timestamp (YYYY-MM-DDTHH:mm:ss.mmmZ)';
export const SHA256_HEX_STRING_MESSAGE =
  'String must be a 64-character lowercase hex SHA-256 value';

const ISO_UTC_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isNonBlankString(value: string): value is NonBlankString {
  return value.trim().length > 0;
}

export function asNonBlankString(value: string): NonBlankString {
  if (!isNonBlankString(value)) {
    throw new Error(NON_BLANK_STRING_MESSAGE);
  }
  return value as NonBlankString;
}

export function asStepId(value: string): StepId {
  return asNonBlankString(value) as StepId;
}

export function isSha256HexString(value: string): value is Sha256HexString {
  return isNonBlankString(value) && SHA256_HEX_REGEX.test(value);
}

export function asSha256HexString(value: string): Sha256HexString {
  if (!isSha256HexString(value)) {
    throw new Error(SHA256_HEX_STRING_MESSAGE);
  }
  return value as Sha256HexString;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1]!;
}

function parseIsoParts(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  min: number;
  sec: number;
  milli: number;
} | null {
  const match = ISO_UTC_REGEX.exec(value);
  if (!match) return null;

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

export function isIsoUtcString(value: string): value is IsoUtcString {
  if (!isNonBlankString(value)) {
    return false;
  }

  const parts = parseIsoParts(value);
  if (parts === null) {
    return false;
  }

  return (
    parts.month >= 1 &&
    parts.month <= 12 &&
    parts.day >= 1 &&
    parts.day <= daysInMonth(parts.year, parts.month) &&
    parts.hour >= 0 &&
    parts.hour <= 23 &&
    parts.min >= 0 &&
    parts.min <= 59 &&
    parts.sec >= 0 &&
    parts.sec <= 59 &&
    parts.milli >= 0 &&
    parts.milli <= 999
  );
}

export function asIsoUtcString(value: string): IsoUtcString {
  if (!isIsoUtcString(value)) {
    throw new Error(STRICT_ISO_UTC_STRING_MESSAGE);
  }
  return value as IsoUtcString;
}

function pad(value: number, width: number): string {
  return value.toString().padStart(width, '0');
}

function daysFromCivil(year: number, month: number, day: number): number {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(days: number): { year: number; month: number; day: number } {
  const shiftedDays = days + 719468;
  const era = Math.floor(shiftedDays / 146097);
  const dayOfEra = shiftedDays - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365
  );
  let year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPivot = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPivot + 2) / 5) + 1;
  const month = monthPivot < 10 ? monthPivot + 3 : monthPivot - 9;
  year += month <= 2 ? 1 : 0;
  return { year, month, day };
}

export function parseIsoUtcToEpochMs(iso: IsoUtcString): number {
  const parts = parseIsoParts(iso);
  if (parts === null || !isIsoUtcString(iso)) {
    throw new Error(`Invalid ISO UTC format: ${iso}`);
  }

  const days = daysFromCivil(parts.year, parts.month, parts.day);
  return (
    days * MS_PER_DAY +
    parts.hour * MS_PER_HOUR +
    parts.min * MS_PER_MINUTE +
    parts.sec * MS_PER_SECOND +
    parts.milli
  );
}

export function epochMsToIsoUtc(ms: number): IsoUtcString {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error(`Invalid epoch ms: ${ms}`);
  }

  const days = Math.floor(ms / MS_PER_DAY);
  let remainder = ms % MS_PER_DAY;
  const { year, month, day } = civilFromDays(days);
  const hour = Math.floor(remainder / MS_PER_HOUR);
  remainder %= MS_PER_HOUR;
  const min = Math.floor(remainder / MS_PER_MINUTE);
  remainder %= MS_PER_MINUTE;
  const sec = Math.floor(remainder / MS_PER_SECOND);
  remainder %= MS_PER_SECOND;
  const milli = remainder;

  return asIsoUtcString(
    `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T${pad(hour, 2)}:${pad(min, 2)}:${pad(sec, 2)}.${pad(milli, 3)}Z`
  );
}
