const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { buildGovernanceFileSnapshot, importContent } = require('./planning-db-import.cjs');
const { PlanningDbExportRunner, canonicalStateArtifactPath } = require('./planning-db-export.cjs');
const { readHashDriftSummary, readSummary } = require('./planning-db-query.cjs');

function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

test('live planning DB imports governance files without a local task mirror', async () => {
  const governanceSnapshot = buildGovernanceFileSnapshot();

  await importContent({ databaseUrl: dbUrl(), silent: true });
  await importContent({ databaseUrl: dbUrl(), silent: true });

  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    const summary = await readSummary(client);

    assert.equal(Object.hasOwn(summary, 'lanes'), false);
    assert.equal(Object.hasOwn(summary, 'tasks'), false);
    assert.equal(Object.hasOwn(summary, 'reviewTasks'), false);
    assert.equal(summary.governanceFiles, governanceSnapshot.files.length);
    assert.equal(
      summary.driftFiles,
      governanceSnapshot.files.filter((file) => file.isDrift).length
    );
    assert.equal(summary.governanceComponents, governanceSnapshot.components.length);
    assert.equal(summary.governanceComponentFiles, governanceSnapshot.componentFiles.length);
    assert.equal(summary.governanceFingerprints, governanceSnapshot.fingerprints.length);
    assert.equal(summary.governanceRemediationTasks, governanceSnapshot.remediationTasks.length);

    const hashDriftSummary = await readHashDriftSummary(client);
    assert.equal(hashDriftSummary.governanceHashDrift, 0);

    const projection = await client.query(`
      select
        count(*)::int as "projectionRows",
        count(*) filter (where derived_state_fingerprint = stored_state_fingerprint)::int as "matchingRows"
      from planning_query_store.governance_file_hash_projection
    `);
    assert.equal(projection.rows[0].projectionRows, governanceSnapshot.files.length);
    assert.equal(projection.rows[0].matchingRows, governanceSnapshot.files.length);
  } finally {
    await client.end();
  }
});

test('live planning DB exports architecture mechanization through the canonical renderer', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-export-live-'));

  await importContent({ databaseUrl: dbUrl(), silent: true });

  try {
    const runner = new PlanningDbExportRunner();
    await runner.exportPlanningDerivedSurfaces({
      databaseUrl: dbUrl(),
      outputRoot,
    });

    assert.equal(fs.existsSync(path.join(outputRoot, canonicalStateArtifactPath)), true);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test('failed live import preserves the previously committed Planning DB', async () => {
  await importContent({ databaseUrl: dbUrl(), silent: true });

  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    const before = await client.query(`select count(*)::int as count from architecture.component`);
    let currentSchemaApplied = false;
    const faultingClient = {
      async query(sql, params) {
        const statement = String(sql);
        if (/CREATE SCHEMA architecture;/u.test(statement)) {
          currentSchemaApplied = true;
        }
        if (currentSchemaApplied && /insert into architecture\."?component"?/iu.test(statement)) {
          throw new Error('planned import failure after current-schema replacement');
        }
        return client.query(sql, params);
      },
    };

    await assert.rejects(
      importContent({ client: faultingClient, silent: true }),
      /planned import failure after current-schema replacement/iu
    );

    const after = await client.query(`select count(*)::int as count from architecture.component`);
    assert.equal(after.rows[0].count, before.rows[0].count);
    assert.ok(after.rows[0].count > 0);
  } finally {
    await client.end();
  }
});
