import { describe, expect, it } from 'vitest';

import {
  SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
  SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
  SOURCE_DATA_SAMPLE_MAX_LIMIT,
  SourceDataSampleRequestSchema,
  SourceDataSampleResponseSchema,
} from '../../src/contracts/source-import/SourceDataSample.v1.js';

describe('SourceDataSample v1', () => {
  it('accepts a bounded display-safe relational sample', () => {
    const request = SourceDataSampleRequestSchema.parse({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
    });
    const response = SourceDataSampleResponseSchema.parse({
      contractVersion: SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
      connectionId: request.connectionId,
      objectId: request.objectId,
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', 'Ada'] }, { values: ['2', null] }],
      limit: request.limit,
      truncated: false,
      sampledAt: '2026-08-17T10:00:00.000Z',
    });

    expect(request.limit).toBe(SOURCE_DATA_SAMPLE_DEFAULT_LIMIT);
    expect(response.rows).toHaveLength(2);
  });

  it('rejects limits outside the governed bound and unknown request fields', () => {
    expect(() =>
      SourceDataSampleRequestSchema.parse({
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        limit: SOURCE_DATA_SAMPLE_MAX_LIMIT + 1,
      })
    ).toThrow();
    expect(() =>
      SourceDataSampleRequestSchema.parse({
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        sql: 'select * from orders',
      })
    ).toThrow();
  });

  it('rejects rows whose values do not match the projected columns', () => {
    expect(() =>
      SourceDataSampleResponseSchema.parse({
        contractVersion: SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        rows: [{ values: ['1', 'unexpected'] }],
        limit: SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
        truncated: false,
        sampledAt: '2026-08-17T10:00:00.000Z',
      })
    ).toThrow(/row values must match/i);
  });

  it('rejects non-display-safe cell values and credential-shaped response fields', () => {
    expect(() =>
      SourceDataSampleResponseSchema.parse({
        contractVersion: SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        rows: [{ values: [{ nested: 'value' }] }],
        limit: SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
        truncated: false,
        sampledAt: '2026-08-17T10:00:00.000Z',
        credentialRef: 'postgres:local-postgres-proof',
      })
    ).toThrow();
  });
});
