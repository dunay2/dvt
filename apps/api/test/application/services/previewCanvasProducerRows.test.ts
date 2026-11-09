import {
  DvtTransformAuthoringAuthorityV1Schema,
  TransformDataSampleRequestSchema,
  type TransformDataSampleRequest,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import type {
  DbtModelProducer,
  IDbtModelProducerResolver,
} from '../../../src/application/ports/dbtModelProducer.js';
import { projectDvtPostgresTransform } from '../../../src/application/services/dvtPostgresTransformProjection.js';
import { PreviewCanvasTransformRowsUseCase } from '../../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { ResolveCanvasTransformProjection } from '../../../src/application/services/resolveCanvasTransformProjection.js';
import {
  resolveDvtTerminalTransformClosure,
  type DvtTerminalTransformClosure,
} from '../../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { buildDbtInputPreviewFixture } from '../../fixtures/dvtDbtInputPreviewFixture.js';
import {
  buildProducerPreviewDraft,
  consumerNode,
  producerDocument,
  withProducerDocument,
} from '../../fixtures/dvtProducerPreviewFixture.js';
import { repeatedSourceInput } from '../../fixtures/dvtRepeatedSourceFixture.js';
import { buildDvtTerminalTransformPreviewDraft } from '../../fixtures/workspaceGraphDraftFixture.js';

const context: AuthorizedExecutionContext = {
  principal: {
    principalId: 'user',
    subjectId: 'user',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01'),
    rawScopes: [],
    assertedTenantIds: ['tenant'],
    assertedProjectIds: ['project'],
  },
  scope: buildEnvironmentAccessScope(
    TenantId.unsafe('tenant'),
    ProjectId.unsafe('project'),
    EnvironmentId.unsafe('env')
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'producer-preview',
  authorizedAt: new Date('2026-09-26'),
};

function withVisiblePositions(draft: WorkspaceGraphAuthoringDraft): WorkspaceGraphAuthoringDraft {
  return {
    ...draft,
    nodePositions: Object.fromEntries(
      draft.nodes.map((node, index) => [
        node.id,
        draft.nodePositions[node.id] ?? { x: index * 240, y: 0 },
      ])
    ),
  };
}

function harness(
  input = buildProducerPreviewDraft(),
  targetId = 'downstream',
  externalProducers?: ReadonlyMap<string, DbtModelProducer>
): Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  previewTransformRows: ReturnType<typeof vi.fn>;
  getConnection: ReturnType<typeof vi.fn>;
  executeWithAuthorizedDraft: ReturnType<typeof vi.fn>;
  resolveModelProducers: ReturnType<typeof vi.fn<IDbtModelProducerResolver['resolve']>>;
  useCase: PreviewCanvasTransformRowsUseCase;
  request: TransformDataSampleRequest;
}> {
  const draft = withVisiblePositions(input);
  const previewTransformRows = vi.fn(async () => ({
    columns: [],
    rows: [],
    truncated: false,
    queriedAt: '2026-09-26T10:00:00.000Z',
    navigation: 'bounded-first-page' as const,
  }));
  const getConnection = vi.fn(async () => ({
    id: 'local-postgres-proof',
    name: 'PostgreSQL',
    type: 'postgres' as const,
    database: 'dvt',
    credentialRef: 'postgres:local-postgres-proof',
    sourceObjects: [],
  }));
  const executeWithAuthorizedDraft = vi.fn(async () => ({
    ok: true as const,
    value: {
      selection: { mode: 'upstream' as const, nodeIds: [targetId] },
      nodeIds: draft.nodeIds,
      edgeIds: draft.edges.map((edge) => edge.id),
      executable: true as const,
      diagnostics: [],
      decisionScopeNodeIds: draft.nodeIds,
      authorizedDraft: { revision: 'revision-chain', draft },
    },
  }));
  const resolveModelProducers = vi
    .fn<IDbtModelProducerResolver['resolve']>()
    .mockImplementation(async (nodes) => {
      const requested = new Set(nodes.map((node) => node.id));
      return new Map([...(externalProducers ?? [])].filter(([id]) => requested.has(id)));
    });
  const useCase = new PreviewCanvasTransformRowsUseCase({
    projection: new ResolveCanvasTransformProjection({
      graphDraftResolver: { executeWithAuthorizedDraft } as never,
      ...(externalProducers == null ? {} : { modelProducers: { resolve: resolveModelProducers } }),
    }),
    connectionCatalog: { getConnection } as never,
    probe: { previewTransformRows },
  });
  return {
    draft,
    previewTransformRows,
    getConnection,
    executeWithAuthorizedDraft,
    resolveModelProducers,
    useCase,
    request: { canvasId: draft.canvas.id!, transformNodeId: targetId, limit: 20 },
  };
}

function closure(
  draft: WorkspaceGraphAuthoringDraft,
  targetId = 'downstream'
): DvtTerminalTransformClosure {
  return resolveDvtTerminalTransformClosure({
    draft: withVisiblePositions(draft),
    selectedNodeIds: draft.nodeIds,
    selectedEdgeIds: draft.edges.map((edge) => edge.id),
    previewTargetId: targetId,
  });
}

describe('protected producer/consumer row preview', () => {
  it('previews a valid target despite an unused foreign physical predecessor', async () => {
    const base = buildProducerPreviewDraft();
    const foreign = globalThis.structuredClone(base.nodes[0]!);
    foreign.id = 'foreign-source';
    const ref = foreign.metadata!.connectedSourceRef as { connectionRef: { connectionId: string } };
    ref.connectionRef.connectionId = 'foreign';
    const draft: WorkspaceGraphAuthoringDraft = {
      ...base,
      nodes: [...base.nodes, foreign],
      nodeIds: [...base.nodeIds, foreign.id],
      edges: [
        ...base.edges,
        { id: 'foreign-consumer', sourceId: foreign.id, targetId: 'consumer', relation: 'lineage' },
      ],
    };
    const h = harness(draft);
    const result = await h.useCase.execute(h.request, context);
    expect(result.provenance.sourceRefs).toHaveLength(1);
    expect(h.getConnection.mock.calls[0]![1]).toBe('local-postgres-proof');
    expect(h.previewTransformRows).toHaveBeenCalledOnce();
  });

  it('keeps a file-only selected relation independent of an unused foreign Source', async () => {
    const fixture = buildDbtInputPreviewFixture();
    const physical = fixture.draft.nodes.find((node) => node.role === 'input')!;
    const ref = physical.metadata!.connectedSourceRef as {
      connectionRef: { connectionId: string };
    };
    ref.connectionRef.connectionId = 'foreign';
    const h = harness(fixture.draft, fixture.targetId, fixture.externalProducers);
    const result = await h.useCase.execute(
      TransformDataSampleRequestSchema.parse({
        ...h.request,
        relationId: fixture.modelRelationId,
        semanticPlanSha256: fixture.semanticPlanSha256,
      }),
      context
    );
    expect(result.provenance.sourceRefs).toEqual([]);
    expect(result.provenance.modelRefs).toEqual(
      [...fixture.externalProducers.values()].map((producer) => producer.provenance)
    );
    expect(result.semanticPlanSha256).toBe(fixture.semanticPlanSha256);
    expect(h.getConnection.mock.calls[0]![1]).toBe(
      [...fixture.externalProducers.values()][0]!.connection.connectionId
    );
  });

  it('rejects consumed physical and external inputs on different connections before probing rows', async () => {
    const fixture = buildDbtInputPreviewFixture();
    const physical = fixture.draft.nodes.find((node) => node.role === 'input')!;
    const ref = physical.metadata!.connectedSourceRef as {
      connectionRef: { connectionId: string };
    };
    ref.connectionRef.connectionId = 'foreign';
    const target = fixture.draft.nodes.find((node) => node.id === fixture.targetId)!;
    const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
      target.metadata!.transformAuthoring
    );
    for (const binding of authority.semanticDocument.sidecar.relations)
      if (binding.sourceRef != null) binding.sourceRef.connectionRef.connectionId = 'foreign';
    target.metadata!.transformAuthoring = authority;
    expect(() =>
      resolveDvtTerminalTransformClosure(
        {
          draft: fixture.draft,
          selectedNodeIds: fixture.draft.nodeIds,
          selectedEdgeIds: fixture.draft.edges.map((edge) => edge.id),
          previewTargetId: fixture.targetId,
        },
        fixture.externalProducers
      )
    ).toThrow('one PostgreSQL connection');
    const h = harness(fixture.draft, fixture.targetId, fixture.externalProducers);
    await expect(h.useCase.execute(h.request, context)).rejects.toMatchObject({
      reason: 'projection_unsupported',
    });
    expect(h.getConnection).not.toHaveBeenCalled();
    expect(h.previewTransformRows).not.toHaveBeenCalled();
  });

  it('retains strict whole-selection connection admission for operational publication', () => {
    const base = buildDvtTerminalTransformPreviewDraft();
    const foreign = globalThis.structuredClone(base.nodes[0]!);
    foreign.id = 'foreign-source';
    const ref = foreign.metadata!.connectedSourceRef as { connectionRef: { connectionId: string } };
    ref.connectionRef.connectionId = 'foreign';
    const nodes = [...base.nodes, foreign];
    const draft: WorkspaceGraphAuthoringDraft = {
      ...base,
      nodes,
      nodeIds: nodes.map((node) => node.id),
      nodePositions: { ...base.nodePositions, [foreign.id]: { x: 0, y: 200 } },
      edges: [
        ...base.edges,
        {
          id: 'foreign-target',
          sourceId: foreign.id,
          targetId: 'transform-orders',
          relation: 'lineage',
        },
      ],
    };
    expect(() =>
      resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      })
    ).toThrow('one PostgreSQL connection');
  });

  it.each(['ambiguous-source', 'missing-direct-edge'] as const)(
    'does not hide %s when selecting physical bindings',
    async (reason) => {
      const base = buildDvtTerminalTransformPreviewDraft();
      if (reason === 'ambiguous-source') {
        const duplicate = { ...base.nodes[0]!, id: 'duplicate-source' };
        base.nodes.push(duplicate);
        base.nodeIds.push(duplicate.id);
        base.edges.push({
          id: 'duplicate-target',
          sourceId: duplicate.id,
          targetId: 'transform-orders',
          relation: 'lineage',
        });
      } else base.edges = [];
      const h = harness(base, 'transform-orders');
      await expect(h.useCase.execute(h.request, context)).rejects.toMatchObject({
        reason: 'projection_unsupported',
      });
      expect(h.getConnection).not.toHaveBeenCalled();
      expect(h.previewTransformRows).not.toHaveBeenCalled();
    }
  );

  it.each(['model', 'physical', 'join', 'whole'] as const)(
    'previews the %s target of a mixed dbt-model/physical-source JOIN',
    async (selection) => {
      const fixture = buildDbtInputPreviewFixture();
      const before = globalThis.structuredClone(fixture.draft);
      const h = harness(fixture.draft, fixture.targetId, fixture.externalProducers);
      const relationId = {
        model: fixture.modelRelationId,
        physical: fixture.physicalRelationId,
        join: fixture.joinRelationId,
        whole: undefined,
      }[selection];
      const result = await h.useCase.execute(
        TransformDataSampleRequestSchema.parse({
          ...h.request,
          semanticPlanSha256: fixture.semanticPlanSha256,
          ...(relationId == null ? {} : { relationId }),
        }),
        context
      );
      expect(result.relationId).toBe(relationId);
      expect(result.semanticPlanSha256).toBe(fixture.semanticPlanSha256);
      expect(result.provenance.sourceRefs).toHaveLength(selection === 'model' ? 0 : 1);
      expect(result.provenance.modelRefs ?? []).toHaveLength(selection === 'physical' ? 0 : 1);
      expect(h.resolveModelProducers).toHaveBeenCalledTimes(selection === 'physical' ? 0 : 1);
      if (selection !== 'physical')
        expect(h.resolveModelProducers.mock.calls[0]![0].map((node) => node.id)).toEqual([
          ...fixture.externalProducers.keys(),
        ]);
      expect(h.previewTransformRows).toHaveBeenCalledOnce();
      const sql = h.previewTransformRows.mock.calls[0]![0].sql;
      expect(/\bJOIN\b/.test(sql)).toBe(selection === 'join' || selection === 'whole');
      expect(fixture.draft).toEqual(before);
    }
  );

  it('reports a repeated physical input once without removing either logical JOIN input', async () => {
    const projection = await projectDvtPostgresTransform(
      resolveDvtTerminalTransformClosure(repeatedSourceInput())
    );
    expect(projection.sourceRefs).toHaveLength(1);
    expect(projection.sql).toContain('JOIN');
    expect(projection.outputs).toHaveLength(4);
  });
  it('projects only immediate published fields through a chain without copying producer operations', async () => {
    const h = harness();
    const before = globalThis.structuredClone(h.draft);
    const projection = await projectDvtPostgresTransform(closure(h.draft));
    expect(projection.outputs.map((output) => output.name)).toEqual(['consumer_id']);
    expect(producerDocument(h.draft.nodes[3]!).sidecar.relations).toHaveLength(1);
    expect(producerDocument(h.draft.nodes[3]!).sidecar.relations[0]!.producerRef?.nodeId).toBe(
      'consumer'
    );
    await expect(h.useCase.execute(h.request, context)).resolves.toMatchObject({
      draftRevision: 'revision-chain',
    });
    expect(h.getConnection).toHaveBeenCalledWith(
      { tenantId: 'tenant', projectId: 'project', environmentId: 'env' },
      'local-postgres-proof'
    );
    expect(h.previewTransformRows).toHaveBeenCalledWith(
      expect.objectContaining({ sql: projection.sql })
    );
    expect(h.draft).toEqual(before);
  });

  it('previews a selected consumer Input operation rather than the final output, even with a downstream consumer', async () => {
    const draft = buildProducerPreviewDraft();
    const selected = draft.nodes[2]!;
    const document = producerDocument(selected);
    const relationId = document.sidecar.relations.find(
      (relation) => relation.producerRef != null
    )!.relationId;
    const projection = await projectDvtPostgresTransform(closure(draft, selected.id), relationId);
    expect(projection.outputs.map((output) => output.name)).toEqual([
      'published_id',
      'published_country',
    ]);
    const h = harness(draft, selected.id);
    const semanticPlanSha256 = DvtTransformAuthoringAuthorityV1Schema.parse(
      selected.metadata?.transformAuthoring
    ).semanticDocument.semanticPlan.sha256;
    await expect(
      h.useCase.execute(
        TransformDataSampleRequestSchema.parse({ ...h.request, relationId, semanticPlanSha256 }),
        context
      )
    ).resolves.toMatchObject({ relationId });
    expect(h.previewTransformRows).toHaveBeenCalledWith(
      expect.objectContaining({ sql: projection.sql })
    );
  });

  it('does not revive an excluded producer field from a stale consumer schema', async () => {
    const base = buildProducerPreviewDraft();
    const producer = base.nodes[1]!;
    const consumer = consumerNode(producer, 'consumer');
    const document = producerDocument(producer);
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
      throw new Error('Expected Project.');
    const common = root.value.input.relType.value.common!;
    if (common.emitKind.case !== 'emit') throw new Error('Expected explicit outputs.');
    common.emitKind.value.outputMapping = [0];
    root.value.names = ['published_id'];
    const relationId = document.sidecar.relations[1]!.relationId;
    const updated = withProducerDocument(producer, {
      ...document,
      sidecar: {
        ...document.sidecar,
        fields: document.sidecar.fields.filter(
          (field) => field.relationId !== relationId || field.outputOrdinal === 0
        ),
      },
    });
    const nodes = [base.nodes[0]!, updated, consumer];
    const draft = {
      ...base,
      nodes,
      nodeIds: nodes.map((node) => node.id),
      edges: base.edges.slice(0, 2),
    };
    const result = await projectDvtPostgresTransform(closure(draft, consumer.id));
    expect(result.outputs.map((field) => field.name)).toEqual(['published_id']);
  });

  it.each(['missing-edge', 'cycle', 'missing-producer'] as const)(
    'rejects %s before acquiring credentials or issuing a query',
    async (reason) => {
      const base = buildProducerPreviewDraft();
      let draft = base;
      if (reason === 'missing-edge')
        draft = { ...base, edges: base.edges.filter((edge) => edge.id !== 'producer-consumer') };
      if (reason === 'missing-producer')
        draft = {
          ...base,
          nodes: base.nodes.filter((node) => node.id !== 'consumer'),
          nodeIds: base.nodeIds.filter((id) => id !== 'consumer'),
          edges: base.edges.filter(
            (edge) => edge.targetId !== 'consumer' && edge.sourceId !== 'consumer'
          ),
        };
      if (reason === 'cycle') {
        const replacement = consumerNode(base.nodes[3]!, 'consumer');
        draft = {
          ...base,
          nodes: base.nodes.map((node) => (node.id === replacement.id ? replacement : node)),
          edges: [
            ...base.edges,
            { id: 'cycle', sourceId: 'downstream', targetId: 'consumer', relation: 'lineage' },
          ],
        };
      }
      await expect(
        Promise.resolve().then(() => projectDvtPostgresTransform(closure(draft)))
      ).rejects.toThrow(reason === 'cycle' ? 'cycle' : 'authorized direct dependency');
      const h = harness(draft);
      await expect(h.useCase.execute(h.request, context)).rejects.toMatchObject({
        reason: 'projection_unsupported',
      });
      expect(h.getConnection).not.toHaveBeenCalled();
      expect(h.previewTransformRows).not.toHaveBeenCalled();
    }
  );

  it('does not query when the protected upstream selection is denied', async () => {
    const h = harness();
    h.executeWithAuthorizedDraft.mockResolvedValueOnce({
      ok: false,
      rejection: { cause: 'scope-denied' },
    } as never);
    await expect(h.useCase.execute(h.request, context)).rejects.toMatchObject({
      reason: 'selection_unavailable',
    });
    expect(h.getConnection).not.toHaveBeenCalled();
    expect(h.previewTransformRows).not.toHaveBeenCalled();
  });

  it('does not widen operational workload admission through the row-preview path', () => {
    const draft = buildProducerPreviewDraft();
    expect(() =>
      resolveDvtTerminalTransformClosure({
        draft,
        selectedNodeIds: draft.nodeIds,
        selectedEdgeIds: draft.edges.map((edge) => edge.id),
      })
    ).toThrow('Operational workloads require exactly one Transform authority.');
  });
});
