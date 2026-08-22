const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = require('../package.json');
const {
  buildVerifyChangedPlan,
  commandLabel: verifyChangedCommandLabel,
} = require('./verify-changed.cjs');
const { buildPrepushPlan, commandLabel: prepushCommandLabel } = require('./verify-prepush.cjs');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(__dirname, 'planning-db-surface-inventory-check.cjs');
const surfaceHash = 'a'.repeat(64);
const fixtureRows = [
  {
    surface_name: 'Governance file inventory',
    canonical_source: 'governance DB',
    write_rail: 'pnpm governance:refresh',
    write_rail_kind: 'import',
    read_query_rail: 'pnpm governance:db:query files',
    projection: 'docs/.manifest.json',
    validation: 'pnpm governance:db:check',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Architecture design authority',
    canonical_source: 'architecture.design rows',
    write_rail: 'pnpm planning:db:operate architecture-design create',
    write_rail_kind: 'db_command',
    read_query_rail: 'pnpm planning:db:query architecture-designs',
    projection: 'DB authority rows',
    validation: 'pnpm test:planning:db',
    authority_mode: 'database',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: true,
  },
  {
    surface_name: 'Governance component definition',
    canonical_source: 'DB-authored component local definitions',
    write_rail: 'pnpm planning:db:operate component create',
    write_rail_kind: 'db_command',
    read_query_rail: 'pnpm planning:db:query component-tree',
    projection: 'Effective scalar component definition rows',
    validation: 'pnpm test:planning:db',
    authority_mode: 'database',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: true,
  },
  {
    surface_name: 'Governance remediation queue',
    canonical_source: 'Governance DB coverage',
    write_rail: 'pnpm governance:refresh',
    write_rail_kind: 'generated',
    read_query_rail: 'pnpm governance:db:query remediation',
    projection: 'remediation queue',
    validation: 'pnpm docs:governance:remediation-queue:check',
    authority_mode: 'generated',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'ADR and contract decisions',
    canonical_source: 'docs/adr and specs/contracts',
    write_rail: 'Git edit',
    write_rail_kind: 'git_edit',
    read_query_rail: 'pnpm governance:db:query files',
    projection: 'docs indexes',
    validation: 'pnpm docs:sync:check',
    authority_mode: 'git-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Risk and evidence records',
    canonical_source: 'docs/evidence and docs/risk-register',
    write_rail: 'Git edit',
    write_rail_kind: 'git_edit',
    read_query_rail: 'pnpm governance:db:query files',
    projection: 'risk and evidence indexes',
    validation: 'pnpm docs:arc:evidence:check',
    authority_mode: 'git-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Repository command catalog',
    canonical_source: 'repository-command-catalog.mjs',
    write_rail: 'Git edit',
    write_rail_kind: 'git_edit',
    read_query_rail: 'pnpm planning:db:query commands',
    projection: 'command rows',
    validation: 'pnpm docs:feature-mechanization:implementation',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Command/query rail catalog',
    canonical_source: 'commandQueryRails',
    write_rail: 'pnpm planning:db:import',
    write_rail_kind: 'import',
    read_query_rail: 'pnpm planning:db:query command-query-rails',
    projection: 'command_query_rail_query',
    validation: 'pnpm test:planning:db',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Knowledge intake literature',
    canonical_source: 'knowledge_intake_retirement_query',
    write_rail: 'pnpm governance:refresh',
    write_rail_kind: 'import',
    read_query_rail: 'pnpm planning:db:query knowledge-intake',
    projection: '.generated-docs/planning/status/generated-knowledge-intake-literature.md',
    validation: 'pnpm docs:knowledge-intake:check',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Documentation lifecycle catalog',
    canonical_source: 'knowledge_documents lifecycle projection',
    write_rail: 'pnpm governance:refresh',
    write_rail_kind: 'import',
    read_query_rail: 'pnpm planning:db:query documentation-lifecycle',
    projection: 'planning_query_store.documentation_lifecycle_query',
    validation: 'pnpm test:planning:db',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'AI project context',
    canonical_source: 'Aggregate planning DB read models',
    write_rail: 'No write rail',
    write_rail_kind: 'none',
    read_query_rail: 'pnpm planning:db:query ai-project-context',
    projection: 'in-memory aggregate',
    validation: 'pnpm planning:db:inventory:check',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Docs task disposition inventory',
    canonical_source: 'docs task disposition docs',
    write_rail: 'Git edit',
    write_rail_kind: 'git_edit',
    read_query_rail: 'pnpm planning:db:query docs-disposition',
    projection: 'disposition rows',
    validation: 'pnpm docs:governance:changed-files:check',
    authority_mode: 'git-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: false,
  },
  {
    surface_name: 'Docs resolution overlays',
    canonical_source: 'doc_resolution_overlays',
    write_rail: 'pnpm planning:db:operate docs-disposition resolve',
    write_rail_kind: 'db_command',
    read_query_rail: 'pnpm planning:db:query docs-disposition --resolution all',
    projection: 'doc_disposition_action_query',
    validation: 'pnpm test:planning:db',
    authority_mode: 'database',
    source_ref: 'tools/planning-db/schema.sql',
    source_content_sha256: surfaceHash,
    database_write_eligible: true,
  },
];

