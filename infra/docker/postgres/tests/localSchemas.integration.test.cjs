'use strict';

/**
 * Owned concern: prove local bootstrap and prototype ledger SQL in owned empty databases.
 * The Planning endpoint allocates test leases; all schema and data writes use those leases.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Client } = require('pg');
const {
  allocateDisposablePostgresDatabase,
} = require('../../../../scripts/disposable-postgres-database.cjs');
const { databaseUrl } = require('../../../../scripts/planning-db-query.cjs');

async function withSchema(label, relativePath, verify) {
  const adminUrl = databaseUrl();
  assert.equal(
    new URL(adminUrl).pathname,
    '/dvt_planning',
    'Use the explicit Planning test admin endpoint'
  );
  const lease = await allocateDisposablePostgresDatabase(adminUrl, label);
  const client = new Client({ connectionString: lease.url });
  try {
    await client.connect();
    const sql = fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
    await client.query(sql);
    await client.query(sql);
    await verify(client);
  } finally {
    try {
      await client.end();
    } finally {
      await lease.dispose();
    }
  }
}

test('local bootstrap is repeatable and generates a health row without changing the authority database', async () => {
  await withSchema('local_bootstrap', 'init/001_bootstrap.sql', async (client) => {
    const inserted = (
      await client.query('INSERT INTO core.health_check DEFAULT VALUES RETURNING id,created_at')
    ).rows[0];
    assert.equal(inserted.id, 1);
    assert.ok(inserted.created_at instanceof Date);
    assert.equal(
      (
        await client.query(
          "SELECT count(*)::int n FROM pg_namespace WHERE nspname IN ('core','eventstore')"
        )
      ).rows[0].n,
      2
    );
    await client.query('BEGIN');
    await client.query('INSERT INTO core.health_check DEFAULT VALUES');
    await client.query('ROLLBACK');
    assert.equal(
      (await client.query('SELECT count(*)::int n FROM core.health_check')).rows[0].n,
      1
    );
  });
});

async function ledgerFunctions() {
  const append = await import('../../../prototypes/api/src/runEventsRepo.ts');
  const catchup = await import('../../../prototypes/api/src/catchup.ts');
  return { ...append, ...catchup };
}

test('prototype append commits matching outbox/state, isolates Run sequence and resumes catchup', async () => {
  const { appendNodeStatusTx, fetchRunEventsAfter } = await ledgerFunctions();
  await withSchema('prototype_ledger', 'redpanda/migrations/001_init.sql', async (client) => {
    await client.query('BEGIN');
    const first = await appendNodeStatusTx(client, {
      runId: 'run-a',
      nodeId: 'node-a',
      status: 'RUNNING',
      attempt: 1,
    });
    const second = await appendNodeStatusTx(client, {
      runId: 'run-a',
      nodeId: 'node-a',
      status: 'SUCCESS',
      attempt: 2,
    });
    const foreign = await appendNodeStatusTx(client, {
      runId: 'run-b',
      nodeId: 'node-b',
      status: 'RUNNING',
      attempt: 1,
    });
    await client.query('COMMIT');
    assert.deepEqual([first.seq, second.seq, foreign.seq], [1, 2, 1]);
    const rows = (
      await client.query('SELECT event_id::text,payload FROM outbox WHERE run_id=$1 ORDER BY seq', [
        'run-a',
      ])
    ).rows;
    assert.deepEqual(
      rows.map((row) => row.event_id),
      [first.eventId, second.eventId]
    );
    assert.deepEqual(
      rows.map((row) => row.payload),
      [first, second]
    );
    assert.equal(
      (await client.query('SELECT status,attempt FROM run_node_state WHERE run_id=$1', ['run-a']))
        .rows[0].status,
      'SUCCESS'
    );
    const resumed = await fetchRunEventsAfter(client, 'run-a', 1, 1);
    assert.deepEqual(
      resumed.map((row) => row.seq),
      [2]
    );
    assert.deepEqual(resumed[0].payload, second.payload);
    assert.deepEqual(await fetchRunEventsAfter(client, 'absent-run', 0, 10), []);
  });
});

test('rollback removes the complete prototype append and uniqueness rejects duplicate identity', async () => {
  const { appendNodeStatusTx } = await ledgerFunctions();
  await withSchema('prototype_rollback', 'redpanda/migrations/001_init.sql', async (client) => {
    await client.query('BEGIN');
    await appendNodeStatusTx(client, {
      runId: 'rolled-back',
      nodeId: 'node-a',
      status: 'FAILED',
      attempt: 1,
    });
    await client.query('ROLLBACK');
    for (const table of ['runs', 'run_seq', 'run_events', 'run_node_state', 'outbox']) {
      assert.equal(
        (await client.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n,
        0,
        table
      );
    }
    const event = await appendNodeStatusTx(client, {
      runId: 'kept',
      nodeId: 'node-a',
      status: 'RUNNING',
      attempt: 1,
    });
    assert.equal(event.seq, 1);
    await assert.rejects(client.query('INSERT INTO run_events SELECT * FROM run_events'), {
      code: '23505',
    });
    assert.equal((await client.query('SELECT count(*)::int n FROM run_events')).rows[0].n, 1);
  });
});
