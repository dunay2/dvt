const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { buildGovernanceFileSnapshot, importContent } = require('./planning-db-import.cjs');
const { PlanningDbExportRunner, canonicalStateArtifactPath } = require('./planning-db-export.cjs');
const { readHashDriftSummary, readSummary } = require('./planning-db-query.cjs');

function dbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

async function runCurrentSchemaCycle(outputRoot) {
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
    const runner = new PlanningDbExportRunner();
    await runner.exportPlanningDerivedSurfaces({
      databaseUrl: dbUrl(),
      outputRoot,
    });
    const canonicalState = fs.readFileSync(
      path.join(outputRoot, canonicalStateArtifactPath),
      'utf8'
    );

    return {
      canonicalState,
      hashDriftSummary,
      projection: projection.rows[0],
      summary,
    };
  } finally {
    await client.end();
  }
}

test('two full current-schema cycles are equivalent and leave no canonical Git diff', async () => {
  const governanceSnapshot = buildGovernanceFileSnapshot();
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'planning-db-cycle-live-'));
  try {
    const first = await runCurrentSchemaCycle(path.join(outputRoot, 'cycle-1'));
    const second = await runCurrentSchemaCycle(path.join(outputRoot, 'cycle-2'));

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
      assert.equal(
        cycle.summary.governanceComponentFiles,
        governanceSnapshot.componentFiles.length
      );
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
    assert.equal(second.canonicalState, first.canonicalState);

    const runner = new PlanningDbExportRunner();
    const checked = await runner.exportPlanningDerivedSurfaces({
      databaseUrl: dbUrl(),
      check: true,
    });
    assert.equal(checked.report.ok, true);
    assert.deepEqual(checked.report.changed, []);
    assert.deepEqual(checked.report.missing, []);
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
