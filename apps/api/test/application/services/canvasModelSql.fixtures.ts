/** Scoped SQL authoring fixtures use real saved graph and publication contracts. */
import {
  buildRelationalSourceObjectId,
  ConnectedSourceRefSchema,
  SourceObjectCatalogResponseSchema,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  type CanvasAuthoringAuthorityResolution,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import type { IAccessDecisionService } from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import type { IDbtModelProducerResolver } from '../../../src/application/ports/dbtModelProducer.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import type { CanvasLiteralConnectionAuthority } from '../../../src/application/services/canvasLiteralModelConnection.js';
import { physicalModelSqlPublication } from '../../../src/application/services/canvasModelSqlPublications.js';
import { ProjectCanvasModelSqlContextQuery } from '../../../src/application/services/projectCanvasModelSqlContextQuery.js';
import { ResolveCanvasModelSqlInputs } from '../../../src/application/services/resolveCanvasModelSqlInputs.js';
import { ResolveCanvasModelSqlPhysicalInput } from '../../../src/application/services/resolveCanvasModelSqlPhysicalInput.js';
import type { ResolveCanvasTransformProjection } from '../../../src/application/services/resolveCanvasTransformProjection.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { buildDvtJoinPreviewDraft } from '../../fixtures/dvtJoinPreviewFixture.js';

export const sqlTarget = { canvasId: 'canvas-sql', transformNodeId: 'transform-orders' };
export const sqlAuth: AuthorizedExecutionContext = {
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
    EnvironmentId.unsafe('dev')
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'sql-test',
  authorizedAt: new Date('2026-11-17'),
};

type SqlRecord = {
  scope: { tenantId: string; projectId: string; environmentId: string };
  schemaVersion: string;
  revision: string;
  draftPayload: WorkspaceGraphAuthoringDraft;
  updatedAt: string;
};
export type ModelSqlHarness = {
  draft: WorkspaceGraphAuthoringDraft;
  record: SqlRecord;
  store: { read: Mock<() => Promise<SqlRecord>> };
  authorityPolicy: {
    resolveGraphDraftReadAuthority: Mock<() => Promise<CanvasAuthoringAuthorityResolution>>;
  };
  projection: { execute: Mock<ResolveCanvasTransformProjection['execute']> };
  modelProducers: { resolve: Mock<IDbtModelProducerResolver['resolve']> };
  query: ProjectCanvasModelSqlContextQuery;
};

function modelSqlLiteralAuthority(
  draft: WorkspaceGraphAuthoringDraft
): CanvasLiteralConnectionAuthority {
  const source = draft.nodes.find((node) => node.role === 'input');
  const reference = ConnectedSourceRefSchema.parse(source?.metadata?.connectedSourceRef);
  const decide = vi.fn<IAccessDecisionService['decide']>(async (_principal, requested) => ({
    ok: true,
    approvedScope: requested,
  }));
  return {
    authorizer: new AuthorizeCommandScopeService(
      { decide, decideMany: async () => [] },
      { record: vi.fn() },
      () => new Date('2026-11-17')
    ),
    connectionCatalog: {
      getConnection: async () => ({
        id: reference.connectionRef.connectionId,
        name: 'Fixture warehouse',
        database: 'analytics',
        type: 'postgres',
        sourceObjects: [],
      }),
    },
  };
}

export function modelSqlHarness(): ModelSqlHarness {
  const original = buildDvtJoinPreviewDraft(2);
  const draft: WorkspaceGraphAuthoringDraft = {
    ...original,
    canvas: { ...original.canvas, id: sqlTarget.canvasId },
    nodes: original.nodes.map((node) =>
      node.id === sqlTarget.transformNodeId
        ? { ...node, metadata: {} }
        : {
            ...node,
            metadata: {
              ...node.metadata,
              columns: (node.metadata?.columns as { name: string; type: string }[]).map(
                (column) => ({ ...column, nullable: true })
              ),
            },
          }
    ),
  };
  const record = {
    scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    revision: 'r1',
    draftPayload: draft,
    updatedAt: '2026-11-17T00:00:00Z',
  };
  const store = { read: vi.fn(async () => record) };
  const authorityPolicy = {
    resolveGraphDraftReadAuthority: vi.fn(
      async (): Promise<CanvasAuthoringAuthorityResolution> => ({
        kind: 'resolved',
        binding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: sqlTarget.canvasId,
          authority: { kind: 'graph-draft' },
        },
      })
    ),
  };
  const projection = { execute: vi.fn<ResolveCanvasTransformProjection['execute']>() };
  const modelProducers = {
    resolve: vi.fn<IDbtModelProducerResolver['resolve']>(async () => new Map()),
  };
  const inputs = new ResolveCanvasModelSqlInputs({
    projection,
    modelProducers,
    physical: { execute: async (node) => physicalModelSqlPublication(node) },
  });
  const query = new ProjectCanvasModelSqlContextQuery({
    store,
    authorityPolicy,
    inputs,
    ...modelSqlLiteralAuthority(draft),
  });
  return { draft, record, store, authorityPolicy, projection, modelProducers, query };
}

export function modelSqlPhysicalHarness(allowed = true): {
  node: WorkspaceGraphAuthoringDraft['nodes'][number];
  reader: ResolveCanvasModelSqlPhysicalInput;
  page: ReturnType<typeof SourceObjectCatalogResponseSchema.parse>;
  execute: Mock<() => Promise<ReturnType<typeof SourceObjectCatalogResponseSchema.parse>>>;
  decide: Mock<IAccessDecisionService['decide']>;
} {
  const h = modelSqlHarness();
  const node = h.draft.nodes[0]!;
  const locator = {
    kind: 'relation' as const,
    catalog: 'analytics',
    schema: 'raw',
    name: 'orders',
    relationType: 'table' as const,
  };
  const objectId = buildRelationalSourceObjectId(locator);
  const ref = node.metadata?.['connectedSourceRef'];
  if (ref == null || typeof ref !== 'object') throw new Error('Expected connected fixture Source.');
  node.metadata = {
    ...node.metadata,
    schema: locator.schema,
    tableName: locator.name,
    connectedSourceRef: { ...ref, sourceObjectId: objectId },
    columns: [{ name: 'order_id', type: 'text' }],
  };
  const page = SourceObjectCatalogResponseSchema.parse({
    kind: 'object-page',
    truncated: false,
    objects: [
      {
        objectId,
        displayName: 'orders',
        locator,
        columns: [
          { name: 'order_id', type: 'text', nullable: false },
          { name: 'not_imported', type: 'text', nullable: true },
        ],
        metricEvidence: {
          observedAt: '2026-11-17T00:00:00.000Z',
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: 0,
            provenance: 'estimated',
            method: 'provider-statistics',
            confidence: 'low',
          },
          byteSize: {
            value: 0,
            provenance: 'estimated',
            method: 'schema-width',
            confidence: 'low',
            basis: 'provider-row-storage',
          },
        },
      },
    ],
  });
  const execute = vi.fn(async () => page);
  const decide = vi.fn<IAccessDecisionService['decide']>(async (_principal, requested) =>
    allowed ? { ok: true, approvedScope: requested } : { ok: false, reason: 'ACTION_NOT_GRANTED' }
  );
  const reader = new ResolveCanvasModelSqlPhysicalInput({
    catalog: { execute },
    authorizer: new AuthorizeCommandScopeService(
      { decide, decideMany: async () => [] },
      { record: vi.fn() },
      () => new Date('2026-11-17')
    ),
  });
  return { node, execute, decide, reader, page };
}
