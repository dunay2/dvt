/** Prove SQL references retain actual identities and never treat labels as relations. */
import { TransformSqlProjectionResponseSchema } from '@dvt/contracts';
import { readDvtTransformAuthoringAuthority } from '../canvas/canvasDvtTransformAuthoringAuthority';
import { buildWorksheetCanvasLiteralProposal } from './worksheetCanvasModel.test-fixtures';
import { expect, it } from 'vitest';
import {
  buildSqlWorksheetModelInsertion,
  buildSqlWorksheetTableInsertion,
  materializeSqlWorksheetNode,
  quoteSqlWorksheetIdentifier,
  retainSqlWorksheetInsertions,
} from './sqlWorksheetInsertions';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import type { CanonicalNode } from '../../types/canonical';
import { hasPublishedCanvasExplorerDefinition } from '../canvas/explorer/canvasExplorerItems';

const connectionRef = {
  schemaVersion: 'connection-ref.v1' as const,
  connectionId: 'warehouse',
  provider: 'postgres',
};
const target = {
  connectionRef,
  canvasId: 'canvas/orders',
  nodeId: 'model/orders',
  semanticPlanSha256: 'a'.repeat(64),
};
const projection = TransformSqlProjectionResponseSchema.parse({
  schemaVersion: 'canvas-transform-sql-projection.v1',
  canvasId: target.canvasId,
  transformNodeId: target.nodeId,
  semanticPlanSha256: target.semanticPlanSha256,
  draftRevision: 'revision-7',
  sql: "SELECT ';' AS text FROM public.orders;",
  provenance: {
    sourceRefs: [
      { schemaVersion: 'connected-source-ref.v1', connectionRef, sourceObjectId: 'orders' },
    ],
  },
});

const literalSql = 'SELECT 1 AS comprobacion_editor_sql';
const literalProposal = buildWorksheetCanvasLiteralProposal(
  {
    schemaVersion: 'worksheet-canvas-model-request.v1',
    canvasId: target.canvasId,
    expectedRevision: projection.draftRevision,
    modelId: target.nodeId,
    name: 'Literal Model',
    connectionRef,
    sql: literalSql,
    models: [],
  },
  { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' }
);
if (literalProposal.status !== 'valid') throw new Error('Expected the published literal fixture.');
const literalNode = projectWorkspaceGraphAuthoringDraftSemanticGraph(literalProposal.draft)
  .canonicalNodes[0]!;
const literalPlan = readDvtTransformAuthoringAuthority(literalNode)!.semanticDocument.semanticPlan;
const literalQuery = {
  projectTransformSql: async () =>
    TransformSqlProjectionResponseSchema.parse({
      ...projection,
      semanticPlanSha256: literalPlan.sha256,
      sql: literalSql,
      provenance: {
        sourceRefs: [],
        literalModel: { connectionRef, semanticPlanSha256: literalPlan.sha256 },
      },
    }),
};
const warehouse = {
  id: connectionRef.connectionId,
  name: 'Warehouse',
  type: 'postgres',
  database: 'analytics',
} as const;

it('inserts a published literal Model using its projected connection', async () => {
  const result = await materializeSqlWorksheetNode(
    literalNode,
    target.canvasId,
    warehouse,
    literalQuery
  );
  expect(result).toMatchObject({
    kind: 'model',
    connectionRef,
    semanticPlanSha256: literalPlan.sha256,
  });
  expect(result.fragment).toContain(literalSql);
});

it('rejects a published literal Model when another connection is selected', async () => {
  await expect(
    materializeSqlWorksheetNode(
      literalNode,
      target.canvasId,
      { ...warehouse, id: 'foreign' },
      literalQuery
    )
  ).rejects.toThrow('The Model connection is unavailable.');
});

it.each([
  ['orders', '"orders"'],
  ['Mixed Case', '"Mixed Case"'],
  ['a"b; --', '"a""b; --"'],
])('quotes the exact SQL identifier %s', (name, expected) => {
  expect(quoteSqlWorksheetIdentifier(name)).toBe(expected);
});

it.each(['', '   ', 'bad\u0000name'])('rejects an unusable identifier %j', (name) => {
  expect(() => quoteSqlWorksheetIdentifier(name)).toThrow();
});

it('materializes a real table locator with its connection and exact quoted fragment', () => {
  const token = buildSqlWorksheetTableInsertion(connectionRef, {
    kind: 'relation',
    catalog: 'warehouse',
    schema: 'Sales"data',
    name: 'Order detail',
    relationType: 'table',
  });
  expect(token).toEqual({
    kind: 'table',
    connectionRef,
    schema: 'Sales"data',
    name: 'Order detail',
    fragment: '"Sales""data"."Order detail"',
  });
});

it('materializes authorized Model SQL instead of inventing a physical table from its label', () => {
  const token = buildSqlWorksheetModelInsertion(target, projection);
  expect(token).toMatchObject({ kind: 'model', ...target });
  expect(token.alias).toMatch(/^model_[a-f0-9]{16}$/u);
  expect(token.fragment).toBe(`(\nSELECT ';' AS text FROM public.orders\n) AS "${token.alias}"`);
  const revised = buildSqlWorksheetModelInsertion(target, { ...projection, sql: 'SELECT 2' });
  expect(revised.alias).toBe(token.alias);
});

it.each([
  { canvasId: 'another-canvas' },
  { transformNodeId: 'another-model' },
  { semanticPlanSha256: 'b'.repeat(64) },
])('rejects a stale Model projection %j', (changed) => {
  const stale = TransformSqlProjectionResponseSchema.parse({ ...projection, ...changed });
  expect(() => buildSqlWorksheetModelInsertion(target, stale)).toThrow();
});

it('rejects SQL projected against a different connection', () => {
  const foreign = {
    ...projection,
    provenance: {
      sourceRefs: [
        {
          schemaVersion: 'connected-source-ref.v1' as const,
          connectionRef: { ...connectionRef, connectionId: 'foreign' },
          sourceObjectId: 'orders',
        },
      ],
    },
  };
  expect(() => buildSqlWorksheetModelInsertion(target, foreign)).toThrow();
});

it('retains provenance only while its exact materialized fragment remains in the buffer', () => {
  const token = buildSqlWorksheetModelInsertion(target, projection);
  expect(retainSqlWorksheetInsertions(`SELECT * FROM ${token.fragment}`, [token])).toEqual([token]);
  expect(retainSqlWorksheetInsertions('SELECT * FROM another_source', [token])).toEqual([]);
});

it.each([undefined, { sql: 'SELECT 1' }])(
  'does not offer an unpublished draft or legacy SQL label for dragging: %j',
  (metadata) => {
    const draft: CanonicalNode = {
      id: 'draft',
      name: 'Model4',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata,
    };
    expect(hasPublishedCanvasExplorerDefinition(draft)).toBe(false);
  }
);
