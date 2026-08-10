const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const packageJson = require('../package.json');
const {
  buildDbSurfaceInventorySelect,
  renderDbSurfaceInventory,
  runDbSurfaceInventoryGenerator,
} = require('./generate-db-surface-inventory.cjs');

const fixtureRows = [
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
    database_write_eligible: true,
    revision: 0,
    updated_by: 'migration',
  },
  {
    surface_name: 'Knowledge intake literature',
    canonical_source: 'knowledge_documents imported from governance DB',
    write_rail: 'pnpm governance:refresh',
    write_rail_kind: 'import',
    read_query_rail: 'pnpm planning:db:query knowledge-intake',
    projection: '.generated-docs/planning/status/generated-knowledge-intake-literature.md',
    validation: 'pnpm docs:knowledge-intake:check',
    authority_mode: 'hybrid-indexed',
    source_ref: 'tools/planning-db/schema.sql',
    database_write_eligible: false,
    revision: 0,
    updated_by: 'migration',
  },
];

test('DB surface inventory SQL reads the DB authority projection only', () => {
  const sql = buildDbSurfaceInventorySelect();

  assert.match(sql, /from planning_query_store\.db_governance_surface_query/);
  assert.doesNotMatch(sql, /db-surface-inventory\.md/);
  assert.match(sql, /order by[\s\S]*surface_name/);
});

test('DB surface inventory render is deterministic and timestamp-free', () => {
  const first = renderDbSurfaceInventory(fixtureRows);
  const second = renderDbSurfaceInventory([...fixtureRows].reverse());

  assert.equal(first, second);
  assert.match(first, /# Generated DB Surface Inventory/);
  assert.match(first, /Source view: `planning_query_store\.db_governance_surface_query`/);
  assert.match(first, /Architecture design authority/);
  assert.match(first, /Knowledge intake literature/);
  assert.match(first, /database/);
  assert.match(first, /hybrid-indexed/);
  assert.doesNotMatch(first, /Generated (at|on)/i);
  assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}T\d{2}:/);
});

test('DB surface inventory generator writes and checks the local render', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'db-surface-inventory-'));
  const outputPath = path.join(tempRoot, 'db-surface-inventory.md');
  const client = {
    async query(sql) {
      assert.match(sql, /db_governance_surface_query/);
      return { rows: fixtureRows };
    },
  };

  try {
    const generated = await runDbSurfaceInventoryGenerator({
      client,
      outputPath,
      logger: { log() {} },
    });
    assert.equal(generated.changed, true);
    assert.equal(fs.existsSync(outputPath), true);

    const checked = await runDbSurfaceInventoryGenerator({
      check: true,
      client,
      outputPath,
      logger: { log() {} },
    });
    assert.equal(checked.changed, false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('package scripts expose DB surface inventory generation outside lightweight docs CI', () => {
  assert.equal(
    packageJson.scripts['docs:db-surface-inventory:generate'],
    'node scripts/generate-db-surface-inventory.cjs'
  );
  assert.equal(
    packageJson.scripts['docs:db-surface-inventory:check'],
    'node scripts/generate-db-surface-inventory.cjs --check'
  );
  assert.doesNotMatch(
    packageJson.scripts['ci:docs'],
    /docs:db-surface-inventory:check/,
    'DB-backed local inventory must not make lightweight docs CI depend on Planning DB state'
  );
});
