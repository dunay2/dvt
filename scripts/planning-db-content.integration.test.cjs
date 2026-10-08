const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUuidV4 } = require('@dvt/crypto');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { buildGovernanceFileSnapshot, importContent } = require('./planning-db-import.cjs');
const { readHashDriftSummary, readSummary } = require('./planning-db-query.cjs');
const { applyCurrentPlanningDbSchema } = require('./planning-db-schema.cjs');

let adminClient;
let isolatedDatabaseName;
let isolatedDatabaseUrl;

function authoritativeDbUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function dbUrl() {
  if (!isolatedDatabaseUrl) {
    throw new Error('Planning DB integration database has not been initialized.');
  }
  return isolatedDatabaseUrl;
}

function quoteDatabase(databaseName) {
  if (!/^dvt_planning_test_[a-z0-9_]+$/u.test(databaseName)) {
    throw new Error(`Refusing unsafe Planning DB integration database name: ${databaseName}`);
  }
  return `"${databaseName}"`;
}

function withDatabase(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

test.before(async () => {
  isolatedDatabaseName = `dvt_planning_test_${process.pid}_${randomUuidV4().replaceAll('-', '')}`;
  adminClient = new Client({ connectionString: authoritativeDbUrl() });
  await adminClient.connect();
  await adminClient.query(`create database ${quoteDatabase(isolatedDatabaseName)}`);
  isolatedDatabaseUrl = withDatabase(authoritativeDbUrl(), isolatedDatabaseName);
  await applyCurrentPlanningDbSchema({ databaseUrl: isolatedDatabaseUrl, silent: true });
});

test.after(async () => {
  if (!adminClient || !isolatedDatabaseName) return;
  try {
    await adminClient.query(
      'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
      [isolatedDatabaseName]
    );
    await adminClient.query(`drop database if exists ${quoteDatabase(isolatedDatabaseName)}`);
  } finally {
    await adminClient.end();
  }
});

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

test('integration tests never run against the authoritative Planning DB', () => {
  assert.notEqual(dbUrl(), authoritativeDbUrl());
});

test('catalog rail retirement preserves native shared metadata with atomic audited rejection', async () => {
  const { applyCatalogReconciliation } = require('./planning-db/catalog-reconciliation-write.cjs');
  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  try {
    await client.query(`insert into architecture.design
      (design_id, work_item_id, title, owner, status, rationale, rail_ref)
      values ('catalog-retirement', 'GH-3021', 'Exact imported retirement', 'Catalog', 'review',
        'Preserve provider evidence while retiring one proof command', 'RecordFeatureMechanizationRail')`);
    await client.query(`insert into architecture.design_scope
      (design_id, subject_kind, subject_id, scope_kind)
      select 'catalog-retirement', 'relation', 'planning_query_store.' || name, 'may_update'
      from unnest(array['command_query_rails', 'feature_mechanization_local_operations']) as name`);
    await client.query(`with rails as (
      select ordinal, jsonb_build_object('name', 'CatalogProof' || ordinal, 'type', 'command',
        'status', 'implemented', 'dddOwner', 'Owner' || ordinal,
        'precision', '{"integer":9007199254740993,"decimal":0.123456789012345678901}'::jsonb) as rail
      from generate_series(0, 5) as ordinal
    ), manifest as (
      select jsonb_build_object('mechanizationStatus', 'implemented',
        'commandQueryRails', jsonb_agg(rail order by ordinal),
        'symbols', '[{"name":"provider","path":"provider.ts","limit":9007199254740993}]'::jsonb,
        'redGreenCycles', '[{"id":"provider-proof"}]'::jsonb,
        'custom', '{"decimal":0.123456789012345678901}'::jsonb) as value from rails
    ) insert into planning_query_store.command_query_rails
      (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name, rail_type,
       ddd_owner, rail_status, source_path, source_content_sha256, raw_rail, raw_manifest,
       implementation_refs, imported_at)
      select 'catalog-retire-' || ordinal, 'CATALOG-RETIRE', 'implemented', rail->>'name',
        lower(rail->>'name'), 'command', rail->>'dddOwner', 'implemented', 'catalog-proof.md',
        repeat('a',64), rail, manifest.value, '["provider.ts#provider"]',
        '2026-01-01T00:00:00.123456Z'::timestamptz from rails cross join manifest`);
    const snapshots = async () =>
      (
        await client.query(`select rail_id, to_jsonb(rail)::text as snapshot,
      planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(to_jsonb(rail))) as hash
      from planning_query_store.command_query_rails rail where rail_id like 'catalog-retire-%'
      order by rail_id`)
      ).rows;
    const auditCount = async () =>
      (
        await client.query(`select count(*)::int as count
      from planning_query_store.feature_mechanization_local_operations
      where payload->>'designId' = 'catalog-retirement'`)
      ).rows[0].count;
    const before = await snapshots();
    const command = {
      designId: 'catalog-retirement',
      actor: 'test',
      idempotencyKey: 'catalog-retirement-native',
      changes: [
        {
          origin: 'imported',
          railId: before[0].rail_id,
          expectedRowSha256: before[0].hash,
          railRetirement: {
            reason: 'Retire only the exclusive proof, not its five product siblings',
          },
        },
      ],
    };
    const rejectUnchanged = async (input, pattern, connection = client) => {
      const original = await snapshots();
      const audits = await auditCount();
      await assert.rejects(applyCatalogReconciliation(input, { client: connection }), pattern);
      assert.deepEqual(await snapshots(), original);
      assert.equal(await auditCount(), audits);
    };
    await rejectUnchanged(
      {
        ...command,
        changes: [
          command.changes[0],
          {
            ...command.changes[0],
            railId: before[1].rail_id,
            expectedRowSha256: '0'.repeat(64),
          },
        ],
      },
      /CATALOG-STALE/
    );
    await client.query(`delete from architecture.design_scope where design_id = 'catalog-retirement'
      and subject_id = 'planning_query_store.command_query_rails'`);
    await rejectUnchanged(command, /CATALOG-DESIGN-SCOPE/);
    await client.query(`insert into architecture.design_scope values
      ('catalog-retirement', 'relation', 'planning_query_store.command_query_rails', 'may_update', true, now())`);
    // An unchanged consumer must prevent retiring its live authority, not just changed references.
    await client.query(`insert into planning_query_store.command_query_rails
      (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name, rail_type,
       ddd_owner, rail_status, source_path, source_content_sha256, raw_rail, raw_manifest, implementation_refs)
      select 'catalog-retire-reference', 'CATALOG-CONSUMER', mechanization_status,
        rail_name, normalized_rail_name, rail_type, ddd_owner, 'referenced', 'consumer.md',
        source_content_sha256, raw_rail || '{"referenceOnly":true,"authorityRef":"catalog-proof.md"}',
        raw_manifest, implementation_refs from planning_query_store.command_query_rails
      where rail_id = 'catalog-retire-0'`);
    await rejectUnchanged(command, /CATALOG-REFERENCE/);
    await client.query(`delete from planning_query_store.command_query_rails
      where rail_id = 'catalog-retire-reference'`);
    await client.query(`insert into planning_query_store.command_query_rails
      (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name, rail_type,
       ddd_owner, rail_status, source_path, source_content_sha256, raw_rail, raw_manifest,
       implementation_refs, imported_at)
      select 'catalog-retire-fallback', 'CATALOG-FALLBACK', mechanization_status, rail_name,
        normalized_rail_name, rail_type, ddd_owner, rail_status, source_path, source_content_sha256,
        raw_rail, raw_manifest, implementation_refs, imported_at - interval '1 day'
      from planning_query_store.command_query_rails where rail_id = 'catalog-retire-0'`);
    await rejectUnchanged(command, /CATALOG-WINNER/);
    await client.query(`delete from planning_query_store.command_query_rails
      where rail_id = 'catalog-retire-fallback'`);
    await rejectUnchanged(command, /audit boundary failure/, {
      query(sql, values) {
        if (
          sql
            .trimStart()
            .startsWith('insert into planning_query_store.feature_mechanization_local_operations')
        )
          throw new Error('audit boundary failure');
        return client.query(sql, values);
      },
    });
    const result = await applyCatalogReconciliation(command, { client });
    assert.deepEqual(result, {
      idempotent: false,
      changed: 1,
      catalogReconciliation: { changed: 1 },
    });
    const after = await snapshots();
    assert.deepEqual(after.slice(1), before.slice(1));
    const expected = (
      await client.query(
        `select jsonb_set(jsonb_set(jsonb_set($1::jsonb,
      '{rail_status}', '"retired"'), '{raw_rail,status}', '"retired"'),
      '{raw_manifest,commandQueryRails,0,status}', '"retired"')::text as snapshot`,
        [before[0].snapshot]
      )
    ).rows[0].snapshot;
    assert.equal(after[0].snapshot, expected);
    const audit = (
      await client.query(
        `select payload->'before' = $1::jsonb as exact_before,
      payload->'after' = $2::jsonb as exact_after,
      payload #>> '{after,raw_manifest,symbols,0,limit}' as integer,
      payload #>> '{after,raw_manifest,custom,decimal}' as decimal,
      payload #>> '{change,railRetirement,reason}' as reason
      from planning_query_store.feature_mechanization_local_operations
      where idempotency_key = 'catalog-retirement-native:catalog:0'`,
        [before[0].snapshot, after[0].snapshot]
      )
    ).rows[0];
    assert.deepEqual(audit, {
      exact_before: true,
      exact_after: true,
      integer: '9007199254740993',
      decimal: '0.123456789012345678901',
      reason: command.changes[0].railRetirement.reason,
    });
    assert.equal((await applyCatalogReconciliation(command, { client })).idempotent, true);
    assert.equal(await auditCount(), 1);
    await rejectUnchanged({ ...command, actor: 'other' }, /CATALOG-IDEMPOTENCY/);
    await rejectUnchanged(
      {
        ...command,
        idempotencyKey: 'catalog-retirement-terminal',
        changes: [{ ...command.changes[0], expectedRowSha256: after[0].hash }],
      },
      /CATALOG-RETIREMENT/
    );
  } finally {
    await client.end();
  }
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
    const designId = 'test-failed-import-preserves-db-authority';
    await client.query(
      `insert into architecture.design
        (design_id, work_item_id, title, owner, status, rationale, fowler_signal, rail_ref)
       values ($1, 'GH-2553-TEST', 'Rollback preservation sentinel', 'Planning DB tests',
         'proposed', 'Prove a failed import preserves committed DB-owned authority.',
         'hidden_authority', 'ImportPlanningGovernanceQueryStore')`,
      [designId]
    );
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

    const after = await client.query(
      `select exists(select 1 from architecture.design where design_id = $1) as preserved`,
      [designId]
    );
    assert.equal(after.rows[0].preserved, true);
  } finally {
    await client.end();
  }
});
