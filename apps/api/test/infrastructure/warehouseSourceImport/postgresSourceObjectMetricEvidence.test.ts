import { describe, expect, it } from 'vitest';

import {
  buildPostgresSourceObjectMetricEvidence,
  estimatePostgresRowWidth,
} from '../../../src/infrastructure/warehouseSourceImport/postgresSourceObjectMetricEvidence.js';

describe('Postgres source object metric evidence', () => {
  it('keeps provider storage bytes measured', () => {
    expect(
      buildPostgresSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        rowCount: {
          value: 128,
          provenance: 'estimated',
          method: 'provider-statistics',
          confidence: 'medium',
        },
        byteSize: 4_096_000,
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      })
    ).toEqual({
      observedAt: '2026-07-10T21:00:00.000Z',
      observationScope: { kind: 'snapshot' },
      rowCount: {
        value: 128,
        provenance: 'estimated',
        method: 'provider-statistics',
        confidence: 'medium',
      },
      byteSize: {
        value: 4_096_000,
        provenance: 'measured',
        method: 'provider-storage-metadata',
        confidence: 'exact',
        basis: 'physical-allocation',
      },
    });
  });

  it('calculates low-confidence storage weight from Postgres row layout', () => {
    const columns = [
      { name: 'order_id', type: 'integer', nullable: false },
      { name: 'customer', type: 'text', nullable: true },
    ] as const;

    expect(estimatePostgresRowWidth(columns)).toBe(93);
    expect(
      buildPostgresSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        rowCount: {
          value: 128,
          provenance: 'estimated',
          method: 'query-plan',
          confidence: 'low',
        },
        byteSize: null,
        columns,
      })
    ).toEqual({
      observedAt: '2026-07-10T21:00:00.000Z',
      observationScope: { kind: 'snapshot' },
      rowCount: {
        value: 128,
        provenance: 'estimated',
        method: 'query-plan',
        confidence: 'low',
      },
      byteSize: {
        value: 11_904,
        provenance: 'estimated',
        method: 'schema-width',
        confidence: 'low',
        basis: 'provider-row-storage',
      },
    });
  });

  it('uses the tuple header as a conservative lower-bound when column metadata is unavailable', () => {
    expect(
      buildPostgresSourceObjectMetricEvidence({
        observedAt: '2026-07-10T21:00:00.000Z',
        rowCount: {
          value: 10,
          provenance: 'measured',
          method: 'data-scan',
          confidence: 'exact',
        },
        byteSize: null,
        columns: [],
      })
    ).toEqual({
      observedAt: '2026-07-10T21:00:00.000Z',
      observationScope: { kind: 'snapshot' },
      rowCount: {
        value: 10,
        provenance: 'measured',
        method: 'data-scan',
        confidence: 'exact',
      },
      byteSize: {
        value: 240,
        provenance: 'estimated',
        method: 'schema-width',
        confidence: 'low',
        basis: 'lower-bound',
      },
    });
  });
});
