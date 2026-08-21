const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { buildGovernanceFileSnapshot, importContent } = require('./planning-db-import.cjs');
const { readHashDriftSummary, readSummary } = require('./planning-db-query.cjs');

function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

async function runCurrentSchemaCycle() {
  await importContent({ databaseUrl: dbUrl(), silent: true });
  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    const summary = await readSummary(client);
    const hashDriftSummary = await readHashDriftSummary(client);
    const projection = await client.query(`
      select
        count(*)::int as "projectionRows",
        count(*) filter (where derived_state_fingerprint = stored_state_fingerprint)::int as "matchingRows"
      from planning_query_store.governance_file_hash_projection
    `);
    return {
      hashDriftSummary,
      projection: projection.rows[0],
      summary,
    };
  } finally {
    await client.end();
  }
}

test('two full current-schema imports are equivalent without exporting database state', async () => {
  const governanceSnapshot = buildGovernanceFileSnapshot();
  const first = await runCurrentSchemaCycle();
  const second = await runCurrentSchemaCycle();

  for (const cycle of [first, second]) {
    assert.equal(Object.hasOwn(cycle.summary, 'lanes'), false);
    assert.equal(Object.hasOwn(cycle.summary, 'tasks'), false);
    assert.equal(Object.hasOwn(cycle.summary, 'reviewTasks'), false);
    assert.equal(cycle.summary.governanceFiles, governanceSnapshot.files.length);
    assert.equal(
      cycle.summary.driftFiles,
      governanceSnapshot.files.filter((file) => file.isDrift).length
    );
    assert.equal(cycle.summary.governanceComponents, governanceSnapshot.components.length);
    assert.equal(cycle.summary.governanceComponentFiles, governanceSnapshot.componentFiles.length);
    assert.equal(cycle.summary.governanceFingerprints, governanceSnapshot.fingerprints.length);
    assert.equal(
      cycle.summary.governanceRemediationTasks,
      governanceSnapshot.remediationTasks.length
    );
    assert.equal(cycle.hashDriftSummary.governanceHashDrift, 0);
    assert.equal(cycle.projection.projectionRows, governanceSnapshot.files.length);
    assert.equal(cycle.projection.matchingRows, governanceSnapshot.files.length);
  }

  assert.deepEqual(second.summary, first.summary);
  assert.deepEqual(second.hashDriftSummary, first.hashDriftSummary);
  assert.deepEqual(second.projection, first.projection);
});

test('failed live import preserves the previously committed Planning DB', async () => {
  await importContent({ databaseUrl: dbUrl(), silent: true });

  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    const before = await client.query(`select count(*)::int as count from architecture.component`);
    const faultingClient = {
      async query(sql, params) {
        const statement = String(sql);
        if (/insert into planning_query_store\.governance_files/iu.test(statement)) {
          throw new Error('planned Git projection import failure');
        }
        return client.query(sql, params);
      },
    };

    await assert.rejects(
      importContent({ client: faultingClient, silent: true }),
      /planned Git projection import failure/iu
    );

    const after = await client.query(`select count(*)::int as count from architecture.component`);
    assert.equal(after.rows[0].count, before.rows[0].count);
    assert.ok(after.rows[0].count > 0);
  } finally {
    await client.end();
  }
});
