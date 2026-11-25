/** Prove literal proposal, guarded confirmation, reload and native rows in an owned PostgreSQL lease. */
import { createRequire } from 'node:module';

import {
  TransformDataSampleRequestSchema,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphDraftSaveRequest,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { WorkspaceGraphDraftDecisionContext } from '../../src/application/ports/workspaceGraphDraft.js';
import { PreviewCanvasTransformRowsUseCase } from '../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { ProposeWorksheetCanvasModel } from '../../src/application/services/proposeWorksheetCanvasModel.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveCanvasModelSqlInputs } from '../../src/application/services/resolveCanvasModelSqlInputs.js';
import { ResolveCanvasModelSqlPhysicalInput } from '../../src/application/services/resolveCanvasModelSqlPhysicalInput.js';
import { ResolveCanvasTransformProjection } from '../../src/application/services/resolveCanvasTransformProjection.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { PostgresCanvasTransformDataSampleProbe } from '../../src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';
import { PostgresWorkspaceGraphDraftStore } from '../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import {
  worksheetCanvasHarness,
  type WorksheetCanvasHarness,
} from '../application/services/worksheetCanvasModel.fixtures.js';
import { buildWorkspaceGraphDraftSaveRequest } from '../fixtures/workspaceGraphDraftFixture.js';

import {
  buildSemanticSaveUseCase,
  buildSemanticGetUseCase,
  writableSemanticDecision,
} from './workspaceGraphDraftSemanticPersistence.support.js';

type Lease = Readonly<{ url: string; dispose(): Promise<void> }>;
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../scripts/disposable-postgres-database.cjs'
) as { allocateDisposablePostgresDatabase(url: string, label: string): Promise<Lease> };
const adminUrl = process.env['DVT_PG_URL'];

function literalDecision(h: WorksheetCanvasHarness): WorkspaceGraphDraftDecisionContext {
  const decision = writableSemanticDecision();
  const projectId = h.context.scope.projectId,
    environmentId = h.context.scope.environmentId;
  if (!projectId || !environmentId) throw new Error('Expected the explicit fixture scope.');
  return {
    ...decision,
    scope: h.record.scope,
    requestedScope: { tenantId: h.context.scope.tenantId, projectId, environmentId },
    principal: h.context.principal,
    capability: { ...decision.capability, scope: h.record.scope },
  };
}

function literalQuery(
  store: PostgresWorkspaceGraphDraftStore,
  h: WorksheetCanvasHarness
): ProposeWorksheetCanvasModel {
  const modelProducers = { resolve: async () => new Map() };
  const inputs = new ResolveCanvasModelSqlInputs({
    projection: h.projection,
    modelProducers,
    physical: new ResolveCanvasModelSqlPhysicalInput({
      catalog: h.catalog,
      authorizer: h.authorizer,
    }),
  });
  return new ProposeWorksheetCanvasModel({
    store,
    authorizer: h.authorizer,
    authorityPolicy: h.authorityPolicy,
    connectionCatalog: { getConnection: h.getConnection },
    catalog: h.catalog,
    projection: h.projection,
    modelProducers,
    inputs,
  });
}

async function saveLiteralDraft(
  store: PostgresWorkspaceGraphDraftStore,
  decision: WorkspaceGraphDraftDecisionContext,
  request: WorkspaceGraphDraftSaveRequest
): Promise<string> {
  const result = await buildSemanticSaveUseCase(store).execute({ decision, request });
  expect(result.httpStatus).toBe(200);
  if (result.response.kind !== 'saved') throw new Error('Expected a confirmed canonical save.');
  return result.response.revision;
}