function loadInventoryCheck() {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    'scripts/planning-db-surface-inventory-check.cjs must exist'
  );

  return require(scriptPath);
}

test('DB surface inventory validates canonical planning and governance DB rows', () => {
  const { validateDbSurfaceInventoryRows } = loadInventoryCheck();
  const result = validateDbSurfaceInventoryRows(fixtureRows);

  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('DB surface inventory validator rejects missing required surfaces', () => {
  const { validateDbSurfaceInventoryRows } = loadInventoryCheck();
  const result = validateDbSurfaceInventoryRows(
    fixtureRows.filter((row) => row.surface_name !== 'Architecture design authority')
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Architecture design authority/);
});

test('DB surface inventory validator rejects database labels on imported or read-only surfaces', () => {
  const { validateDbSurfaceInventoryRows } = loadInventoryCheck();
  const result = validateDbSurfaceInventoryRows(
    fixtureRows.map((row) =>
      row.surface_name === 'AI project context'
        ? { ...row, authority_mode: 'database', database_write_eligible: false }
        : row
    )
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /AI project context/);
  assert.match(result.errors.join('\n'), /write rail kind/);
});

test('DB surface inventory validator keeps component definition command rail database', () => {
  const { validateDbSurfaceInventoryRows } = loadInventoryCheck();
  const result = validateDbSurfaceInventoryRows([
    ...fixtureRows,
    {
      surface_name: 'Governance component definition',
      canonical_source: 'DB-authored component local definitions',
      write_rail: 'pnpm planning:db:operate component create',
      write_rail_kind: 'db_command',
      read_query_rail: 'pnpm planning:db:query component-tree',
      projection: 'Effective scalar component definition rows',
      validation: 'pnpm test:planning:db',
      authority_mode: 'hybrid-indexed',
      source_ref: 'tools/planning-db/schema.sql',
      source_content_sha256: surfaceHash,
      database_write_eligible: false,
    },
  ]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Governance component definition/);
  assert.match(result.errors.join('\n'), /authority mode "database"/);
});

test('package scripts expose and gate the DB surface inventory check', () => {
  const scriptSource = fs.readFileSync(scriptPath, 'utf8');

  assert.equal(
    packageJson.scripts['planning:db:inventory:check'],
    'node scripts/planning-db-surface-inventory-check.cjs'
  );
  assert.match(scriptSource, /readDbSurfaceRows/);
  assert.match(
    packageJson.scripts['test:planning:db'],
    /planning-db-surface-inventory-check\.test\.cjs/
  );
  assert.match(
    packageJson.scripts['test:planning:db:current-schema'],
    /planning-db-schema\.test\.cjs/
  );
  assert.match(packageJson.scripts['ci:docs'], /planning:db:inventory:check/);
  assert.equal(
    packageJson.scripts['verify:changed'],
    'pnpm --filter @dvt/crypto build && node scripts/verify-changed.cjs'
  );
  assert.equal(packageJson.scripts['verify:prepush'], 'node scripts/verify-prepush.cjs');

  assert.match(
    buildVerifyChangedPlan(['scripts/planning-db-import.cjs'])
      .map(verifyChangedCommandLabel)
      .join('\n'),
    /pnpm planning:db:inventory:check/
  );
  assert.deepEqual(buildPrepushPlan(['scripts/planning-db-import.cjs']).map(prepushCommandLabel), [
    'pnpm verify:changed',
  ]);
  assert.match(
    buildPrepushPlan([], { full: true }).map(prepushCommandLabel).join('\n'),
    /pnpm planning:db:inventory:check/
  );
});

test('DB surface inventory check command exposes help without opening a DB connection', () => {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    'scripts/planning-db-surface-inventory-check.cjs must exist'
  );

  const result = childProcess.spawnSync(process.execPath, [scriptPath, '--help'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /planning:db:inventory:check/);
  assert.match(result.stdout, /does not parse Markdown inventory tables/);
});
