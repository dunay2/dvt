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
const { applyTaskLocalOperation, readAudit } = require('./planning-db-operate.cjs');
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
    assert.equal(summary.governanceComponents, governanceSnapshot.components.length);
    assert.equal(summary.governanceComponentFiles, governanceSnapshot.componentFiles.length);
    assert.equal(summary.governanceFingerprints, governanceSnapshot.fingerprints.length);
    assert.equal(summary.governanceRemediationTasks, governanceSnapshot.remediationTasks.length);
  } finally {
    await client.end();
  }
});

test('live planning DB preserves local operation audit across file imports', async () => {
  await runMigrations({ databaseUrl: dbUrl(), silent: true });
  await importContent({ databaseUrl: dbUrl(), silent: true });

  await applyTaskLocalOperation(
    {
      kind: 'task_claim',
      actor: 'codex',
      laneId: 'A',
      taskId: 'GOV-S2',
      ttlMinutes: 60,
      expectedRevision: null,
      idempotencyKey: 'integration-gov-s2-claim',
    },
    {
      databaseUrl: dbUrl(),
      operationId: 'integration-claim-op',
      now: '2026-05-07T10:00:00.000Z',
    }
  );

  await importContent({ databaseUrl: dbUrl(), silent: true });

  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    const summary = await readSummary(client);
    assert.equal(summary.planningLocalTaskOverlays >= 1, true);
    assert.equal(summary.planningLocalOperations >= 1, true);
  } finally {
    await client.end();
  }

  const auditRows = await readAudit(
    {
      kind: 'audit',
      laneId: 'A',
      taskId: 'GOV-S2',
      limit: 10,
    },
    { databaseUrl: dbUrl() }
  );

  assert.equal(
    auditRows.some((row) => row.operation_id === 'integration-claim-op'),
    true
  );
});
