import { describe, expect, it } from 'vitest';

import {
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TRANSFORM_DATA_SAMPLE_MAX_LIMIT,
  TransformDataSampleRequestSchema,
  TransformDataSampleResponseSchema,
} from '../../src/contracts/canvas/TransformDataSample.v1.js';

const provenance = {
  mode: 'live',
  sourceRefs: [
    {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/dvt/raw/orders',
    },
  ],
  queriedAt: '2026-09-15T10:00:00.000Z',
  limit: 20,
  navigation: 'bounded-first-page',
};

describe('TransformDataSample v1', () => {
  it('requires a pinned semantic revision when selecting an intermediate relation', () => {
    const input = {
      canvasId: 'canvas-orders',
      transformNodeId: 'transform-orders',
      relationId: 'join-1',
    };
    expect(TransformDataSampleRequestSchema.safeParse(input).success).toBe(false);
    expect(
      TransformDataSampleRequestSchema.parse({ ...input, semanticPlanSha256: 'a'.repeat(64) })
    ).toMatchObject({ relationId: 'join-1', semanticPlanSha256: 'a'.repeat(64) });
    expect(
      TransformDataSampleRequestSchema.safeParse({ ...input, semanticPlanSha256: 'stale' }).success
    ).toBe(false);
  });

  it('accepts a bounded sample tied to an exact protected draft and semantic plan', () => {
    const request = TransformDataSampleRequestSchema.parse({
      canvasId: 'canvas-orders',
      transformNodeId: 'transform-orders',
    });
    const response = TransformDataSampleResponseSchema.parse({
      contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
      canvasId: request.canvasId,
      transformNodeId: request.transformNodeId,
      draftRevision: 'revision-7',
      semanticPlanSha256: 'a'.repeat(64),
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: request.limit,
      truncated: false,
      provenance,
    });

    expect(request.limit).toBe(TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT);
    expect(response.rows).toEqual([{ values: ['1'] }]);
    expect(response.provenance).toEqual(provenance);
    expect(response).not.toHaveProperty('sampledAt');
  });

  it.each([
    { provenance: undefined, sampledAt: provenance.queriedAt },
    { sampledAt: provenance.queriedAt },
    { provenance: { ...provenance, mode: 'local' } },
    { provenance: { ...provenance, sourceRefs: [] } },
    { provenance: { ...provenance, limit: 21 } },
    { provenance: { ...provenance, queriedAt: 'not-a-time' } },
  ])('rejects ambiguous or incompatible LIVE facts: %j', (invalid) => {
    expect(
      TransformDataSampleResponseSchema.safeParse({
        contractVersion: 1,
        canvasId: 'canvas',
        transformNodeId: 'model',
        draftRevision: 'revision',
        semanticPlanSha256: 'a'.repeat(64),
        columns: [],
        rows: [],
        limit: 20,
        truncated: false,
        provenance,
        ...invalid,
      }).success
    ).toBe(false);
  });

  it('rejects client SQL, connection details, and limits outside the governed bound', () => {
    expect(() =>
      TransformDataSampleRequestSchema.parse({
        canvasId: 'canvas-orders',
        transformNodeId: 'transform-orders',
        sql: 'select * from orders',
      })
    ).toThrow();
    expect(() =>
      TransformDataSampleRequestSchema.parse({
        canvasId: 'canvas-orders',
        transformNodeId: 'transform-orders',
        connectionId: 'warehouse-main',
      })
    ).toThrow();
    expect(() =>
      TransformDataSampleRequestSchema.parse({
        canvasId: 'canvas-orders',
        transformNodeId: 'transform-orders',
        limit: TRANSFORM_DATA_SAMPLE_MAX_LIMIT + 1,
      })
    ).toThrow();
  });

  it('rejects rows that do not match the projected columns', () => {
    expect(() =>
      TransformDataSampleResponseSchema.parse({
        contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
        canvasId: 'canvas-orders',
        transformNodeId: 'transform-orders',
        draftRevision: 'revision-7',
        semanticPlanSha256: 'a'.repeat(64),
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        rows: [{ values: ['1', 'unexpected'] }],
        limit: TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
        truncated: false,
        provenance,
      })
    ).toThrow(/row values must match/i);
  });
});
