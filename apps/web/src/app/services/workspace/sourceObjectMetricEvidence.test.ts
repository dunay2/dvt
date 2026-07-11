import { describe, expect, it } from 'vitest';

import { readSourceObjectMetricEvidence } from './sourceObjectMetricEvidence';

describe('readSourceObjectMetricEvidence', () => {
  it('accepts a complete provider-neutral evidence pair', () => {
    expect(
      readSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: {
          value: 3,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
        byteSize: {
          value: 4096,
          provenance: 'estimated',
          method: 'schema-width',
          confidence: 'low',
          basis: 'logical-payload',
        },
      })
    ).toEqual({
      observedAt: '2026-07-10T21:00:00.000Z',
      observationScope: { kind: 'snapshot' },
      rowCount: {
        value: 3,
        provenance: 'estimated',
        method: 'provider-statistics',
        confidence: 'medium',
      },
      byteSize: {
        value: 4096,
        provenance: 'estimated',
        method: 'schema-width',
        confidence: 'low',
        basis: 'logical-payload',
      },
    });
  });

  it('rejects incomplete and unsafe evidence', () => {
    expect(
      readSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: {
          value: 3,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
      })
    ).toBeNull();
    expect(
      readSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: {
          value: -1,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
        byteSize: {
          value: 4096,
          provenance: 'estimated',
          method: 'schema-width',
          confidence: 'low',
          basis: 'logical-payload',
        },
      })
    ).toBeNull();
  });

  it('rejects evidence whose provenance contradicts its method', () => {
    expect(
      readSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: {
          value: 3,
          provenance: 'measured',
          method: 'provider-statistics',
          confidence: 'exact',
        },
        byteSize: {
          value: 4096,
          provenance: 'measured',
          method: 'provider-storage-metadata',
          confidence: 'exact',
          basis: 'physical-allocation',
        },
      })
    ).toBeNull();
  });

  it('rejects evidence without timestamp or byte-size basis', () => {
    expect(
      readSourceObjectMetricEvidence({
        rowCount: {
          value: 3,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
        byteSize: {
          value: 4096,
          provenance: 'estimated',
          method: 'schema-width',
          confidence: 'low',
        },
      })
    ).toBeNull();
    expect(
      readSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        observationScope: { kind: 'snapshot' },
        rowCount: {
          value: 3,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
        byteSize: {
          value: 4096,
          provenance: 'estimated',
          method: 'schema-width',
          confidence: 'low',
        },
      })
    ).toBeNull();
  });
});
