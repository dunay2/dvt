const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(
  __dirname,
  '..',
  'tools',
  'planning-db',
  'migrations',
  '726_dbt_project_roundtrip_capability_truth_projection.sql'
);

test('DBT round-trip capability migration owns normalized phase evidence and projection', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(
    sql,
    /create table if not exists planning_query_store\.dbt_project_roundtrip_phases/
  );
  assert.match(
    sql,
    /create table if not exists planning_query_store\.dbt_project_roundtrip_phase_rail_evidence/
  );
  assert.match(
    sql,
    /create or replace view planning_query_store\.dbt_project_roundtrip_capability_status_query/
  );
  assert.match(sql, /ProjectDbtRoundtripCapabilityStatus/);
  assert.match(sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP/);
  assert.match(sql, /SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP/);
  assert.match(sql, /REL-DBT-ROUNDTRIP-STATUS-GENERATOR-READS-QUERY/);
  assert.match(sql, /'hidden_authority'/);
  assert.equal((sql.match(/'canonical'/g) ?? []).length, 2);
  assert.match(
    sql,
    /scripts\/planning-db\/queries\/dbt-project-roundtrip-capability-status-query\.cjs/
  );
  assert.match(sql, /scripts\/generate-dbt-project-roundtrip-capability-status\.test\.cjs/);
  assert.match(sql, /duplicate canonical rail/);
  assert.match(sql, /non-ancestor reviewed commit/);
  assert.equal((sql.match(/'transition'/g) ?? []).length, 2);
  assert.equal((sql.match(/'consumer'/g) ?? []).length, 2);
});

test('DBT round-trip capability migration enumerates implemented and deferred rails without arrays', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  for (const railName of [
    'ProjectDbtGraphFromFiles',
    'ValidateDbtProjectImport',
    'ImportDbtProject',
    'BuildDbtPlannerGraphSource',
    'PreviewExecutionPlan',
    'ObservePlanRunReadiness',
    'StartRun',
    'ExportDbtProject',
  ]) {
    assert.match(sql, new RegExp(`'${railName}'`));
  }

  assert.match(sql, /'phase-2'.*1/s);
  assert.match(sql, /'phase-3'.*2/s);
  assert.match(sql, /'phase-4'.*4/s);
  assert.match(sql, /'phase-6'.*1/s);
  assert.doesNotMatch(sql, /rail_names\s+text\[\]/i);
  assert.doesNotMatch(sql, /evidence_refs\s+jsonb/i);
});

test('DBT round-trip bootstrap validates only migration-owned records before governance import', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /if phase_count <> 4 or evidence_count <> 8 then/);
  assert.match(sql, /if component_count <> 2 or relation_count <> 1 then/);
  assert.match(sql, /if rail_count <> 1 then/);
  assert.doesNotMatch(sql, /drift_count/);
  assert.doesNotMatch(sql, /drift rows at migration time/);
});
