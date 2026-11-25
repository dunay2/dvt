/** Actual compiler and publication resolution with isolated scoped IO fixtures. */
import {
  ConnectedSourceRefSchema,
  DvtTransformAuthoringAuthorityV1Schema,
  TransformSqlProjectionRequestSchema,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WorksheetCanvasModelRequestSchema,
  WorkspaceDbtModelReferenceSchema,
  type WorksheetCanvasModelRequest,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { PlannerFacade } from '@dvt/planner';
import {
  projectExternalProducerAst,
  renderPostgresAst,
  sourceFieldType,
} from '@dvt/postgres-projection';
import { createExternalProducerSignature } from '@dvt/substrait-analysis';
import { vi, type Mock } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  type IAccessDecisionService,
} from '../../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../../src/application/ports/authContract.js';
import type {
  DbtModelProducer,
  IDbtModelProducerResolver,
} from '../../../src/application/ports/dbtModelProducer.js';
import type { WarehouseConnectionCatalogEntry } from '../../../src/application/ports/warehouseSourceImport.js';
import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftStoredRecord,
} from '../../../src/application/ports/workspaceGraphDraft.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { parsePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';
import { ProposeWorksheetCanvasModel } from '../../../src/application/services/proposeWorksheetCanvasModel.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { ResolveCanvasModelSqlInputs } from '../../../src/application/services/resolveCanvasModelSqlInputs.js';
import { ResolveCanvasModelSqlPhysicalInput } from '../../../src/application/services/resolveCanvasModelSqlPhysicalInput.js';
import { ResolveCanvasTransformProjection } from '../../../src/application/services/resolveCanvasTransformProjection.js';
import { buildDvtJoinPreviewDraft } from '../../fixtures/dvtJoinPreviewFixture.js';

import { modelSqlHarness, modelSqlPhysicalHarness, sqlAuth } from './canvasModelSql.fixtures.js';

type FixtureRecord = WorkspaceGraphDraftStoredRecord & {
  draftPayload: WorkspaceGraphAuthoringDraft;
};
type FixtureAuthority = Readonly<{
  decide: Mock<IAccessDecisionService['decide']>;
  authorizer: AuthorizeCommandScopeService;
  authorityPolicy: ReturnType<typeof modelSqlHarness>['authorityPolicy'];
  projection: ReturnType<typeof modelSqlHarness>['projection'];
}>;
export type WorksheetCanvasHarness = FixtureAuthority & {
  query: ProposeWorksheetCanvasModel;
  input: WorksheetCanvasModelRequest;
  context: AuthorizedExecutionContext;
  draft: WorkspaceGraphAuthoringDraft;
  record: FixtureRecord;
  read: Mock<() => Promise<FixtureRecord>>;
  save: Mock<IWorkspaceGraphDraftStore['save']>;
  getConnection: Mock<() => Promise<WarehouseConnectionCatalogEntry>>;
  catalog: { execute: ReturnType<typeof modelSqlPhysicalHarness>['execute'] };
  modelProducers: { resolve: Mock<IDbtModelProducerResolver['resolve']> };
  connection: WarehouseConnectionCatalogEntry;
  physical: ReturnType<typeof modelSqlPhysicalHarness>;
};

function worksheetFixtureRecord(): { draft: WorkspaceGraphAuthoringDraft; record: FixtureRecord } {
  const draft: WorkspaceGraphAuthoringDraft = {
    canvas: { id: 'canvas-sql', kind: 'project', title: 'SQL Canvas' },
    activeCanvasId: 'canvas-sql',
    nodes: [],
    edges: [],
    nodeIds: [],
    nodePositions: {},
  };
  const record = {
    scope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
    schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
    revision: 'r1',
    draftPayload: draft,
    updatedAt: '2026-11-25T00:00:00.000Z',
  };
  return { draft, record };
}

function worksheetFixtureAuthorization(): FixtureAuthority {
  const decide = vi.fn<IAccessDecisionService['decide']>(async (_principal, requested) => ({
    ok: true as const,
    approvedScope: requested,
  }));
  const authorizer = new AuthorizeCommandScopeService(
    { decide, decideMany: vi.fn() },
    { record: vi.fn() },
    () => new Date('2026-11-25')
  );
  return {
    decide,
    authorizer,
    authorityPolicy: modelSqlHarness().authorityPolicy,
    projection: modelSqlHarness().projection,
  };
}

