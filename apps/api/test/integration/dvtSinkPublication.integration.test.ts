/** Proves protected Sink lowering publishes through the real stable-table PostgreSQL capability. */
import { createRequire } from 'node:module';

import { PostgresDvtPublicationCapability } from '@dvt/adapter-postgres';
import { resolveDvtPostgresPublication } from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { publicationHarness } from '../fixtures/dvtProjectionPublicationHarness.js';
import { buildDvtSinkPublicationDraft } from '../fixtures/dvtSinkPublicationFixture.js';

type DatabaseLease = { readonly url: string; dispose(): Promise<void> };
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../scripts/disposable-postgres-database.cjs'
) as {
  allocateDisposablePostgresDatabase(url: string, label: string): Promise<DatabaseLease>;
};
const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const suite = databaseUrl === undefined ? describe.skip : describe;

suite('Explicit Sink PostgreSQL publication', () => {
  let lease: DatabaseLease;
  let client: Client;
  let capability: PostgresDvtPublicationCapability;
  beforeAll(async () => {
    lease = await allocateDisposablePostgresDatabase(databaseUrl!, 'sink');
    client = new Client({ connectionString: lease.url });
    await client.connect();
    await client.query('CREATE SCHEMA raw; CREATE SCHEMA analytics');
    await client.query(
      'CREATE TABLE raw.orders (order_id text, client_id text); CREATE TABLE raw.client (client_id text, country text)'
    );
    await client.query('INSERT INTO raw.orders VALUES ($1,$2),($3,$4),($5,$6)', [
      '1',
      '10',
      '2',
      '20',
      '3',
      '30',
    ]);
    await client.query('INSERT INTO raw.client VALUES ($1,$2),($3,$4),($5,$6)', [
      '10',
      'ES',
      '20',
      'US',
      '30',
      null,
    ]);
    capability = new PostgresDvtPublicationCapability({ connectionString: lease.url });
  });
  afterAll(async () => {
    await capability?.close();
    await client?.end();
    await lease?.dispose();
  });

  it('writes the canonical JOIN rows only at the Sink, with idempotency and stale fencing', async () => {
    const harness = publicationHarness(buildDvtSinkPublicationDraft());
    const { graph, workload } = await harness.execute();
    if (workload.executionIntent !== 'run') throw new Error('Expected admitted Run workload');
    const publication = resolveDvtPostgresPublication(workload);
    const sql = Buffer.from(harness.publish.mock.calls[0]![0].bytes).toString('utf8');
    expect(graph.nodes.map((node) => node.nodeId)).toEqual(['sink-orders']);
    expect(
      (await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'analytics'")).rows
    ).toEqual([]);
    const request = {
      sql,
      target: publication.target,
      expectedSchemaDigestSha256: workload.targetProjection.schemaDigestSha256,
      publicationToken: 'a'.repeat(64),
      expectedPredecessorToken: null,
    };
    expect(await capability.publish(request)).toMatchObject({
      rowsWritten: 3,
      publicationOutcome: 'created',
    });
    expect(
      (await client.query('SELECT * FROM analytics.orders_sink ORDER BY order_id')).rows
    ).toEqual([
      { order_id: '1', client_id: '10', client_client_id: '10', country: 'ES' },
      { order_id: '2', client_id: '20', client_client_id: '20', country: 'US' },
      { order_id: '3', client_id: '30', client_client_id: '30', country: null },
    ]);
    expect(await capability.publish(request)).toMatchObject({
      rowsWritten: 3,
      publicationOutcome: 'verified-existing',
    });
    await expect(
      capability.publish({ ...request, publicationToken: 'b'.repeat(64) })
    ).rejects.toMatchObject({ code: 'STALE_PUBLICATION' });
    expect(
      (await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'analytics'")).rows
    ).toEqual([{ tablename: 'orders_sink' }]);
    expect(
      (await client.query('SELECT count(*)::int AS count FROM analytics.orders_sink')).rows
    ).toEqual([{ count: 3 }]);
  });
});
