import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const RULE_NAME = 'no-api-non-root-state-store-role-binding';
const DEPCRUISE_CONFIG = resolve('.dependency-cruiser.cjs');
const DEPCRUISE_BIN = resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs');

function writeFixture(root, relativePath, contents) {
  const absolutePath = join(root, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function collectRuleViolations(serviceSource) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dvt-state-store-role-boundary-'));

  try {
    writeFixture(
      fixtureRoot,
      'tsconfig.json',
      `${JSON.stringify({ compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler' } })}\n`
    );
    writeFixture(
      fixtureRoot,
      'apps/api/src/modules/stateStoreRoles.ts',
      [
        'export interface StateStoreRoleBindings { readonly read: unknown }',
        'export function bindStateStoreRoles(): StateStoreRoleBindings { return { read: null }; }',
      ].join('\n')
    );
    writeFixture(fixtureRoot, 'apps/api/src/application/service.ts', serviceSource);

    const result = spawnSync(
      process.execPath,
      [DEPCRUISE_BIN, 'apps', '--config', DEPCRUISE_CONFIG, '--output-type', 'json'],
      { cwd: fixtureRoot, encoding: 'utf8' }
    );

    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);

    return JSON.parse(result.stdout).summary.violations.map((violation) => violation.rule.name);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test('non-root API runtime code cannot bind concrete State Store roles', () => {
  const violations = collectRuleViolations(
    [
      "import { bindStateStoreRoles } from '../modules/stateStoreRoles.js';",
      'export default bindStateStoreRoles;',
    ].join('\n')
  );

  assert.ok(violations.includes(RULE_NAME));
});

test('type-only State Store role references remain allowed outside composition roots', () => {
  const violations = collectRuleViolations(
    [
      "import type { StateStoreRoleBindings } from '../modules/stateStoreRoles.js';",
      'export type Binding = StateStoreRoleBindings;',
    ].join('\n')
  );

  assert.equal(violations.includes(RULE_NAME), false);
});