export function worksheetCanvasHarness(): WorksheetCanvasHarness {
  const physical = modelSqlPhysicalHarness();
  const connected = ConnectedSourceRefSchema.parse(physical.node.metadata?.connectedSourceRef);
  const { draft, record } = worksheetFixtureRecord();
  const { decide, authorizer, authorityPolicy, projection } = worksheetFixtureAuthorization();
  const read = vi.fn(async () => record);
  const save = vi.fn<IWorkspaceGraphDraftStore['save']>(async () => {
    throw new Error('A proposal must never write the store');
  });
  const connection = {
    id: connected.connectionRef.connectionId,
    name: 'Warehouse',
    database: 'analytics',
    type: 'postgres' as const,
    sourceObjects: [],
  };
  const getConnection = vi.fn(async () => connection);
  const catalog = { execute: physical.execute };
  const modelProducers = {
    resolve: vi.fn<IDbtModelProducerResolver['resolve']>(async () => new Map()),
  };
  const inputs = new ResolveCanvasModelSqlInputs({
    physical: new ResolveCanvasModelSqlPhysicalInput({ catalog, authorizer }),
    projection,
    modelProducers,
  });
  const query = new ProposeWorksheetCanvasModel({
    store: { read },
    authorizer,
    authorityPolicy,
    connectionCatalog: { getConnection },
    catalog,
    projection,
    modelProducers,
    inputs,
  });
  const input = WorksheetCanvasModelRequestSchema.parse({
    schemaVersion: 'worksheet-canvas-model-request.v1',
    canvasId: draft.canvas.id,
    expectedRevision: 'r1',
    modelId: 'model-orders',
    name: 'Order IDs',
    connectionRef: connected.connectionRef,
    sql: 'SELECT order_id FROM raw.orders',
    models: [],
  });
  const context = { ...sqlAuth, action: AUTHORIZATION_ACTION.workspaceGraphDraftSave };
  return {
    query,
    input,
    context,
    draft,
    record,
    read,
    save,
    decide,
    authorizer,
    getConnection,
    catalog,
    authorityPolicy,
    projection,
    modelProducers,
    connection,
    physical,
  };
}

export async function nativeWorksheetModelHarness(): Promise<
  WorksheetCanvasHarness & { producerId: string }
> {
  const h = worksheetCanvasHarness();
  const native = buildDvtJoinPreviewDraft(2);
  Object.assign(h.draft, native, {
    canvas: { ...native.canvas, id: h.input.canvasId },
    activeCanvasId: h.input.canvasId,
  });
  const store: IWorkspaceGraphDraftStore = {
    read: h.read,
    save: h.save,
    migrate: vi.fn(),
    close: vi.fn(),
  };
  const projection = new ResolveCanvasTransformProjection({
    graphDraftResolver: new ResolveAuthorizedExecutableSubgraphService({
      planner: new PlannerFacade(),
      workspaceGraphDraftStore: store,
    }),
  });
  h.projection.execute.mockImplementation((input, context) => projection.execute(input, context));
  const nodeId = 'transform-orders';
  const semanticPlanSha256 = DvtTransformAuthoringAuthorityV1Schema.parse(
    h.draft.nodes.find((node) => node.id === nodeId)!.metadata?.['transformAuthoring']
  ).semanticDocument.semanticPlan.sha256;
  const target = TransformSqlProjectionRequestSchema.parse({
    canvasId: h.input.canvasId,
    transformNodeId: nodeId,
    semanticPlanSha256,
  });
  const actual = await projection.execute(target, h.context);
  const column = actual.projection.outputs[0]!.name;
  const alias = 'model_orders';
  const input = WorksheetCanvasModelRequestSchema.parse({
    ...h.input,
    sql: `SELECT "${column}" FROM (\n${actual.projection.sql}\n) AS ${alias}`,
    models: [
      { kind: 'native-model', canvasId: h.input.canvasId, nodeId, semanticPlanSha256, alias },
    ],
  });
  return { ...h, input, producerId: nodeId };
}

export async function fileWorksheetModelHarness(): Promise<
  WorksheetCanvasHarness & { producer: DbtModelProducer }
> {
  const h = worksheetCanvasHarness();
  const reference = WorkspaceDbtModelReferenceSchema.parse({
    schemaVersion: 'workspace-dbt-model-reference.v1',
    canvasId: 'dbt-project',
    uniqueId: 'model.demo.orders',
    relationId: 'dbt-orders',
    connectionRef: h.input.connectionRef,
    fields: [{ fieldId: 'dbt-order-id', name: 'order_id', dataType: 'text', nullable: true }],
  });
  const document = createExternalProducerSignature({
    relationId: reference.relationId,
    names: [reference.canvasId, reference.uniqueId],
    fields: reference.fields.map((field) => ({ ...field, type: sourceFieldType('string', true) })),
  });
  const parsed = await parsePostgresTransformSqlStructure('SELECT order_id FROM raw.orders');
  if (parsed.status !== 'valid') throw new Error('Expected valid fixture SQL');
  const projection = projectExternalProducerAst(document, parsed.ast);
  const canonical = await parsePostgresTransformSqlStructure(
    await renderPostgresAst(projection.ast)
  );
  if (canonical.status !== 'valid') throw new Error('Expected canonical producer SQL');
  const producer = {
    document,
    connection: reference.connectionRef,
    projection,
    provenance: {
      canvasId: reference.canvasId,
      uniqueId: reference.uniqueId,
      contentSetSha256: 'b'.repeat(64),
      analysisSha256: 'c'.repeat(64),
    },
  };
  h.modelProducers.resolve.mockImplementation(
    async (nodes) => new Map(nodes.map((node) => [node.id, producer]))
  );
  const input = WorksheetCanvasModelRequestSchema.parse({
    ...h.input,
    sql: `SELECT order_id FROM (\n${canonical.canonicalSql}\n) AS dbt_orders`,
    models: [
      {
        kind: 'dbt-model',
        reference,
        projectRevisionSha256: producer.provenance.contentSetSha256,
        analysisSha256: producer.provenance.analysisSha256,
        alias: 'dbt_orders',
        binding: { kind: 'compiled', sqlSha256: sha256HexUtf8(canonical.canonicalSql) },
      },
    ],
  });
  return { ...h, input, producer };
}
