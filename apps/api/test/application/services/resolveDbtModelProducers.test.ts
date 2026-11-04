import { PlanRelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  DbtProjectGraphProjectionSchema,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  encodeDvtSubstraitPlanV1,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  type DbtProjectGraphProjection,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { renderPostgresAst } from '@dvt/postgres-projection';
import { createProducerInput } from '@dvt/substrait-analysis';
import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import type { ICanvasTransformDataSampleProbe } from '../../../src/application/ports/canvasTransformDataSample.js';
import type {
  DbtProjectAnalysis,
  IDbtProjectAnalyzerPort,
} from '../../../src/application/ports/dbtProjectAnalysis.js';
import type { IWarehouseConnectionCatalog } from '../../../src/application/ports/warehouseSourceImport.js';
import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { PreviewCanvasTransformRowsUseCase } from '../../../src/application/services/previewCanvasTransformRowsUseCase.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../../../src/application/services/projectDbtGraphFromFilesUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveDbtModelProducers } from '../../../src/application/services/resolveDbtModelProducers.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';
import { publisherHarness } from '../../fixtures/dvtRepeatedSourcePublisher.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const context: AuthorizedExecutionContext = {
  principal: {
    principalId: 'user',
    subjectId: 'user',
    issuer: 'test',
    audience: 'test',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant'],
    assertedProjectIds: ['project'],
  },
  scope: buildEnvironmentAccessScope(
    TenantId.unsafe(scope.tenantId),
    ProjectId.unsafe(scope.projectId),
    EnvironmentId.unsafe(scope.environmentId)
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'request',
  authorizedAt: new Date('2026-11-04T00:00:00Z'),
};
const binding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'file-owner',
  authority: { kind: 'dbt-project-files', projectRoot: '.' },
} as const;
const connectionRef = {
  schemaVersion: 'connection-ref.v1',
  provider: 'postgres',
  connectionId: 'warehouse',
} as const;
const reference = {
  schemaVersion: 'workspace-dbt-model-reference.v1',
  canvasId: binding.canvasId,
  uniqueId: 'model.demo.clientes',
  relationId: 'assigned-relation',
  connectionRef,
  fields: [{ fieldId: 'assigned-client', name: 'client_id', dataType: 'text', nullable: true }],
} as const;
const node: WorkspaceGraphAuthoringNode = {
  id: 'instance',
  name: 'Clientes',
  kind: 'transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { dbtModelReference: reference },
};
function fixture(sql = 'select client_id from raw.client'): Readonly<{
  resolver: ResolveDbtModelProducers;
  analyze: Mock<IDbtProjectAnalyzerPort['analyze']>;
  resolve: Mock;
  authorize: Mock;
  projectValidatedAnalysis: Mock<ProjectDbtGraphFromFilesUseCase['projectValidatedAnalysis']>;
  projection: DbtProjectGraphProjection;
}> {
  const resource = {
    uniqueId: reference.uniqueId,
    resourceType: 'model',
    name: 'clientes',
    packageName: 'demo',
    columns: [{ name: 'client_id', dataType: 'text' }],
    tags: [],
    codeOnlyReasons: ['file-authority'],
    compiledSql: sql,
  } as const;
  const analysis: DbtProjectAnalysis = {
    status: 'valid',
    adapterType: 'postgres',
    projectRevision: {
      projectRoot: '.',
      projectName: 'demo',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-11-04T00:00:00.000Z',
      analyzerVersion: 'native-dbt',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    resources: [
      {
        ...resource,
        columns: [...resource.columns],
        tags: [],
        codeOnlyReasons: [...resource.codeOnlyReasons],
      },
    ],
    dependencies: [],
    diagnostics: [],
    semanticEvidence: { files: [], identities: [], regions: [], diagnostics: [] },
  };
  const projection = DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    adapterType: 'postgres',
    authorityBinding: binding,
    freshness: 'fresh',
    projectRevision: analysis.projectRevision,
    analysisSha256: analysis.analysisSha256,
    nodes: [
      {
        ...resource,
        compiledSql: undefined,
        codeOnlyReasons: undefined,
        visualEditability: { status: 'code_only', reasons: ['file-authority'] },
      },
    ].map(({ compiledSql: _sql, codeOnlyReasons: _reasons, ...model }) => model),
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
    executionTarget: {
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'default',
      connectionRef,
      resolutionSource: 'environment-default',
      credentialRef: 'env:DBT_PROFILES_DIR',
    },
  });
  const analyze = vi.fn<IDbtProjectAnalyzerPort['analyze']>().mockResolvedValue(analysis);
  const resolve = vi.fn().mockResolvedValue(binding);
  const projectValidatedAnalysis = vi
    .fn<ProjectDbtGraphFromFilesUseCase['projectValidatedAnalysis']>()
    .mockResolvedValue(projection);
  const authorize = vi.fn().mockResolvedValue({ ok: true, context });
  return {
    resolver: new ResolveDbtModelProducers({
      analyzer: { analyze },
      authorityPolicy: { resolve },
      projectGraph: { projectValidatedAnalysis },
      authorizer: { authorize },
    }),
    analyze,
    resolve,
    authorize,
    projectValidatedAnalysis,
    projection,
  };
}

