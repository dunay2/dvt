import { describe, expect, it } from 'vitest';

import {
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TRANSFORM_DATA_SAMPLE_MAX_LIMIT,
  TransformDataSampleRequestSchema,
  TransformDataSampleResponseSchema,
} from '../../src/contracts/canvas/TransformDataSample.v1.js';

describe('TransformDataSample v1', () => {
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
      sampledAt: '2026-09-15T10:00:00.000Z',
    });

    expect(request.limit).toBe(TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT);
    expect(response.rows).toEqual([{ values: ['1'] }]);
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
        sampledAt: '2026-09-15T10:00:00.000Z',
      })
    ).toThrow(/row values must match/i);
  });
});
