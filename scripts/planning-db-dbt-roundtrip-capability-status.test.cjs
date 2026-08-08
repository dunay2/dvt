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
const canonicalStatePath = path.join(
  __dirname,
  '..',
  'tools',
  'planning-db',
  'state',
  'canonical-state.json'
);

function readCapabilityCatalog() {
  return JSON.parse(fs.readFileSync(capabilityCatalogPath, 'utf8'));
}

test('DBT round-trip capability current schema owns normalized phase evidence and projection', () => {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const architectureState = JSON.stringify(
    JSON.parse(fs.readFileSync(canonicalStatePath, 'utf8')).architectureState
  );

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
  assert.match(architectureState, /ProjectDbtRoundtripCapabilityStatus/);
  assert.match(architectureState, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DBT-ROUNDTRIP/);
  assert.match(architectureState, /SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DBT-ROUNDTRIP/);
  assert.match(architectureState, /REL-DBT-ROUNDTRIP-STATUS-GENERATOR-READS-QUERY/);
  assert.match(architectureState, /duplicate canonical rail/);
  assert.match(architectureState, /non-ancestor reviewed commit/);
});

test('DBT round-trip current catalog enumerates implemented and deferred rails without arrays', () => {
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
      ['phase-6', 1],
    ]
  );
  assert.deepEqual(catalog.railEvidence.map((evidence) => evidence.railName).sort(), [
    'BuildDbtPlannerGraphSource',
    'ExportDbtProject',
    'ImportDbtProject',
    'ObservePlanRunReadiness',
    'PreviewExecutionPlan',
    'ProjectDbtGraphFromFiles',
    'StartRun',
    'ValidateDbtProjectImport',
  ]);
  assert.equal(catalog.railEvidence.length, 8);
  const exportEvidence = catalog.railEvidence.find(
    (evidence) => evidence.railName === 'ExportDbtProject'
  );
  assert.equal(exportEvidence.expectedRailStatus, 'retired');
  assert.equal(exportEvidence.expectedMechanizationStatus, 'closed');
  assert.equal(exportEvidence.expectedImplemented, false);
});

test('DBT round-trip current catalog contains no compatibility or history state', () => {
  const catalogText = fs.readFileSync(capabilityCatalogPath, 'utf8');

  assert.doesNotMatch(catalogText, /schema_migrations|migration_state|planning-db-migrate/iu);
  assert.doesNotMatch(catalogText, /tools\/planning-db\/migrations/iu);
});

test('DBT export current decision is retired without compatibility or history state', () => {
  const state = JSON.parse(fs.readFileSync(canonicalStatePath, 'utf8'));
  const decision = state.featureMechanizationRails.find(
    ({ railId }) => railId === 'current#rail-decision#command#exportdbtproject'
  );

  assert.ok(decision);
  assert.equal(decision.railStatus, 'retired');
  assert.equal(decision.mechanizationStatus, 'closed');
  assert.deepEqual(decision.implementationRefs, []);
  assert.doesNotMatch(JSON.stringify(decision), /compatib|migration|history/iu);
});
