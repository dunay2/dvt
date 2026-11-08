import {
  DvtTransformAuthoringAuthorityV1Schema,
  TransformSqlProjectionRequestSchema,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  type TransformSqlProjectionRequest,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { projectExternalProducerAst } from '@dvt/postgres-projection';
import { createExternalProducerSignature, indexSubstraitRelations } from '@dvt/substrait-analysis';
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
import { buildDvtJoinPreviewDraft } from '../../fixtures/dvtJoinPreviewFixture.js';
import {
  producerDocument,
  withProducerDocument,
} from '../../fixtures/dvtProducerPreviewFixture.js';

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
  modelProducers?: IDbtModelProducerResolver
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
  const transform = draft.nodes.find((node) => node.id === 'transform-orders')!;
  const semanticPlanSha256 = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform.metadata?.transformAuthoring
  ).semanticDocument.semanticPlan.sha256;
  return {
    query,
    read,
    request: TransformSqlProjectionRequestSchema.parse({
      canvasId: 'canvas-joins',
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
  const resolve = vi
    .fn<IDbtModelProducerResolver['resolve']>()
    .mockResolvedValue(
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

describe('ProjectCanvasTransformSql', () => {
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
