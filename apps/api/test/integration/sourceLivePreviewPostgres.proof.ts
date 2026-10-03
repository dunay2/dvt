/** Prove repeated LIVE reads observe provider changes in the terminal runner's disposable lease. */
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { ConnectedSourceRefSchema } from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../src/application/ports/accessDecision.js';
import { PreviewCanvasTransformRowsUseCase } from '../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { PreviewWarehouseSourceObjectRowsUseCase } from '../../src/application/services/previewWarehouseSourceObjectRowsUseCase.js';
import { TenantId, ProjectId, EnvironmentId } from '../../src/domain/auth/types.js';
import { PostgresCanvasTransformDataSampleProbe } from '../../src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';
import { WorkspaceWarehouseConnectionProbe } from '../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';
import { producerDocument, withProducerDocument } from '../fixtures/dvtProducerPreviewFixture.js';
import { buildDvtTerminalTransformPreviewDraft } from '../fixtures/workspaceGraphDraftFixture.js';

const databaseUrl = process.env['DVT_SOURCE_LIVE_PROOF_DATABASE_URL'];
if (databaseUrl == null)
  throw new Error('Source LIVE proof requires its disposable PostgreSQL lease.');
const parsed = new URL(databaseUrl);
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
  !/^\/dvt_proof_[a-z0-9_]+$/.test(parsed.pathname)
) {
  throw new Error('Source LIVE proof refuses a non-disposable database.');
}
const database = decodeURIComponent(parsed.pathname.slice(1));
const schema = `source_live_${randomUUID().replaceAll('-', '')}`;
const client = new Client({ connectionString: databaseUrl });
let created = false;

beforeAll(async () => {
  await client.connect();
  await client.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  await client.query(`CREATE TABLE "${schema}".items (customer text)`);
  await client.query(`INSERT INTO "${schema}".items VALUES ('before'), ('before'), ('before')`);
});

