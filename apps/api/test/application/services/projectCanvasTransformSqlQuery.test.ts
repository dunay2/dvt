import {
  DvtTransformAuthoringAuthorityV1Schema,
  TransformSqlProjectionRequestSchema,
  readWorkspaceDbtModelReference,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  type TransformSqlProjectionRequest,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { projectExternalProducerAst } from '@dvt/postgres-projection';
import {
  createExternalProducerSignature,
  indexSubstraitRelations,
  selectDvtSubstraitRelation,
} from '@dvt/substrait-analysis';
import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import {
  DbtModelProducerAccessDeniedError,
  type IDbtModelProducerResolver,
} from '../../../src/application/ports/dbtModelProducer.js';
import { parsePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';
import { ProjectCanvasTransformSqlQuery } from '../../../src/application/services/projectCanvasTransformSqlQuery.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveCanvasTransformProjection } from '../../../src/application/services/resolveCanvasTransformProjection.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';
import { buildDbtInputPreviewFixture } from '../../fixtures/dvtDbtInputPreviewFixture.js';
import { buildDvtJoinPreviewDraft } from '../../fixtures/dvtJoinPreviewFixture.js';
import {
  consumerNode,
  producerDocument,
  withProducerDocument,
} from '../../fixtures/dvtProducerPreviewFixture.js';
import { buildDvtTerminalTransformPreviewDraft } from '../../fixtures/workspaceGraphDraftFixture.js';

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
    TenantId.unsafe('tenant'),
    ProjectId.unsafe('project'),
    EnvironmentId.unsafe('dev')
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'sql-request',
  authorizedAt: new Date('2026-11-08T00:00:00Z'),
};

function harness(
  draft: WorkspaceGraphAuthoringDraft,
  modelProducers?: IDbtModelProducerResolver,
  targetId = 'transform-orders'
): Readonly<{
  query: ProjectCanvasTransformSqlQuery;
  read: Mock<
    () => Promise<{
      schemaVersion: typeof WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION;
      revision: string;
      draftPayload: WorkspaceGraphAuthoringDraft;
    }>
  >;
  request: TransformSqlProjectionRequest;
}> {
  const read = vi.fn(async () => ({
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    revision: 'saved-revision',
    draftPayload: draft,
  }));
  const graphDraftResolver = new ResolveAuthorizedExecutableSubgraphService({
    planner: new PlannerFacade(),
    workspaceGraphDraftStore: { read } as never,
  });
  const projection = new ResolveCanvasTransformProjection({
    graphDraftResolver,
    ...(modelProducers == null ? {} : { modelProducers }),
  });
  const query = new ProjectCanvasTransformSqlQuery({ projection });
  const transform = draft.nodes.find((node) => node.id === targetId)!;
  const semanticPlanSha256 = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform.metadata?.transformAuthoring
  ).semanticDocument.semanticPlan.sha256;
  return {
    query,
    read,
    request: TransformSqlProjectionRequestSchema.parse({
      canvasId: draft.activeCanvasId ?? draft.canvas.id,
      transformNodeId: transform.id,
      semanticPlanSha256,
    }),
  };
}

function draftFixture(): WorkspaceGraphAuthoringDraft {
  return {
    ...buildDvtJoinPreviewDraft(2),
    canvas: { id: 'canvas-joins', kind: 'transformation', title: 'Joins' },
  };
}

async function withFileProducer(): Promise<
  Readonly<{
    draft: WorkspaceGraphAuthoringDraft;
    resolve: Mock<IDbtModelProducerResolver['resolve']>;
  }>
