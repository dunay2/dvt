/** Protect Model SQL query bodies with the existing environment-scoped authorization rail. */
import type { ModelSqlCompilationRequest } from '@dvt/contracts';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  type IAccessDecisionService,
} from '../../../src/application/ports/accessDecision.js';
import type { ICanvasTransformDataSampleProbe } from '../../../src/application/ports/canvasTransformDataSample.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { CompileCanvasModelSqlQuery } from '../../../src/application/services/compileCanvasModelSqlQuery.js';
import { PrepareCanvasSqlDraftProjection } from '../../../src/application/services/prepareCanvasSqlDraftProjection.js';
import { PreviewCanvasTransformRowsUseCase } from '../../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { registerCanvasModelSqlRoutes } from '../../../src/entrypoints/http/canvasModelSqlRoutes.js';
import {
  modelSqlHarness,
  sqlAuth,
  sqlTarget,
} from '../../application/services/canvasModelSql.fixtures.js';

const apps: FastifyInstance[] = [];
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});
const scope = 'tenantId=tenant&projectId=project&environmentId=dev';
const path = `/workspace/graph/canvases/${sqlTarget.canvasId}/transforms/${sqlTarget.transformNodeId}`;
async function harness(
  authenticated = true,
  allowed = true
): Promise<
  ReturnType<typeof modelSqlHarness> & {
    app: FastifyInstance;
    decide: Mock<IAccessDecisionService['decide']>;
    probe: { previewTransformRows: Mock<ICanvasTransformDataSampleProbe['previewTransformRows']> };
    payload: ModelSqlCompilationRequest;
  }
> {
  const h = modelSqlHarness();
  const context = await h.query.execute(sqlTarget, sqlAuth);
  const compilation = new CompileCanvasModelSqlQuery(h.query);
  const probe = {
    previewTransformRows: vi.fn(async () => ({
      columns: [{ name: 'country', type: 'text', nullable: true }],
      rows: [{ values: ['ES'] }],
      truncated: false,
      queriedAt: '2026-11-17T00:00:00.000Z',
      navigation: 'bounded-first-page' as const,
    })),
  };
  const rows = new PreviewCanvasTransformRowsUseCase({
    projection: h.projection,
    sqlDraftProjection: new PrepareCanvasSqlDraftProjection(compilation),
    probe,
    connectionCatalog: {
      getConnection: vi.fn(async () => ({
        id: 'test',
        name: 'test',
        type: 'postgres' as const,
        database: 'test',
        credentialRef: 'test',
        sourceObjects: [],
      })),
    },
  });
  const decide = vi.fn<IAccessDecisionService['decide']>(async (_principal, requested) =>
    allowed
      ? { ok: true as const, approvedScope: requested }
      : { ok: false as const, reason: 'ENVIRONMENT_NOT_GRANTED' as const }
  );
  const authorizer = new AuthorizeCommandScopeService(
    { decide, decideMany: async () => [] },
    { record: vi.fn() },
    () => new Date('2026-11-17')
  );
  const app = Fastify({ logger: false });
  apps.push(app);
  registerCanvasModelSqlRoutes(app, {
    authenticator: {
      authenticateBearerToken: async () =>
        authenticated
          ? { ok: true, principal: sqlAuth.principal }
          : { ok: false, code: 'MISSING_TOKEN' },
    },
    authorizer,
    context: h.query,
    compilation,
    rows,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return {
    ...h,
    app,
    decide,
    probe,
    payload: {
      ...sqlTarget,
      draftRevision: context.draftRevision,
      contextSha256: context.contextSha256,
      sql: 'SELECT country FROM client',
    },
  };
}
describe('Model SQL HTTP queries', () => {
  it.each([
    [false, true, 401],
    [true, false, 403],
  ] as const)(
    'refuses access before compilation or rows',
    async (authenticated, allowed, status) => {
      const h = await harness(authenticated, allowed);
      h.store.read.mockClear();
      const result = await h.app.inject({
        method: 'POST',
        url: `${path}/sql-compilation?${scope}`,
        payload: h.payload,
      });
      expect(result.statusCode).toBe(status);
      expect(h.store.read).not.toHaveBeenCalled();
      expect(h.probe.previewTransformRows).not.toHaveBeenCalled();
    }
  );
  it('returns context, diagnostics and rows through their declared adapters', async () => {
    const h = await harness();
    expect(
      (await h.app.inject({ method: 'GET', url: `${path}/sql-context?${scope}` })).statusCode
    ).toBe(200);
    const compiled = await h.app.inject({
      method: 'POST',
      url: `${path}/sql-compilation?${scope}`,
      payload: h.payload,
    });
    expect(compiled.json()).toMatchObject({ status: 'valid' });
    const result = await h.app.inject({
      method: 'POST',
      url: `${path}/data-sample?${scope}`,
      payload: {
        ...h.payload,
        schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
        limit: 20,
      },
    });
    expect(result.statusCode).toBe(200);
    expect(result.json().sample.rows).toEqual([{ values: ['ES'] }]);
    expect(
      h.decide.mock.calls.every(
        (call) => call[1].action === AUTHORIZATION_ACTION.workspaceGraphDraftView
      )
    ).toBe(true);
  });
  it('rejects SQL in query strings and body/path identity mismatch', async () => {
    const h = await harness();
    expect(
      (await h.app.inject({ method: 'GET', url: `${path}/sql-context?${scope}&sql=SELECT+1` }))
        .statusCode
    ).toBe(400);
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url: `${path}/sql-compilation?${scope}`,
          payload: { ...h.payload, transformNodeId: 'other' },
        })
      ).statusCode
    ).toBe(400);
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url: `${path}/data-sample?${scope}`,
          payload: {
            ...h.payload,
            schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
            limit: 51,
          },
        })
      ).statusCode
    ).toBe(400);
    expect(h.probe.previewTransformRows).not.toHaveBeenCalled();
  });
  it('returns a conflict for an obsolete context without executing a probe', async () => {
    const h = await harness();
    h.record.revision = 'r2';
    const result = await h.app.inject({
      method: 'POST',
      url: `${path}/sql-compilation?${scope}`,
      payload: h.payload,
    });
    expect(result.statusCode).toBe(409);
    expect(result.json().error.reason).toBe('stale_context');
    expect(h.probe.previewTransformRows).not.toHaveBeenCalled();
  });
});
