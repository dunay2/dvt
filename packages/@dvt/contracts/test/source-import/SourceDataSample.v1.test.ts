import { describe, expect, it } from 'vitest';

import {
  SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
  SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
  SOURCE_DATA_SAMPLE_MAX_LIMIT,
  SourceDataSampleRequestSchema,
  SourceDataSampleResponseSchema,
} from '../../src/contracts/source-import/SourceDataSample.v1.js';

const provenance = {
  mode: 'live',
  sourceRefs: [
    {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgresql-local',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/dvt/public/orders',
    },
  ],
  queriedAt: '2026-08-17T10:00:00.000Z',
  limit: 20,
  navigation: 'bounded-first-page',
} as const;

describe('SourceDataSample v1', () => {
  it('accepts a bounded display-safe relational sample', () => {
    const request = SourceDataSampleRequestSchema.parse({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      expectedPublicationToken: 'a'.repeat(64),
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
      provenance,
    });

    expect(request.limit).toBe(SOURCE_DATA_SAMPLE_DEFAULT_LIMIT);
    expect(request.expectedPublicationToken).toBe('a'.repeat(64));
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
    expect(() =>
      SourceDataSampleRequestSchema.parse({
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        expectedPublicationToken: 'not-a-sha256',
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
        provenance,
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
        provenance,
        credentialRef: 'postgres:local-postgres-proof',
      })
    ).toThrow();
  });

  it('retains authoritative LIVE facts for an empty result', () => {
    const response = SourceDataSampleResponseSchema.parse({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      columns: [],
      rows: [],
      limit: 20,
      truncated: false,
      provenance,
    });
    expect(response).toHaveProperty('provenance', provenance);
    expect(response).not.toHaveProperty('sampledAt');
  });

  it.each([
    { provenance: undefined },
    { provenance: undefined, sampledAt: provenance.queriedAt },
    { sampledAt: provenance.queriedAt },
    { provenance: { ...provenance, mode: 'local' } },
    { provenance: { ...provenance, queriedAt: 'yesterday' } },
    { provenance: { ...provenance, limit: 10 } },
    { provenance: { ...provenance, sourceRefs: [] } },
    {
      provenance: {
        ...provenance,
        sourceRefs: [...provenance.sourceRefs, ...provenance.sourceRefs],
      },
    },
    { connectionId: 'another-connection' },
    { objectId: 'relation/dvt/private/orders' },
  ])('rejects legacy or inconsistent provenance %#', (override) => {
    expect(
      SourceDataSampleResponseSchema.safeParse({
        contractVersion: 1,
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        columns: [],
        rows: [],
        limit: 20,
        truncated: false,
        provenance,
        ...override,
      }).success
    ).toBe(false);
  });
});