> {
  const draft = draftFixture();
  const target = draft.nodes.find((node) => node.id === 'transform-orders')!;
  const document = producerDocument(target);
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const read = [...indexed.index.relations.values()].find(
    (entry) => entry.binding.sourceRef != null
  )!;
  if (read.relation.relType.case !== 'read') throw new Error('Expected a physical Read fixture.');
  const source = draft.nodes.find((node) => node.id === `source-${read.binding.displayName}`)!;
  const connection = read.binding.sourceRef!.connectionRef;
  const fields = read.fields.map((field, index) => ({
    fieldId: `external-${index}`,
    name: field.displayName!,
    type:
      read.relation.relType.case === 'read'
        ? read.relation.relType.value.baseSchema!.struct!.types[index]!
        : undefined!,
  }));
  const external = createExternalProducerSignature({
    relationId: 'external-root',
    names: ['file-owner', 'model.demo.ventas_por_cliente'],
    fields,
  });
  read.binding.producerRef = {
    nodeId: source.id,
    fields: read.fields.map((field, index) => ({
      fieldId: field.fieldId,
      producerFieldId: fields[index]!.fieldId,
    })),
  };
  delete read.binding.sourceRef;
  if (read.relation.relType.value.readType.case !== 'namedTable')
    throw new Error('Expected named input.');
  read.relation.relType.value.readType.value.names = [source.id];
  const configured = withProducerDocument(target, document);
  draft.nodes = draft.nodes.map((node) =>
    node.id === target.id
      ? configured
      : node.id === source.id
        ? {
            ...node,
            kind: 'transform',
            role: 'transform',
            pluginId: 'dvt',
            metadata: {
              dbtModelReference: {
                schemaVersion: 'workspace-dbt-model-reference.v1',
                canvasId: 'file-owner',
                uniqueId: 'model.demo.ventas_por_cliente',
                relationId: 'external-root',
                connectionRef: connection,
                fields: fields.map((field) => ({
                  fieldId: field.fieldId,
                  name: field.name,
                  dataType: 'text',
                  nullable: true,
                })),
              },
            },
          }
        : node
  );
  const parsed = await parsePostgresTransformSqlStructure(
    `select ${fields.map((field) => field.name).join(', ')} from raw.ventas_por_cliente`
  );
  if (parsed.status !== 'valid') throw new Error('Expected valid native compiled SELECT fixture.');
  const resolve = vi.fn<IDbtModelProducerResolver['resolve']>().mockResolvedValue(
    new Map([
      [
        source.id,
        {
          document: external,
          connection,
          provenance: {
            canvasId: 'file-owner',
            uniqueId: 'model.demo.ventas_por_cliente',
            contentSetSha256: 'b'.repeat(64),
            analysisSha256: 'c'.repeat(64),
          },
          projection: projectExternalProducerAst(external, parsed.ast),
        },
      ],
    ])
  );
  return { draft, resolve };
}

async function withUnusedFileProducer(): Promise<
  Readonly<{
    draft: WorkspaceGraphAuthoringDraft;
    resolve: Mock<IDbtModelProducerResolver['resolve']>;
  }>
> {
  const file = await withFileProducer();
  const original = file.draft.nodes.find((node) => readWorkspaceDbtModelReference(node) != null)!;
  const unused = { ...original, id: 'unused-file' };
  const base = buildDvtTerminalTransformPreviewDraft();
  const draft: WorkspaceGraphAuthoringDraft = {
    ...base,
    nodes: [...base.nodes, unused],
    nodeIds: [...base.nodeIds, unused.id],
    nodePositions: { ...base.nodePositions, [unused.id]: { x: 0, y: 200 } },
    edges: [
      ...base.edges,
      {
        id: 'unused-file-target',
        sourceId: unused.id,
        targetId: 'transform-orders',
        relation: 'lineage',
      },
    ],
  };
  const producers = await file.resolve([], context);
  file.resolve.mockClear();
  file.resolve.mockResolvedValue(new Map([[unused.id, producers.get(original.id)!]]));
  return { draft, resolve: file.resolve };
}

