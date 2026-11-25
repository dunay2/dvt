import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registerWorksheetCanvasModelRoutes } from '../../../src/entrypoints/http/worksheetCanvasModelRoutes.js';
import {
  worksheetCanvasHarness,
  type WorksheetCanvasHarness,
} from '../../application/services/worksheetCanvasModel.fixtures.js';

const apps: FastifyInstance[] = [];
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});
async function fixture(
  authenticated = true
): Promise<WorksheetCanvasHarness & { app: FastifyInstance; url: string }> {
  const h = worksheetCanvasHarness(),
    app = Fastify({ logger: false });
  apps.push(app);
  registerWorksheetCanvasModelRoutes(app, {
    query: h.query,
    authorizer: h.authorizer,
    authenticator: {
      authenticateBearerToken: async () =>
        authenticated
          ? { ok: true, principal: h.context.principal }
          : { ok: false, code: 'MISSING_TOKEN' },
    },
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return {
    ...h,
    app,
    url: '/workspace/graph/canvases/canvas-sql/sql-model-proposal?tenantId=tenant&projectId=project&environmentId=dev',
  };
}

describe('worksheet Canvas proposal HTTP boundary', () => {
  it('returns a complete proposal through the real query and performs no write', async () => {
    const h = await fixture();
    const response = await h.app.inject({ method: 'POST', url: h.url, payload: h.input });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'valid',
      expectedRevision: 'r1',
      modelId: 'model-orders',
      columns: [{ name: 'order_id' }],
    });
    expect(h.draft.nodes).toEqual([]);
  });
  it('rejects unauthenticated callers before query IO', async () => {
    const h = await fixture(false);
    expect((await h.app.inject({ method: 'POST', url: h.url, payload: h.input })).statusCode).toBe(
      401
    );
    expect(h.read).not.toHaveBeenCalled();
  });
  it.each([
    { canvasId: 'foreign' },
    { idempotencyKey: 'parallel-write' },
    { models: [{ nodeId: 'unknown' }] },
  ])('rejects malformed or contradictory request identity: %j', async (change) => {
    const h = await fixture();
    expect(
      (await h.app.inject({ method: 'POST', url: h.url, payload: { ...h.input, ...change } }))
        .statusCode
    ).toBe(400);
    expect(h.read).not.toHaveBeenCalled();
  });
  it('keeps stale proposal and invalid SQL responses explicit', async () => {
    const h = await fixture();
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url: h.url,
          payload: { ...h.input, expectedRevision: 'old' },
        })
      ).statusCode
    ).toBe(409);
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url: h.url,
          payload: { ...h.input, sql: 'DELETE FROM raw.orders' },
        })
      ).statusCode
    ).toBe(422);
  });
});
