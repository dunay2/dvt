const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schemaPath = path.join(__dirname, '..', 'tools', 'planning-db', 'schema.sql');
const capabilityCatalogPath = path.join(
  __dirname,
  '..',
  'tools',
  'planning-db',
  'state',
  'dbt-project-roundtrip-capabilities.json'
);
function readCapabilityCatalog() {
  return JSON.parse(fs.readFileSync(capabilityCatalogPath, 'utf8'));
}

test('DBT round-trip capability current schema owns normalized phase evidence and projection', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  assert.match(sql, /CREATE TABLE planning_query_store\.dbt_project_roundtrip_phases/);
  assert.match(sql, /CREATE TABLE planning_query_store\.dbt_project_roundtrip_phase_rail_evidence/);
  assert.match(
    sql,
    /CREATE VIEW planning_query_store\.dbt_project_roundtrip_capability_status_query/
  );
  assert.match(
    sql,
    /feature_mechanization_local_rails_mechanization_status_check CHECK \(\(mechanization_status = ANY \(ARRAY\['closed'::text, 'implemented'::text\]\)\)\)/
  );
});

test('DBT round-trip current catalog enumerates only current rails without retired history', () => {
  const catalog = readCapabilityCatalog();
  const phaseCounts = new Map(
    catalog.phases.map((phase) => [phase.phaseId, phase.expectedRailCount])
  );

  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(
    [...phaseCounts.entries()],
    [
      ['phase-2', 1],
      ['phase-3', 2],
      ['phase-4', 4],
    ]
  );
  assert.deepEqual(catalog.railEvidence.map((evidence) => evidence.railName).sort(), [
    'BuildDbtPlannerGraphSource',
    'ImportDbtProject',
    'ObservePlanRunReadiness',
    'PreviewExecutionPlan',
    'ProjectDbtGraphFromFiles',
    'StartRun',
    'ValidateDbtProjectImport',
  ]);
  assert.equal(catalog.railEvidence.length, 7);
  assert.equal(
    catalog.railEvidence.some((evidence) => evidence.railName === 'ExportDbtProject'),
    false
  );
});

test('DBT round-trip current catalog contains no compatibility or history state', () => {
  const catalogText = fs.readFileSync(capabilityCatalogPath, 'utf8');

  assert.doesNotMatch(catalogText, /schema_migrations|migration_state|planning-db-migrate/iu);
  assert.doesNotMatch(catalogText, /tools\/planning-db\/migrations/iu);
});