async function assertNativeLiteralRows(
  store: PostgresWorkspaceGraphDraftStore,
  h: WorksheetCanvasHarness,
  draft: WorkspaceGraphAuthoringDraft,
  url: string
): Promise<void> {
  const connection = { ...(await h.getConnection()), credentialRef: 'postgres:literal-proof' };
  const rows = new PreviewCanvasTransformRowsUseCase({
    projection: new ResolveCanvasTransformProjection({
      graphDraftResolver: new ResolveAuthorizedExecutableSubgraphService({
        planner: new PlannerFacade(),
        workspaceGraphDraftStore: store,
      }),
    }),
    connectionCatalog: { getConnection: async () => connection },
    probe: new PostgresCanvasTransformDataSampleProbe({
      credentialResolver: { resolveCredential: async () => url },
      now: () => new Date('2026-11-25T00:00:00.000Z'),
    }),
  });
  const request = TransformDataSampleRequestSchema.parse({
    canvasId: draft.canvas.id,
    transformNodeId: h.input.modelId,
  });
  const sample = await rows.execute(request, h.context);
  expect(sample.columns.map((column) => column.name)).toEqual(['comprobacion_editor_sql']);
  expect(sample.rows).toEqual([{ values: ['1'] }]);
  expect(sample.provenance.sourceRefs).toEqual([]);
  expect(sample.provenance.literalModel?.connectionRef).toEqual(h.input.connectionRef);
  expect(sample.provenance.literalModel?.semanticPlanSha256).toBe(sample.semanticPlanSha256);
}

describe.skipIf(adminUrl === undefined)('literal worksheet Canvas native PostgreSQL', () => {
  let lease: Lease | undefined;
  let pool: Pool | undefined;
  let store: PostgresWorkspaceGraphDraftStore;

  beforeAll(async () => {
    if (!adminUrl) throw new Error('An explicit PostgreSQL admin endpoint is required.');
    lease = await allocateDisposablePostgresDatabase(adminUrl, 'literal_model_3951');
    pool = new Pool({ connectionString: lease.url });
    const config = { pool, schema: 'literal_proof' };
    store = new PostgresWorkspaceGraphDraftStore(config);
    await store.migrate();
    await new PostgresCanvasAuthoringAuthorityStore(config).migrate();
  });

  afterAll(async () => {
    try {
      await pool?.end();
    } finally {
      await lease?.dispose();
    }
  });

  it('prepares, confirms once, reopens and previews the exact literal with no physical input', async () => {
    if (!lease) throw new Error('Expected the isolated PostgreSQL database.');
    const h = worksheetCanvasHarness(),
      decision = literalDecision(h);
    const revision = await saveLiteralDraft(
      store,
      decision,
      buildWorkspaceGraphDraftSaveRequest({
        scope: decision.scope,
        draft: h.draft,
        expectedRevision: WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
        idempotencyKey: 'literal-empty',
      })
    );
    const query = literalQuery(store, h);
    const input = {
      ...h.input,
      expectedRevision: revision,
      sql: 'SELECT 1 AS comprobacion_editor_sql',
    };
    const proposal = await query.execute(input, h.context);
    if (proposal.status !== 'valid')
      throw new Error('Expected the complete canonical literal proposal.');
    const current = await query.execute(
      { ...input, verifyContextSha256: proposal.contextSha256 },
      h.context
    );
    expect(current.status).toBe('current');
    const request = buildWorkspaceGraphDraftSaveRequest({
      scope: decision.scope,
      expectedRevision: revision,
      draft: proposal.draft,
      idempotencyKey: 'literal-confirmation',
    });
    const savedRevision = await saveLiteralDraft(store, decision, request);
    expect(await saveLiteralDraft(store, decision, request)).toBe(savedRevision);
    const loaded = await buildSemanticGetUseCase(store).execute(decision);
    if (loaded.response.kind !== 'ok')
      throw new Error('Expected the actual persisted Model on reopen.');
    expect(loaded.response.record.draft.nodes).toEqual(proposal.draft.nodes);
    expect(loaded.response.record.draft.edges).toEqual([]);
    expect(h.catalog.execute).not.toHaveBeenCalled();
    await assertNativeLiteralRows(store, h, loaded.response.record.draft, lease.url);
  });
});
