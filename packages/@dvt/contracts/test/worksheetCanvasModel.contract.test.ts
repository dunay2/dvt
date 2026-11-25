import { describe, expect, it } from 'vitest';

import {
  WorksheetCanvasModelRequestSchema,
  WorksheetCanvasModelProposalSchema,
} from '../src/contracts/canvas/WorksheetCanvasModel.v1.js';

const request = {
  schemaVersion: 'worksheet-canvas-model-request.v1',
  canvasId: 'canvas-orders',
  expectedRevision: 'revision-1',
  modelId: 'model-totals',
  name: 'Order totals',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-1',
    provider: 'postgres',
  },
  sql: 'SELECT id FROM raw.orders',
  models: [],
};

describe('Worksheet Canvas Model proposal contract', () => {
  it('admits a bounded explicit proposal request with no draft or write identity', () => {
    expect(WorksheetCanvasModelRequestSchema.parse(request)).toEqual(request);
    expect(WorksheetCanvasModelRequestSchema.safeParse({ ...request, draft: {} }).success).toBe(
      false
    );
    expect(
      WorksheetCanvasModelRequestSchema.safeParse({ ...request, idempotencyKey: 'write' }).success
    ).toBe(false);
  });
  it.each([
    { expectedRevision: '' },
    { modelId: '' },
    { name: ' ' },
    { sql: ' '.repeat(65537) },
    { models: [{ canvasId: 'c', nodeId: 'n', alias: 'm', semanticPlanSha256: 'unknown' }] },
  ])('rejects incomplete, unbounded or unverified identities: %j', (change) => {
    expect(WorksheetCanvasModelRequestSchema.safeParse({ ...request, ...change }).success).toBe(
      false
    );
  });
  it('does not admit an empty graph as a successful proposal', () => {
    expect(
      WorksheetCanvasModelProposalSchema.safeParse({ status: 'valid', draft: {} }).success
    ).toBe(false);
  });
  it('keeps current-context verification distinct from a complete graph proposal', () => {
    expect(
      WorksheetCanvasModelRequestSchema.safeParse({
        ...request,
        verifyContextSha256: 'a'.repeat(64),
      }).success
    ).toBe(true);
    expect(
      WorksheetCanvasModelRequestSchema.safeParse({ ...request, verifyContextSha256: 'unknown' })
        .success
    ).toBe(false);
    const current = {
      schemaVersion: 'worksheet-canvas-model-proposal.v1',
      canvasId: request.canvasId,
      expectedRevision: request.expectedRevision,
      modelId: request.modelId,
      name: request.name,
      connectionRef: request.connectionRef,
      scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
      sqlSha256: 'b'.repeat(64),
      contextSha256: 'a'.repeat(64),
      status: 'current',
    };
    expect(WorksheetCanvasModelProposalSchema.safeParse(current).success).toBe(true);
    expect(WorksheetCanvasModelProposalSchema.safeParse({ ...current, draft: {} }).success).toBe(
      false
    );
  });
});
