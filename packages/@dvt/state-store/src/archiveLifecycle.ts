export type ArchiveUnitState =
  | 'LIVE'
  | 'ELIGIBLE'
  | 'EXPORTED'
  | 'VERIFY_FAILED'
  | 'VERIFIED'
  | 'DELETE_ELIGIBLE'
  | 'DROPPED_FROM_HOT';

export interface ArchiveUnitKeyParts {
  readonly tenantBucket: string;
  readonly persistedAtDay: string | Date;
}

export interface ArchiveDeleteEligibilityInput {
  readonly verifiedAtIso: string;
  readonly deletionGraceDays: number;
}

export interface ParsedArchiveUnitKey {
  readonly tenantBucket: string;
  readonly persistedAtDay: string;
}

const CRC32_TABLE = buildCrc32Table();

export function deriveTenantBucket(tenantId: string, archiveBucketCount: number): string {
  if (!tenantId.trim()) {
    throw new Error('TENANT_ID_REQUIRED');
  }
  if (!Number.isInteger(archiveBucketCount) || archiveBucketCount <= 0) {
    throw new Error('ARCHIVE_BUCKET_COUNT_INVALID');
  }

  const bucketIndex = crc32(tenantId) % archiveBucketCount;
  return `tb${bucketIndex.toString().padStart(2, '0')}`;
}

export function buildArchiveUnitKey(parts: ArchiveUnitKeyParts): string {
  const tenantBucket = parts.tenantBucket.trim();
  const persistedAtDay = normalizePersistedAtDay(parts.persistedAtDay);

  if (!/^tb\d{2,}$/.test(tenantBucket)) {
    throw new Error('ARCHIVE_TENANT_BUCKET_INVALID');
  }

  return `${tenantBucket}_${persistedAtDay}`;
}

export function parseArchiveUnitKey(archiveUnitKey: string): ParsedArchiveUnitKey {
  const trimmed = archiveUnitKey.trim();
  const match = /^(tb\d{2,})_(\d{4}_\d{2}_\d{2})$/.exec(trimmed);

  if (!match) {
    throw new Error('ARCHIVE_UNIT_KEY_INVALID');
  }

  const [, tenantBucket, persistedAtDay] = match;
  if (!tenantBucket || !persistedAtDay) {
    throw new Error('ARCHIVE_UNIT_KEY_INVALID');
  }

  return {
    tenantBucket,
    persistedAtDay: validateCalendarDay(persistedAtDay, persistedAtDay.replaceAll('_', '-')),
  };
}

export function calculateDeleteAfterIso(input: ArchiveDeleteEligibilityInput): string {
  if (!Number.isInteger(input.deletionGraceDays) || input.deletionGraceDays < 0) {
    throw new Error('ARCHIVE_DELETION_GRACE_DAYS_INVALID');
  }

  const verifiedAt = new Date(input.verifiedAtIso);
  if (Number.isNaN(verifiedAt.getTime())) {
    throw new Error('ARCHIVE_VERIFIED_AT_INVALID');
  }

  const deleteAfterMs = verifiedAt.getTime() + input.deletionGraceDays * 24 * 60 * 60 * 1000;
  return new Date(deleteAfterMs).toISOString();
}

function crc32(input: string): number {
  let crc = 0xffffffff;
  for (let index = 0; index < input.length; index += 1) {
    const byte = input.charCodeAt(index) & 0xff;
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function normalizePersistedAtDay(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('ARCHIVE_PERSISTED_AT_DAY_INVALID');
    }
    return value.toISOString().slice(0, 10).replaceAll('-', '_');
  }

  const trimmed = value.trim();
  if (/^\d{4}_\d{2}_\d{2}$/.test(trimmed)) {
    return validateCalendarDay(trimmed, trimmed.replaceAll('_', '-'));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return validateCalendarDay(trimmed.replaceAll('-', '_'), trimmed);
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('ARCHIVE_PERSISTED_AT_DAY_INVALID');
    }
    return parsed.toISOString().slice(0, 10).replaceAll('-', '_');
  }

  throw new Error('ARCHIVE_PERSISTED_AT_DAY_INVALID');
}

function validateCalendarDay(normalizedDay: string, isoDay: string): string {
  const parsed = new Date(`${isoDay}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== isoDay) {
    throw new Error('ARCHIVE_PERSISTED_AT_DAY_INVALID');
  }
  return normalizedDay;
}

function buildCrc32Table(): readonly number[] {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table.push(value >>> 0);
  }
  return table;
}
