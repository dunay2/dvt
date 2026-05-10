const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const packageJson = require('../package.json');

const repoRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(repoRoot, 'docs', 'planning', 'status', 'db-surface-inventory.md');
const scriptPath = path.join(__dirname, 'planning-db-surface-inventory-check.cjs');

function loadInventoryCheck() {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    'scripts/planning-db-surface-inventory-check.cjs must exist'
  );

  return require(scriptPath);
}

test('DB surface inventory exists and validates canonical planning and governance surfaces', () => {
  assert.equal(
    fs.existsSync(inventoryPath),
    true,
    'docs/planning/status/db-surface-inventory.md must exist'
  );

  const { validateInventory } = loadInventoryCheck();
  const result = validateInventory(fs.readFileSync(inventoryPath, 'utf8'), {
    inventoryPath,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('DB surface inventory validator rejects missing required surfaces', () => {
  const { validateInventory } = loadInventoryCheck();
  const withoutTaskLifecycle = fs
    .readFileSync(inventoryPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => !line.includes('| Planning task lifecycle |'))
    .join('\n');

  const result = validateInventory(withoutTaskLifecycle, { inventoryPath });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /Planning task lifecycle/);
});

test('package scripts expose and gate the DB surface inventory check', () => {
  assert.equal(
    packageJson.scripts['planning:db:inventory:check'],
    'node scripts/planning-db-surface-inventory-check.cjs'
  );
  assert.match(
    packageJson.scripts['test:planning:db'],
    /planning-db-surface-inventory-check\.test\.cjs/
  );
  assert.match(packageJson.scripts['ci:docs'], /planning:db:inventory:check/);
  assert.match(packageJson.scripts['verify:prepush'], /planning:db:inventory:check/);
});

test('DB surface inventory check command exits successfully', () => {
  assert.equal(
    fs.existsSync(scriptPath),
    true,
    'scripts/planning-db-surface-inventory-check.cjs must exist'
  );

  const result = childProcess.spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
