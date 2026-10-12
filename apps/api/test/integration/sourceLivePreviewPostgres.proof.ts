/**
 * Owned concern: prove provider reads and publication identity in the disposable LIVE lease.
 * @baseline ADR-0066: stable-table rows and publication markers commit atomically.
 * @decision Exercise the real publisher and sample probe across a deterministic read barrier.
 * @consequence An in-flight old sample stays consistent; a later old-token request fails closed.
 * @version 1.0.0
 */
import { randomUUID } from 'node:crypto';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL } from 'node:url';

import { PostgresDvtPublicationCapability } from '@dvt/adapter-postgres';
import {
  buildRelationalSourceObjectId,
  ConnectedSourceRefSchema,
  createDvtPostgresOutputSchemaDigestV1,
} from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../src/application/ports/accessDecision.js';
import { WarehouseSourcePublicationChangedError } from '../../src/application/ports/warehouseSourceImport.js';
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

it('rejects a mismatched declared database across inspection, test, discovery and Preview', async () => {
  const probe = new WorkspaceWarehouseConnectionProbe({
    credentialResolver: { resolveCredential: async () => databaseUrl },
    now: () => new Date(),
  });
  const target = {
    connectionId: 'proof',
    id: 'proof',
    name: 'Proof',
    type: 'postgres' as const,
    database: 'wrong_binding',
    credentialRef: 'postgres:source-live-proof',
    sourceObjects: [],
    scope: { tenantId: 'proof', projectId: 'proof', environmentId: 'dev' },
  };
  expect(await probe.inspectConnection(target)).toMatchObject({
    status: 'failed',
    reason: 'invalid_credentials',
  });
  expect(await probe.testConnection(target)).toMatchObject({
    status: 'failed',
    reason: 'invalid_credentials',
  });
  await expect(
    probe.listSourceObjectCatalog(target, { kind: 'schema-list', limit: 10 })
  ).rejects.toMatchObject({ reason: 'invalid_credentials' });
  await expect(
    probe.listSourceObjectCatalog(target, {
      kind: 'schema-page',
      catalog: target.database,
      schema,
      limit: 10,
    })
  ).rejects.toMatchObject({ reason: 'invalid_credentials' });
  await expect(
    probe.previewSourceObjectRows({
      ...target,
      objectId: `relation/${target.database}/${schema}/items`,
      limit: 20,
    })
  ).rejects.toMatchObject({ reason: 'invalid_credentials' });
  const unchanged = await client.query(`SELECT count(*)::int AS rows FROM "${schema}".items`);
  expect(unchanged.rows).toEqual([{ rows: 3 }]);
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

it('keeps marker and rows in one snapshot while a real publisher replaces A with B', async () => {
  const relation = 'publication_race';
  const tokenA = 'a'.repeat(64);
  const tokenB = 'b'.repeat(64);
  const publisher = new PostgresDvtPublicationCapability({
    connectionString: databaseUrl,
    statementTimeoutMs: 2_000,
    queryTimeoutMs: 3_000,
  });
  const publication = {
    target: {
      schemaVersion: 'dvt-transform-result-target.v1' as const,
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'proof-publication',
        provider: 'postgres' as const,
      },
      schema,
      relation,
    },
    expectedSchemaDigestSha256: createDvtPostgresOutputSchemaDigestV1({
      schemaVersion: 'dvt-postgres-output-schema.v1',
      columns: [
        {
          ordinal: 0,
          name: 'customer',
          postgresType: 'text',
          nullable: true,
          defaultExpression: null,
          generatedExpression: null,
          collation: null,
        },
      ],
      constraints: [],
      indexes: [],
    }),
  };
  const probe = new WorkspaceWarehouseConnectionProbe({
    credentialResolver: { resolveCredential: async () => databaseUrl },
    now: () => new Date(),
  });
  const input = {
    type: 'postgres' as const,
    database,
    credentialRef: 'postgres:source-live-proof',
    objectId: buildRelationalSourceObjectId({
      kind: 'relation',
      relationType: 'table',
      catalog: database,
      schema,
      name: relation,
    }),
    limit: 20,
  };
  let markerRead!: () => void;
  const observedMarker = new Promise<void>((resolve) => {
    markerRead = resolve;
  });
  let resumeSample!: () => void;
  const sampleBarrier = new Promise<void>((resolve) => {
    resumeSample = resolve;
  });
  let readingA: ReturnType<typeof probe.previewSourceObjectRows> | undefined;
  let markerTimeout: ReturnType<typeof setTimeout> | undefined;
  const originalQuery = Client.prototype.query;
  const querySpy = vi.spyOn(Client.prototype, 'query');
  querySpy.mockImplementation(function (this: Client, ...args: unknown[]): unknown {
    const result: unknown = Reflect.apply(originalQuery, this, args);
    const [text, parameters] = args;
    if (
      typeof text === 'string' &&
      text.includes('obj_description') &&
      Array.isArray(parameters) &&
      parameters.length === 3 &&
      parameters[0] === database &&
      parameters[1] === schema &&
      parameters[2] === relation &&
      result instanceof Promise
    ) {
      return result.then(async (rows: unknown) => {
        markerRead();
        await sampleBarrier;
        return rows;
      });
    }
    return result;
  } as typeof originalQuery);

  try {
    await publisher.publish({
      ...publication,
      sql: "SELECT 'A'::text AS customer",
      publicationToken: tokenA,
      expectedPredecessorToken: null,
    });
    readingA = probe.previewSourceObjectRows({ ...input, expectedPublicationToken: tokenA });
    await Promise.race([
      observedMarker,
      readingA.then(() => {
        throw new Error('Sample completed without observing its marker.');
      }),
      new Promise<never>((_, reject) => {
        markerTimeout = setTimeout(
          () => reject(new Error('Publication marker was not observed.')),
          2_000
        );
      }),
    ]);
    clearTimeout(markerTimeout);
    await expect(
      publisher.publish({
        ...publication,
        sql: "SELECT 'B'::text AS customer",
        publicationToken: tokenB,
        expectedPredecessorToken: tokenA,
      })
    ).resolves.toMatchObject({ publicationOutcome: 'replaced', predecessorToken: tokenA });
    resumeSample();
    expect((await readingA).rows).toEqual([{ values: ['A'] }]);
    await expect(
      probe.previewSourceObjectRows({ ...input, expectedPublicationToken: tokenA })
    ).rejects.toBeInstanceOf(WarehouseSourcePublicationChangedError);
    expect(
      (await probe.previewSourceObjectRows({ ...input, expectedPublicationToken: tokenB })).rows
    ).toEqual([{ values: ['B'] }]);
  } finally {
    resumeSample();
    clearTimeout(markerTimeout);
    try {
      await readingA;
    } finally {
      querySpy.mockRestore();
      await publisher.close();
    }
  }
});
