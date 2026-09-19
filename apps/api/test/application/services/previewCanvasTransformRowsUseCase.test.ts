import {
  DvtTransformAuthoringAuthorityV1Schema,
  TransformDataSampleRequestSchema,
  type TransformDataSampleRequest,
  type WarehouseConnection,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import type { ICanvasTransformDataSampleProbe } from '../../../src/application/ports/canvasTransformDataSample.js';
import { CanvasTransformDataSampleUnavailableError } from '../../../src/application/ports/canvasTransformDataSample.js';
import type {
  IWarehouseConnectionCatalog,
  WarehouseConnectionCatalogEntry,
} from '../../../src/application/ports/warehouseSourceImport.js';
import { PreviewCanvasTransformRowsUseCase } from '../../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import {
  buildDvtCrossPreviewDraft,
  buildDvtJoinPreviewDraft,
} from '../../fixtures/dvtJoinPreviewFixture.js';

const request: TransformDataSampleRequest = {
  canvasId: 'canvas-joins',
  transformNodeId: 'transform-orders',
  limit: 20,
};

function context(): AuthorizedExecutionContext {
  return {
    principal: {
      principalId: 'user-1',
      subjectId: 'user-1',
      issuer: 'issuer',
      audience: 'audience',
      principalType: 'user',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      rawScopes: [],
      assertedTenantIds: ['tenant-a'],
      assertedProjectIds: ['project-a'],
    },
    scope: buildEnvironmentAccessScope(
      TenantId.unsafe('tenant-a'),
      ProjectId.unsafe('project-a'),
      EnvironmentId.unsafe('env-a')
    ),
    action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
    requestId: 'req-1',
    authorizedAt: new Date('2026-09-15T00:00:00.000Z'),
  };
}

function connection(): WarehouseConnectionCatalogEntry {
  return {
    id: 'local-postgres-proof',
    name: 'Local PostgreSQL',
    type: 'postgres',
    database: 'dvt',
    credentialRef: 'postgres:local-postgres-proof',
    sourceObjects: [],
  };
}

function catalog(): IWarehouseConnectionCatalog {
  const entry = connection();
  return {
    listConnections: vi.fn(async () => []),
    listSourceObjects: vi.fn(async () => []),
    getConnection: vi.fn(async () => entry),
    createConnection: vi.fn(async (): Promise<WarehouseConnection> => entry),
    renameConnection: vi.fn(async (): Promise<WarehouseConnection> => entry),
  };
}

function harness(
  canvasId = request.canvasId,
  inputCount: 2 | 3 = 2,
  operation: 'join' | 'cross' = 'join'
): Readonly<{
  semanticPlanSha256: string;
  relationId: string;
  executeWithAuthorizedDraft: ReturnType<typeof vi.fn>;
  previewTransformRows: ReturnType<typeof vi.fn>;
  useCase: PreviewCanvasTransformRowsUseCase;
}> {
  const draft = {
    ...(operation === 'cross'
      ? buildDvtCrossPreviewDraft(inputCount)
      : buildDvtJoinPreviewDraft(inputCount)),
    canvas: { id: canvasId, kind: 'transformation' as const, title: 'Joins' },
  };
  const executeWithAuthorizedDraft = vi.fn(async () => ({
    ok: true as const,
    value: {
      selection: { mode: 'upstream' as const, nodeIds: [request.transformNodeId] },
      nodeIds: draft.nodeIds,
      edgeIds: draft.edges.map((edge) => edge.id),
      executable: true as const,
      diagnostics: [],
      decisionScopeNodeIds: draft.nodeIds,
      authorizedDraft: { revision: 'revision-7', draft },
    },
  }));
  const previewTransformRows = vi.fn<ICanvasTransformDataSampleProbe['previewTransformRows']>(
    async () => ({
      columns: [{ name: 'order_id', type: 'integer', nullable: true }],
      rows: [{ values: ['1'] }],
      truncated: false,
      sampledAt: '2026-09-15T10:00:00.000Z',
    })
  );
  const probe: ICanvasTransformDataSampleProbe = { previewTransformRows };
  const document = DvtTransformAuthoringAuthorityV1Schema.parse(
    draft.nodes.find((node) => node.id === request.transformNodeId)?.metadata?.transformAuthoring
  ).semanticDocument;
  return {
    semanticPlanSha256: document.semanticPlan.sha256,
    relationId: document.sidecar.relations.find((relation) => relation.sourceRef == null)!
      .relationId,
    executeWithAuthorizedDraft,
    previewTransformRows,
    useCase: new PreviewCanvasTransformRowsUseCase({
      graphDraftResolver: { executeWithAuthorizedDraft } as never,
      connectionCatalog: catalog(),
      probe,
    }),
  };
}

