const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { runMigrations } = require('./planning-db-migrate.cjs');
const {
  buildGovernanceFileSnapshot,
  buildPlanningContentSnapshot,
  importContent,
} = require('./planning-db-import.cjs');
const { readSummary } = require('./planning-db-query.cjs');

function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

test('live planning DB imports lane tasks and governance files with Git-count parity', async () => {
  const planningSnapshot = buildPlanningContentSnapshot();
  const governanceSnapshot = buildGovernanceFileSnapshot();

  await runMigrations({ databaseUrl: dbUrl(), silent: true });
  await importContent({ databaseUrl: dbUrl(), silent: true });
  await importContent({ databaseUrl: dbUrl(), silent: true });

  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    const summary = await readSummary(client);

    assert.equal(summary.lanes, planningSnapshot.lanes.length);
    assert.equal(summary.tasks, planningSnapshot.tasks.length);
    assert.equal(
      summary.reviewTasks,
      planningSnapshot.tasks.filter((task) => task.status === 'review').length
    );
    assert.equal(summary.governanceFiles, governanceSnapshot.files.length);
    assert.equal(
      summary.driftFiles,
      governanceSnapshot.files.filter((file) => file.isDrift).length
    );
  } finally {
    await client.end();
  }
});