describe('scoped dbt model producer binding', () => {
  it('samples an independent persisted placement through planner selection, compilation and PostgreSQL projection', async () => {
    const f = fixture();
    const definition = { ...node, id: 'definition' };
    const instance = { ...node, id: 'placement', definitionId: definition.id, metadata: undefined };
    const draft: WorkspaceGraphAuthoringDraft = {
      canvas: { id: 'native', kind: 'transformation', title: 'Native Canvas' },
      nodeIds: [instance.id],
      nodePositions: { [instance.id]: { x: 100, y: 80 } },
      nodes: [definition, instance],
      edges: [],
    };
    const before = JSON.stringify(draft);
    const graphDraftResolver = new ResolveAuthorizedExecutableSubgraphService({
      planner: new PlannerFacade(),
      workspaceGraphDraftStore: {
        read: vi.fn(async () => ({
          schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          revision: 'saved-revision',
          draftPayload: draft,
        })),
      } as never,
    });
    const previewTransformRows = vi
      .fn<ICanvasTransformDataSampleProbe['previewTransformRows']>()
      .mockResolvedValue({
        columns: [{ name: 'client_id', type: 'text', nullable: true }],
        rows: [{ values: ['C-001'] }],
        truncated: false,
        queriedAt: '2026-11-04T00:00:00.000Z',
        navigation: 'bounded-first-page',
      });
    const getConnection = vi.fn<IWarehouseConnectionCatalog['getConnection']>().mockResolvedValue({
      id: connectionRef.connectionId,
      name: 'Warehouse',
      type: 'postgres',
      database: 'demo',
      credentialRef: 'env:WAREHOUSE',
      sourceObjects: [],
    });
    const useCase = new PreviewCanvasTransformRowsUseCase({
      graphDraftResolver,
      modelProducers: f.resolver,
      connectionCatalog: { getConnection },
      probe: { previewTransformRows },
    });
    const sample = await useCase.execute(
      { canvasId: 'native', transformNodeId: instance.id, limit: 5 },
      context
    );
    expect(sample).toMatchObject({
      transformNodeId: instance.id,
      draftRevision: 'saved-revision',
      rows: [{ values: ['C-001'] }],
      provenance: {
        sourceRefs: [],
        modelRefs: [{ canvasId: binding.canvasId, uniqueId: reference.uniqueId }],
      },
    });
    expect(previewTransformRows.mock.calls[0]?.[0]).toMatchObject({
      limit: 5,
      sql: expect.stringContaining('FROM raw.client'),
    });
    expect(f.authorize).toHaveBeenCalledWith(
      context.principal,
      { ...context.scope, action: AUTHORIZATION_ACTION.workspaceFilesView },
      context.requestId
    );
    expect(JSON.stringify(draft)).toBe(before);
    const externalProducers = await f.resolver.resolve([{ ...node, id: instance.id }], context);
    const isolated = {
      scope,
      draft,
      selectedNodeIds: [instance.id],
      selectedEdgeIds: [],
      externalProducers,
    };
    const { publisher, publish } = publisherHarness();
    await expect(publisher.publish(isolated)).rejects.toThrow();
    expect(publish).not.toHaveBeenCalled();
    const document = externalProducers.get(instance.id)!.document;
    const input = createProducerInput({ nodeId: instance.id, name: instance.name, document }, 1);
    const plan = {
      ...document.plan,
      relations: [
        create(PlanRelSchema, {
          relType: { case: 'root', value: { input: input.relation, names: ['client_id'] } },
        }),
      ],
    };
    const semanticPlan = encodeDvtSubstraitPlanV1(plan);
    const consumer = {
      ...node,
      id: 'consumer',
      metadata: {
        transformAuthoring: {
          version: 'v1',
          mode: 'substrait',
          semanticDocument: {
            schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
            profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
            semanticPlan,
            sidecar: {
              ...document.sidecar,
              semanticPlanSha256: semanticPlan.sha256,
              relations: [input.binding],
              fields: input.fields,
            },
          },
        },
      },
    };
    const edge = {
      id: 'manual-use',
      sourceId: instance.id,
      targetId: consumer.id,
      relation: 'lineage' as const,
    };
    const selected = {
      ...isolated,
      draft: {
        ...draft,
        nodes: [...draft.nodes, consumer],
        nodeIds: [instance.id, consumer.id],
        nodePositions: { ...draft.nodePositions, [consumer.id]: { x: 200, y: 80 } },
        edges: [edge],
      },
      selectedNodeIds: [instance.id, consumer.id],
      selectedEdgeIds: [edge.id],
    };
    const publication = await publisher.publish(selected);
    if (!publication.ok) throw new Error(publication.cause);
    const workload = new DvtOperationalWorkloadProjector().project({
      ...selected,
      canvasId: 'native',
      draftRevision: 'saved-revision',
      targetProjection: publication.value,
    });
    expect(workload).toMatchObject({
      ok: true,
      graphSource: {
        nodes: [
          {
            nodeId: consumer.id,
            stepTypeConfig: {
              executionIntent: 'preview',
              graph: { selectedNodeIds: [consumer.id, instance.id], selectedEdgeIds: [edge.id] },
              connectionRef,
            },
          },
        ],
      },
    });
  });
  it('compiles a repeated model once and keeps instance and assigned field identities', async () => {
    const f = fixture();
    const result = await f.resolver.resolve([node, { ...node, id: 'second-instance' }], context);
    expect([...result.keys()]).toEqual(['instance', 'second-instance']);
    expect(f.analyze).toHaveBeenCalledOnce();
    expect(f.analyze).toHaveBeenCalledWith({
      scope,
      projectRoot: '.',
      operation: { kind: 'compile', selectors: [reference.uniqueId] },
    });
    expect(result.get(node.id)?.document.sidecar.fields[0]?.fieldId).toBe('assigned-client');
    expect(await renderPostgresAst(result.get(node.id)!.projection.ast)).toContain(
      'FROM raw.client'
    );
    expect(result.get(node.id)?.projection.projection.inputs).toEqual([]);
    expect(result.get(node.id)?.provenance).toMatchObject({
      canvasId: binding.canvasId,
      uniqueId: reference.uniqueId,
      contentSetSha256: 'a'.repeat(64),
    });
  });
  it('does no analyzer work for native-only selections', async () => {
    const f = fixture();
    expect((await f.resolver.resolve([], context)).size).toBe(0);
    expect(f.analyze).not.toHaveBeenCalled();
  });
  it.each([
    'select 1; select 2',
    'delete from raw.client',
    'with changed as (delete from raw.client returning *) select * from changed',
    'select * into raw.copied from raw.client',
    'select * from raw.client for update',
  ])('rejects compilation outside the read-only SELECT policy: %s', async (sql) => {
    await expect(fixture(sql).resolver.resolve([node], context)).rejects.toThrow();
  });
  it.each([
    { fields: [{ ...reference.fields[0], name: 'removed' }] },
    { fields: [{ ...reference.fields[0], dataType: 'bigint' }] },
    { connectionRef: { ...connectionRef, connectionId: 'other' } },
    { uniqueId: 'model.demo.missing' },
  ])('rejects a changed output or connection: %j', async (patch) => {
    await expect(
      fixture().resolver.resolve(
        [{ ...node, metadata: { dbtModelReference: { ...reference, ...patch } } }],
        context
      )
    ).rejects.toThrow();
  });
  it('fails before compilation for missing or foreign file authority', async () => {
    const f = fixture();
    f.resolve.mockRejectedValue(new Error('Scope denied.'));
    await expect(f.resolver.resolve([node], context)).rejects.toThrow('Scope denied.');
    expect(f.analyze).not.toHaveBeenCalled();
  });
  it('rejects a file revision change observed by the authoritative projection query', async () => {
    const f = fixture();
    f.projectValidatedAnalysis.mockRejectedValue(new Error('Project revision changed.'));
    await expect(f.resolver.resolve([node], context)).rejects.toThrow('Project revision changed.');
  });
  it('does not gain file access from permission to view the native graph', async () => {
    const f = fixture();
    f.authorize.mockResolvedValue({ ok: false, reason: 'missing_scope' });
    await expect(f.resolver.resolve([node], context)).rejects.toThrow('file-model access');
    expect(f.resolve).not.toHaveBeenCalled();
    expect(f.analyze).not.toHaveBeenCalled();
  });
});
