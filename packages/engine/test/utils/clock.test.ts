import type { IsoUtcString } from '@dvt/contracts';
import { describe, it, expect } from 'vitest';

import { SequenceClock, parseIsoUtcToEpochMs, epochMsToIsoUtc } from '../../src/utils/clock';

describe('SequenceClock', () => {
  it('returns increasing ISO UTC strings deterministically', () => {
    const clock = new SequenceClock('2024-02-29T23:59:59.999Z');
    const t0 = clock.nowIsoUtc();
    const t1 = clock.nowIsoUtc();
    const t2 = clock.nowIsoUtc();
    expect(t0).toBe('2024-02-29T23:59:59.999Z');
    expect(t1).toBe('2024-03-01T00:00:00.000Z');
    expect(t2).toBe('2024-03-01T00:00:00.001Z');
  });

  it('throws on invalid ISO string (bad format)', () => {
    expect(() => new SequenceClock('2024-02-29 23:59:59Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-02-30T00:00:00.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2023-02-29T00:00:00.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-13-01T00:00:00.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-00-01T00:00:00.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-01-01T24:00:00.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-01-01T00:60:00.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-01-01T00:00:60.000Z' as IsoUtcString)).toThrow();
    expect(() => new SequenceClock('2024-01-01T00:00:00.1000Z' as IsoUtcString)).toThrow();
  });

  it('validates leap years correctly', () => {
    expect(() => new SequenceClock('2024-02-29T00:00:00.000Z' as IsoUtcString)).not.toThrow();
    expect(() => new SequenceClock('2023-02-29T00:00:00.000Z' as IsoUtcString)).toThrow();
  });
});

describe('parseIsoUtcToEpochMs / epochMsToIsoUtc', () => {
  it('roundtrips ISO <-> epoch ms', () => {
    const iso: IsoUtcString = '2026-02-13T12:34:56.789Z';
    const ms = parseIsoUtcToEpochMs(iso);
    const iso2 = epochMsToIsoUtc(ms);
    expect(iso2).toBe(iso);
  });

  it('handles epoch 0', () => {
    expect(epochMsToIsoUtc(0)).toBe('1970-01-01T00:00:00.000Z');
  });
});