it('refreshes a projected Transform from PostgreSQL without acquiring or publishing data', async () => {
  await client.query(`CREATE TABLE "${schema}".orders (order_id integer)`);
  await client.query(`INSERT INTO "${schema}".orders VALUES (1), (1), (1)`);
  const draft = buildDvtTerminalTransformPreviewDraft();
  const source = draft.nodes[0]!;
  const transform = draft.nodes[1]!;
  const ref = ConnectedSourceRefSchema.parse({
    ...ConnectedSourceRefSchema.parse(source.metadata!.connectedSourceRef),
    sourceObjectId: `relation/${database}/${schema}/orders`,
  });
  const document = producerDocument(transform);
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
    throw new Error('Expected fixture Project.');
  const read = root.value.input.relType.value.input?.relType;
  if (read?.case !== 'read' || read.value.readType.case !== 'namedTable')
    throw new Error('Expected fixture Read.');
  read.value.readType.value.names = [schema, 'orders'];
  const current = withProducerDocument(transform, {
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((relation) =>
        relation.sourceRef == null ? relation : { ...relation, sourceRef: ref }
      ),
    },
  });
  draft.nodes = [
    { ...source, metadata: { ...source.metadata, schema, connectedSourceRef: ref } },
    current,
  ];
  const query = new PreviewCanvasTransformRowsUseCase({
    graphDraftResolver: {
      executeWithAuthorizedDraft: async () => ({
        ok: true,
        value: {
          nodeIds: draft.nodeIds,
          edgeIds: draft.edges.map((edge) => edge.id),
          authorizedDraft: { draft, revision: 'proof-revision' },
        },
      }),
    } as never,
    connectionCatalog: {
      getConnection: async () => ({
        id: ref.connectionRef.connectionId,
        name: 'Proof',
        type: 'postgres',
        database,
        credentialRef: 'postgres:transform-live-proof',
        sourceObjects: [],
      }),
    } as never,
    probe: new PostgresCanvasTransformDataSampleProbe({
      credentialResolver: { resolveCredential: async () => databaseUrl },
      now: () => new Date(),
    }),
  });
  const context = {
    principal: {
      principalId: 'proof',
      subjectId: 'proof',
      issuer: 'proof',
      audience: 'proof',
      principalType: 'user' as const,
      expiresAt: new Date('2030-01-01'),
      rawScopes: [],
      assertedTenantIds: ['proof'],
      assertedProjectIds: ['proof'],
    },
    scope: buildEnvironmentAccessScope(
      TenantId.unsafe('proof'),
      ProjectId.unsafe('proof'),
      EnvironmentId.unsafe('test')
    ),
    action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
    requestId: 'transform-live-proof',
    authorizedAt: new Date(),
  };
  const input = { canvasId: draft.canvas.id!, transformNodeId: transform.id, limit: 2 };
  const before = await query.execute(input, context);
  expect(before.rows).toEqual([{ values: ['1'] }, { values: ['1'] }]);
  expect(before.truncated).toBe(true);
  expect(before.provenance).toMatchObject({
    mode: 'live',
    sourceRefs: [ref],
    limit: 2,
    navigation: 'bounded-first-page',
  });
  await client.query(`UPDATE "${schema}".orders SET order_id = 2`);
  const after = await query.execute(input, context);
  expect(after.rows).toEqual([{ values: ['2'] }, { values: ['2'] }]);
  expect(Date.parse(after.provenance.queriedAt)).toBeGreaterThanOrEqual(
    Date.parse(before.provenance.queriedAt)
  );
  await client.query(`TRUNCATE "${schema}".orders`);
  const empty = await query.execute(input, context);
  expect(empty.rows).toEqual([]);
  expect(empty.columns.map((column) => column.name)).toEqual(['order_id']);
  expect(empty.provenance.sourceRefs).toEqual([ref]);
});
afterAll(async () => {
  try {
    if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
});

it('returns new LIVE rows after a provider change and preserves facts for empty results', async () => {
  const connection = {
    id: 'proof-source',
    name: 'Proof',
    type: 'postgres' as const,
    database,
    credentialRef: 'postgres:source-live-proof',
    sourceObjects: [],
  };
  const catalog = {
    listConnections: vi.fn(),
    listSourceObjects: vi.fn(),
    createConnection: vi.fn(),
    renameConnection: vi.fn(),
    getConnection: vi.fn(async () => connection),
  };
  const probe = new WorkspaceWarehouseConnectionProbe({
    credentialResolver: { resolveCredential: async () => databaseUrl },
    now: () => new Date(),
  });
  const query = new PreviewWarehouseSourceObjectRowsUseCase(catalog, probe);
  const input = {
    scope: { tenantId: 'proof', projectId: 'proof', environmentId: 'test' },
    connectionId: connection.id,
    objectId: `relation/${database}/${schema}/items`,
    limit: 2,
  };
  const before = await query.execute(input);
  expect(before.rows).toEqual([{ values: ['before'] }, { values: ['before'] }]);
  expect(before.truncated).toBe(true);
  expect(before.provenance).toMatchObject({
    mode: 'live',
    limit: 2,
    navigation: 'bounded-first-page',
    sourceRefs: [
      {
        connectionRef: { connectionId: connection.id, provider: 'postgres' },
        sourceObjectId: input.objectId,
      },
    ],
  });

  await client.query(`UPDATE "${schema}".items SET customer = 'after'`);
  const refreshed = await query.execute(input);
  expect(refreshed.rows).toEqual([{ values: ['after'] }, { values: ['after'] }]);
  expect(Date.parse(refreshed.provenance.queriedAt)).toBeGreaterThanOrEqual(
    Date.parse(before.provenance.queriedAt)
  );
  expect(before.rows[0]?.values).toEqual(['before']);

  await client.query(`TRUNCATE "${schema}".items`);
  const empty = await query.execute(input);
  expect(empty.rows).toEqual([]);
  expect(empty.columns.map((column) => column.name)).toEqual(['customer']);
  expect(empty.truncated).toBe(false);
  expect(empty.provenance.sourceRefs).toEqual(before.provenance.sourceRefs);
  expect(empty.provenance.mode).toBe('live');
  expect(catalog.getConnection).toHaveBeenCalledTimes(3);
  expect(catalog.getConnection).toHaveBeenLastCalledWith(input.scope, input.connectionId);
});
