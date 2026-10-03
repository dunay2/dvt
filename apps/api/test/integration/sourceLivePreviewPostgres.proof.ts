/** Prove repeated LIVE reads observe provider changes in the terminal runner's disposable lease. */
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import { Client } from 'pg';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import { PreviewWarehouseSourceObjectRowsUseCase } from '../../src/application/services/previewWarehouseSourceObjectRowsUseCase.js';
import { WorkspaceWarehouseConnectionProbe } from '../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';

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
