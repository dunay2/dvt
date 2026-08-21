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

test('successful import preserves DB-owned architecture, mechanization, overlays, and audit', async () => {
  await importContent({ databaseUrl: dbUrl(), silent: true });

  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  const designId = 'test-import-preserves-db-authority';
  const designOperationId = `${designId}:design-operation`;
  const railId = `${designId}:rail`;
  const railOperationId = `${designId}:rail-operation`;
  const governedOperationId = `${designId}:governed-operation`;
  let governedPath;

  try {
    const file = await client.query(
      `select path from planning_query_store.governance_files order by path limit 1`
    );
    assert.equal(file.rowCount, 1);
    governedPath = file.rows[0].path;

    await client.query(
      `insert into architecture.design
        (design_id, work_item_id, title, owner, status, rationale, fowler_signal, rail_ref)
       values ($1, 'GH-2553-TEST', 'Import preservation sentinel', 'Planning DB tests',
         'proposed', 'Prove routine import preserves DB-owned authority.', 'hidden_authority',
         'ImportPlanningGovernanceQueryStore')
       on conflict (design_id) do update set title = excluded.title`,
      [designId]
    );
    await client.query(
      `insert into architecture.design_operations
        (operation_id, idempotency_key, operation_type, actor, design_id, source_ref,
         source_content_sha256, expected_revision, previous_revision, resulting_revision, payload)
       values ($1, $1, 'architecture_design_create', 'planning-db-test', $2,
         'scripts/planning-db-content.integration.test.cjs', $3, null, 0, 0, '{"sentinel":true}')
       on conflict (operation_id) do nothing`,
      [designOperationId, designId, 'a'.repeat(64)]
    );
    await client.query(
      `insert into planning_query_store.feature_mechanization_local_rails
        (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name, rail_type,
         ddd_owner, rail_status, source_path, source_content_sha256, raw_rail, raw_manifest,
         created_by)
       values ($1, 'GH-2553-TEST', 'implemented', 'ImportPreservationSentinel',
         'importpreservationsentinel', 'query', 'Planning DB tests', 'implemented-local',
         'scripts/planning-db-content.integration.test.cjs', $2, '{"sentinel":true}',
         '{"sentinel":true}', 'planning-db-test')
       on conflict (rail_id) do update set rail_name = excluded.rail_name`,
      [railId, 'b'.repeat(64)]
    );
    await client.query(
      `insert into planning_query_store.feature_mechanization_local_operations
        (operation_id, idempotency_key, operation_type, actor, rail_id, source_path,
         source_content_sha256, expected_revision, previous_revision, resulting_revision, payload)
       values ($1, $1, 'feature_mechanization_rail_record', 'planning-db-test', $2,
         'scripts/planning-db-content.integration.test.cjs', $3, null, null, 0,
         '{"sentinel":true}')
       on conflict (operation_id) do nothing`,
      [railOperationId, railId, 'b'.repeat(64)]
    );
    await client.query(
      `insert into planning_query_store.governed_source_content_overrides
        (path, content_hash, state_fingerprint, source_commit_sha, revision, updated_by)
       values ($1, $2, $3, $4, 7, 'planning-db-test')
       on conflict (path) do update set
         content_hash = excluded.content_hash,
         state_fingerprint = excluded.state_fingerprint,
         source_commit_sha = excluded.source_commit_sha,
         revision = excluded.revision,
         updated_by = excluded.updated_by`,
      [governedPath, 'c'.repeat(64), 'd'.repeat(64), 'e'.repeat(40)]
    );
    await client.query(
      `insert into planning_query_store.governed_source_content_operations
        (operation_id, idempotency_key, operation_type, actor, source_commit_sha, paths,
         changes, expected_content_sha256_by_path)
       values ($1, $1, 'governed_source_content_refresh', 'planning-db-test', $2,
         $3::jsonb, '[{"sentinel":true}]', '{}')
       on conflict (operation_id) do nothing`,
      [governedOperationId, 'e'.repeat(40), JSON.stringify([governedPath])]
    );

    await importContent({ client, silent: true });

    const preserved = await client.query(
      `select
         exists(select 1 from architecture.design where design_id = $1) as design,
         exists(select 1 from architecture.design_operations where operation_id = $2) as design_audit,
         exists(select 1 from planning_query_store.feature_mechanization_local_rails where rail_id = $3) as mechanization,
         exists(select 1 from planning_query_store.feature_mechanization_local_operations where operation_id = $4) as mechanization_audit,
         exists(select 1 from planning_query_store.governed_source_content_overrides where path = $5 and revision = 7) as overlay,
         exists(select 1 from planning_query_store.governed_source_content_operations where operation_id = $6) as overlay_audit`,
      [designId, designOperationId, railId, railOperationId, governedPath, governedOperationId]
    );
    assert.deepEqual(preserved.rows[0], {
      design: true,
      design_audit: true,
      mechanization: true,
      mechanization_audit: true,
      overlay: true,
      overlay_audit: true,
    });
  } finally {
    await client.query(
      `delete from planning_query_store.governed_source_content_operations where operation_id = $1`,
      [governedOperationId]
    );
    if (governedPath) {
      await client.query(
        `delete from planning_query_store.governed_source_content_overrides where path = $1`,
        [governedPath]
      );
    }
    await client.query(
      `delete from planning_query_store.feature_mechanization_local_operations where operation_id = $1`,
      [railOperationId]
    );
    await client.query(
      `delete from planning_query_store.feature_mechanization_local_rails where rail_id = $1`,
      [railId]
    );
    await client.query(`delete from architecture.design_operations where operation_id = $1`, [
      designOperationId,
    ]);
    await client.query(`delete from architecture.design where design_id = $1`, [designId]);
    await client.end();
  }
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
