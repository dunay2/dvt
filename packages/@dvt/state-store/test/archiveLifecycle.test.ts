import { describe, expect, it } from 'vitest';

import {
  buildArchiveUnitKey,
  calculateDeleteAfterIso,
  deriveTenantBucket,
  parseArchiveUnitKey,
} from '../src/archiveLifecycle.js';

describe('archiveLifecycle', () => {
  it('derives a deterministic tenant bucket using crc32 modulo bucket count', () => {
    const first = deriveTenantBucket('tenant-a', 32);
    const second = deriveTenantBucket('tenant-a', 32);
    const third = deriveTenantBucket('tenant-b', 32);

    expect(first).toBe(second);
    expect(first).toMatch(/^tb\d{2}$/);
    expect(third).toMatch(/^tb\d{2}$/);
    expect(third).not.toBe(first);
  });

  it('rejects invalid tenant bucket inputs', () => {
    expect(() => deriveTenantBucket('', 32)).toThrow(/TENANT_ID_REQUIRED/);
    expect(() => deriveTenantBucket('tenant-a', 0)).toThrow(/ARCHIVE_BUCKET_COUNT_INVALID/);
  });

  it('builds an archive unit key from bucket and persisted-at day', () => {
    expect(
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: '2026_03_19',
      })
    ).toBe('tb07_2026_03_19');

    expect(
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: '2026-03-19',
      })
    ).toBe('tb07_2026_03_19');

    expect(
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: new Date('2026-03-19T00:00:00.000Z'),
      })
    ).toBe('tb07_2026_03_19');

    expect(
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: '2026-03-19T23:30:00-02:00',
      })
    ).toBe('tb07_2026_03_20');
  });

  it('parses a canonical archive unit key', () => {
    expect(parseArchiveUnitKey('tb07_2026_03_19')).toEqual({
      tenantBucket: 'tb07',
      persistedAtDay: '2026_03_19',
    });
  });

  it('rejects malformed archive unit key parts', () => {
    expect(() =>
      buildArchiveUnitKey({
        tenantBucket: 'tenant-07',
        persistedAtDay: '2026_03_19',
      })
    ).toThrow(/ARCHIVE_TENANT_BUCKET_INVALID/);

    expect(() =>
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: '2026/03/19',
      })
    ).toThrow(/ARCHIVE_PERSISTED_AT_DAY_INVALID/);

    expect(() =>
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: new Date('invalid'),
      })
    ).toThrow(/ARCHIVE_PERSISTED_AT_DAY_INVALID/);

    expect(() =>
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: '2026-13-19',
      })
    ).toThrow(/ARCHIVE_PERSISTED_AT_DAY_INVALID/);

    expect(() =>
      buildArchiveUnitKey({
        tenantBucket: 'tb07',
        persistedAtDay: '2026-03-19Tnot-a-timestamp',
      })
    ).toThrow(/ARCHIVE_PERSISTED_AT_DAY_INVALID/);

    expect(() => parseArchiveUnitKey('tb07-2026-03-19')).toThrow(/ARCHIVE_UNIT_KEY_INVALID/);
  });

  it('calculates delete-after from verified-at and grace days', () => {
    expect(
      calculateDeleteAfterIso({
        verifiedAtIso: '2026-03-19T12:00:00.000Z',
        deletionGraceDays: 7,
      })
    ).toBe('2026-03-26T12:00:00.000Z');
  });

  it('rejects invalid delete-after inputs', () => {
    expect(() =>
      calculateDeleteAfterIso({
        verifiedAtIso: 'not-an-iso',
        deletionGraceDays: 7,
      })
    ).toThrow(/ARCHIVE_VERIFIED_AT_INVALID/);

    expect(() =>
      calculateDeleteAfterIso({
        verifiedAtIso: '2026-03-19T12:00:00.000Z',
        deletionGraceDays: -1,
      })
    ).toThrow(/ARCHIVE_DELETION_GRACE_DAYS_INVALID/);

    expect(() =>
      calculateDeleteAfterIso({
        verifiedAtIso: '2026-03-19T12:00:00.000Z',
        deletionGraceDays: 0.5,
      })
    ).toThrow(/ARCHIVE_DELETION_GRACE_DAYS_INVALID/);
  });
});
