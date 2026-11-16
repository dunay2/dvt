/** Owned concern: prove honest declaration admission, replay and catalog authority. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { randomUuidV4 } = require('@dvt/crypto');
const schema = require('../planning-db-schema.cjs');

test('native declared rails require design scope, replay exactly and remain gaps', async () => {
  const adminUrl = schema.databaseUrl();
  const name = 'dvt_planning_test_declaration_' + randomUuidV4().replaceAll('-', '');
  assert.match(name, /^dvt_planning_test_declaration_[a-f0-9]+$/);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let client;
  try {
    await admin.query('create database "' + name + '"');
    const url = new URL(adminUrl);
    url.pathname = '/' + name;
    client = new Client({ connectionString: url.toString() });
    await client.connect();
    await schema.applyCurrentPlanningDbSchema({ client, silent: true });
    await client.query(
      "insert into architecture.design (design_id, work_item_id, title, owner, status, rationale, rail_ref) values ('KEEP','GH-3945','Keep','Test','review','Declare before implementation','CompileFixtureSql')"
    );
    const {
      parseArgs,
      applyFeatureMechanizationRailRecordOperation,
    } = require('../planning-db-operate.cjs');
    const values = {
      feature: 'GH-3945-FIXTURE',
      rail: 'CompileFixtureSql',
      type: 'query',
      'ddd-owner': 'Fixture',
      'application-port': 'Proposed fixture query',
      'adapter-surface': 'Fixture CLI',
      'authorization-scope': 'Isolated fixture',
      'negative-test': 'Reject missing design',
      'mechanization-status': 'declared',
      'rail-status': 'declared',
      design: 'KEEP',
      'implementation-plan': 'https://example.invalid/prospective',
      'component-guide': 'docs/architecture/command-query-rail-governance.md',
      'user-story': 'Declare before implementing',
      'documentation-ref': 'https://example.invalid/prospective',
      'allowed-surface':
        'scripts/planning-db/feature-mechanization-declaration.integration.test.cjs',
      'forbidden-surface': 'apps/**',
      'domain-object': 'Proposed read model',
      'fowler-signal': 'boundary_drift',
      'architecture-guard': 'Native catalog test',
      'cypress-flow': 'N/A CLI',
      'completion-gate': 'pnpm verify:prepush',
      'unit-test': 'scripts/planning-db/feature-mechanization-declaration.integration.test.cjs',
      'source-ref': 'https://example.invalid/prospective',
      'source-content-sha256': 'a'.repeat(64),
      actor: 'test',
    };
    const argsFor = (input) => [
      'feature-mechanization',
      'record',
      ...Object.entries(input).flatMap(([key, value]) => ['--' + key, value]),
      '--governing-source',
      'docs/architecture/command-query-rail-governance.md',
      '--governing-source',
      'docs/architecture/fowler-opportunity-planning-governance.md',
    ];
    await assert.rejects(
      applyFeatureMechanizationRailRecordOperation(
        parseArgs(argsFor({ ...values, design: 'ABSENT' })),
        { client }
      ),
      /DESIGN-MISSING/
    );
    const command = parseArgs(argsFor(values));
    await assert.rejects(
      applyFeatureMechanizationRailRecordOperation(command, { client }),
      /DESIGN-SCOPE-MISSING/
    );
    await client.query(
      "insert into architecture.design_scope (design_id,subject_kind,subject_id,scope_kind) values ('KEEP','query','CompileFixtureSql','may_create')"
    );
    await client.query(
      "update architecture.design set status='implementing', approved_at=now() where design_id='KEEP'"
    );
    const receipt = await applyFeatureMechanizationRailRecordOperation(command, { client });
    assert.equal(receipt.rail.mechanizationStatus, 'declared');
    assert.equal(
      (await applyFeatureMechanizationRailRecordOperation(command, { client })).idempotent,
      true
    );
    const candidate = (
      await client.query(
        `select rail_id as "railId", rail_type as "railType",
      normalized_rail_name as "normalizedRailName", source_path as "sourcePath", rail_status as "railStatus",
      raw_rail as "rawRail", implementation_ref_count as "implementationRefCount", is_gap as "isGap"
      from planning_query_store.command_query_rail_query where rail_id=$1`,
        [command.railId]
      )
    ).rows[0];
    assert.equal(candidate.isGap, true);
    assert.equal(candidate.implementationRefCount, 0);
    const { resolveRailReferenceAuthority } = require('./command-query-rail-authority.cjs');
    assert.equal(
      resolveRailReferenceAuthority(
        { ...candidate, railId: 'OTHER', rawRail: { authorityRef: candidate.sourcePath } },
        [candidate]
      ),
      null
    );
  } finally {
    if (client) await client.end();
    await admin.query('drop database if exists "' + name + '" with (force)');
    await admin.end();
  }
});