describe('PreviewCanvasTransformRowsUseCase', () => {
  it('samples the selected first JOIN rather than the final three-source Model', async () => {
    const { useCase, previewTransformRows, relationId, semanticPlanSha256 } = harness(
      request.canvasId,
      3
    );
    const selection = TransformDataSampleRequestSchema.parse({
      ...request,
      relationId,
      semanticPlanSha256,
    });
    const result = await useCase.execute(selection, context());
    expect(result).toMatchObject({ relationId, semanticPlanSha256 });
    expect(previewTransformRows.mock.calls[0]?.[0].sql.match(/\bJOIN\b/g)).toHaveLength(1);
  });

  it('samples the selected first CROSS operation without widening to the final product', async () => {
    const { useCase, previewTransformRows, relationId, semanticPlanSha256 } = harness(
      request.canvasId,
      3,
      'cross'
    );

    const result = await useCase.execute(
      TransformDataSampleRequestSchema.parse({
        ...request,
        relationId,
        semanticPlanSha256,
      }),
      context()
    );

    expect(result).toMatchObject({ relationId, semanticPlanSha256 });
    expect(previewTransformRows.mock.calls[0]?.[0].sql.match(/CROSS JOIN/g)).toHaveLength(1);
  });

  it.each(['unknown', 'stale'])(
    'rejects %s relation selection before issuing a data query',
    async (reason) => {
      const { useCase, previewTransformRows, relationId, semanticPlanSha256 } = harness(
        request.canvasId,
        3
      );
      const selection = {
        ...request,
        relationId: reason === 'unknown' ? 'foreign-relation' : relationId,
        semanticPlanSha256: reason === 'stale' ? 'f'.repeat(64) : semanticPlanSha256,
      };
      await expect(
        useCase.execute(TransformDataSampleRequestSchema.parse(selection), context())
      ).rejects.toBeInstanceOf(CanvasTransformDataSampleUnavailableError);
      expect(previewTransformRows).not.toHaveBeenCalled();
    }
  );

  it('projects and samples the current protected Transform without publishing a result', async () => {
    const { useCase, previewTransformRows } = harness();

    const result = await useCase.execute(request, context());

    expect(previewTransformRows).toHaveBeenCalledOnce();
    expect(previewTransformRows).toHaveBeenCalledWith({
      type: 'postgres',
      credentialRef: 'postgres:local-postgres-proof',
      sql: expect.stringContaining('JOIN'),
      limit: 20,
    });
    expect(result).toMatchObject({
      contractVersion: 1,
      canvasId: request.canvasId,
      transformNodeId: request.transformNodeId,
      draftRevision: 'revision-7',
      rows: [{ values: ['1'] }],
    });
    expect(result).not.toHaveProperty('sql');
    expect(result).not.toHaveProperty('credentialRef');
  });

  it('fails closed before querying when the active Canvas changed', async () => {
    const { useCase, previewTransformRows } = harness('another-canvas');

    await expect(useCase.execute(request, context())).rejects.toMatchObject({
      reason: 'canvas_changed',
    } satisfies Partial<CanvasTransformDataSampleUnavailableError>);
    expect(previewTransformRows).not.toHaveBeenCalled();
  });
});