describe('ProjectCanvasTransformSql', () => {
  it.each(['first', 'last'] as const)(
    'ignores an unused foreign physical predecessor placed %s in the protected node list',
    async (position) => {
      const base = buildDvtTerminalTransformPreviewDraft();
      const source = base.nodes.find((node) => node.role === 'input')!;
      const unused = globalThis.structuredClone(source);
      unused.id = 'unused-foreign-source';
      const ref = unused.metadata!.connectedSourceRef as {
        sourceObjectId: string;
        connectionRef: { connectionId: string };
      };
      ref.sourceObjectId = 'raw.unused';
      ref.connectionRef.connectionId = 'other-connection';
      unused.metadata!.tableName = 'unused';
      const draft: WorkspaceGraphAuthoringDraft = {
        ...base,
        nodes: position === 'first' ? [unused, ...base.nodes] : [...base.nodes, unused],
        nodeIds: [...base.nodeIds, unused.id],
        nodePositions: { ...base.nodePositions, [unused.id]: { x: 0, y: 200 } },
        edges: [
          ...base.edges,
          {
            id: 'unused-foreign-target',
            sourceId: unused.id,
            targetId: 'transform-orders',
            relation: 'lineage',
          },
        ],
      };
      const resolve = vi.fn<IDbtModelProducerResolver['resolve']>();
      const h = harness(draft, { resolve });
      const result = await h.query.execute(h.request, context);
      expect(result.sql).toContain('raw.orders');
      expect(result.provenance.sourceRefs.map((input) => input.sourceObjectId)).toEqual([
        'raw.orders',
      ]);
      expect(result.provenance.modelRefs).toBeUndefined();
      expect(resolve).not.toHaveBeenCalled();
    }
  );

  it('chooses a native file-only target connection from its consumed publication', async () => {
    const f = buildDbtInputPreviewFixture();
    const target = f.draft.nodes.find((node) => node.id === f.targetId)!;
    f.draft.nodes = f.draft.nodes.map((node) =>
      node.id === target.id
        ? withProducerDocument(
            node,
            selectDvtSubstraitRelation(producerDocument(node), f.modelRelationId)
          )
        : node
    );
    const physical = f.draft.nodes.find((node) => node.role === 'input')!;
    const ref = physical.metadata!.connectedSourceRef as {
      connectionRef: { connectionId: string };
    };
    ref.connectionRef.connectionId = 'other-connection';
    const resolve = vi
      .fn<IDbtModelProducerResolver['resolve']>()
      .mockResolvedValue(f.externalProducers);
    const h = harness(f.draft, { resolve });
    const result = await h.query.execute(h.request, context);
    expect(result.provenance.sourceRefs).toEqual([]);
    expect(result.provenance.modelRefs).toEqual(
      [...f.externalProducers.values()].map((producer) => producer.provenance)
    );
    expect(result.semanticPlanSha256).toBe(h.request.semanticPlanSha256);
  });

  it('does not resolve or claim an unused file predecessor of an admitted physical target', async () => {
    const f = await withUnusedFileProducer();
    const h = harness(f.draft, { resolve: f.resolve });
    const before = JSON.stringify(f.draft);
    const result = await h.query.execute(h.request, context);
    expect(f.resolve).not.toHaveBeenCalled();
    expect(result.provenance.modelRefs).toBeUndefined();
    expect(result.provenance.sourceRefs).toHaveLength(1);
    expect(result.sql).toContain('raw.orders');
    expect(result.sql).not.toContain('ventas_por_cliente');
    expect(JSON.stringify(f.draft)).toBe(before);
  });

  it('resolves a transitive consumed file through its native producer chain', async () => {
    const f = buildDbtInputPreviewFixture();
    const native = f.draft.nodes.find((node) => node.id === f.targetId)!;
    const consumer = consumerNode(native, 'final-model');
    const draft: WorkspaceGraphAuthoringDraft = {
      ...f.draft,
      nodes: [...f.draft.nodes, consumer],
      nodeIds: [...f.draft.nodeIds, consumer.id],
      nodePositions: { ...f.draft.nodePositions, [consumer.id]: { x: 600, y: 0 } },
      edges: [
        ...f.draft.edges,
        { id: 'native-final', sourceId: native.id, targetId: consumer.id, relation: 'lineage' },
      ],
    };
    const resolve = vi
      .fn<IDbtModelProducerResolver['resolve']>()
      .mockResolvedValue(f.externalProducers);
    const h = harness(draft, { resolve }, consumer.id);
    const result = await h.query.execute(h.request, context);
    expect(resolve.mock.calls[0]![0].map((node) => node.id)).toEqual([
      ...f.externalProducers.keys(),
    ]);
    expect(result.provenance.modelRefs).toEqual(
      [...f.externalProducers.values()].map((producer) => producer.provenance)
    );
    expect(result.sql).toContain('JOIN');
  });

  it('rejects an invalid unused predecessor edge before resolving file models', async () => {
    const f = await withUnusedFileProducer();
    f.draft.edges.push({
      id: 'invalid-source-input',
      sourceId: 'unused-file',
      targetId: 'source-orders',
      relation: 'lineage',
    });
    const h = harness(f.draft, { resolve: f.resolve });
    await expect(h.query.execute(h.request, context)).rejects.toMatchObject({
      reason: 'projection_unsupported',
    });
    expect(f.resolve).not.toHaveBeenCalled();
  });

  it('projects the real physical JOIN through the protected draft without a row probe or mutation', async () => {
    const draft = draftFixture(),
      before = JSON.stringify(draft),
      h = harness(draft);
    const result = await h.query.execute(h.request, context);
    expect(result).toMatchObject({
      schemaVersion: 'canvas-transform-sql-projection.v1',
      draftRevision: 'saved-revision',
      ...h.request,
    });
    expect(result.sql).toContain('JOIN');
    expect(result.provenance.sourceRefs).toHaveLength(2);
    expect(h.read).toHaveBeenCalledWith({
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'dev',
    });
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('supplies the authorized external publication required by a mixed file-model and physical JOIN', async () => {
    // The former browser lowering supplied only the signature and always rejected this graph.
    const f = await withFileProducer(),
      h = harness(f.draft, { resolve: f.resolve }),
      before = JSON.stringify(f.draft);
    const result = await h.query.execute(h.request, context);
    expect(result.sql).toContain('JOIN');
    expect(result.sql).toContain('raw.ventas_por_cliente');
    expect(result.provenance.sourceRefs).toHaveLength(1);
    expect(result.provenance.modelRefs).toEqual([
      {
        canvasId: 'file-owner',
        uniqueId: 'model.demo.ventas_por_cliente',
        contentSetSha256: 'b'.repeat(64),
        analysisSha256: 'c'.repeat(64),
      },
    ]);
    expect(f.resolve).toHaveBeenCalledOnce();
    expect(JSON.stringify(f.draft)).toBe(before);
  });

  it('rejects an obsolete expected plan before requesting a native model result', async () => {
    const f = await withFileProducer(),
      h = harness(f.draft, { resolve: f.resolve });
    await expect(
      h.query.execute(
        TransformSqlProjectionRequestSchema.parse({
          ...h.request,
          semanticPlanSha256: '0'.repeat(64),
        }),
        context
      )
    ).rejects.toMatchObject({ reason: 'canvas_changed' });
    expect(f.resolve).not.toHaveBeenCalled();
  });

  it('does not convert a failed or denied external publication to partial SQL', async () => {
    const f = await withFileProducer(),
      h = harness(f.draft, { resolve: f.resolve });
    f.resolve.mockRejectedValue(new Error('Scoped file-model access is unavailable.'));
    await expect(h.query.execute(h.request, context)).rejects.toMatchObject({
      reason: 'projection_unsupported',
    });
  });

  it('preserves typed file authorization refusal through the shared SQL preparation', async () => {
    const f = await withFileProducer(),
      h = harness(f.draft, { resolve: f.resolve });
    f.resolve.mockRejectedValue(new DbtModelProducerAccessDeniedError());
    await expect(h.query.execute(h.request, context)).rejects.toMatchObject({
      reason: 'file_access_denied',
    });
  });

  it('rejects the wrong Canvas and unknown target without a SQL result', async () => {
    const h = harness(draftFixture());
    await expect(
      h.query.execute({ ...h.request, canvasId: 'other' }, context)
    ).rejects.toMatchObject({ reason: 'canvas_changed' });
    await expect(
      h.query.execute({ ...h.request, transformNodeId: 'missing' }, context)
    ).rejects.toMatchObject({ reason: 'selection_unavailable' });
  });
});
