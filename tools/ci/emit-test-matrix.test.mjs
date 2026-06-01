import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { TEST_PACKAGE_ENTRIES, WORKSPACE_ENTRIES } from './scope-config.mjs';
import { buildTestMatrixOutputs } from './emit-test-matrix.mjs';

const DEDICATED_TEST_PACKAGES = new Set([
  '@dvt/adapter-postgres',
  '@dvt/adapter-temporal',
  '@dvt/web',
]);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }

    if (entry.name === 'package.json') {
      yield fullPath.replaceAll('\\', '/');
    }
  }
}

function collectWorkspaceTestPackages() {
  return [...walk('apps'), ...walk('packages')]
    .map((file) => ({
      file,
      pkg: JSON.parse(readFileSync(file, 'utf8')),
    }))
    .filter(({ pkg }) => typeof pkg.name === 'string' && pkg.scripts?.test)
    .filter(({ pkg }) => !DEDICATED_TEST_PACKAGES.has(pkg.name));
}

function collectWorkspacePackagesByName() {
  return new Map(
    [...walk('apps'), ...walk('packages')]
      .map((file) => JSON.parse(readFileSync(file, 'utf8')))
      .filter((pkg) => typeof pkg.name === 'string')
      .map((pkg) => [pkg.name, pkg])
  );
}

test('test matrix covers every workspace package test script without a dedicated lane', () => {
  const matrixPackages = new Set(TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg));
  const missing = collectWorkspaceTestPackages()
    .filter(({ pkg }) => !matrixPackages.has(pkg.name))
    .map(({ pkg, file }) => `${pkg.name} (${file})`);

  assert.deepEqual(missing, []);
});

test('test matrix entries stay backed by workspace scope entries', () => {
  const workspacePackages = new Set(WORKSPACE_ENTRIES.map(({ pkg }) => pkg));
  const missing = TEST_PACKAGE_ENTRIES.filter(({ pkg }) => !workspacePackages.has(pkg)).map(
    ({ pkg }) => pkg
  );

  assert.deepEqual(missing, []);
});

test('test matrix entries only target packages with test scripts', () => {
  const workspacePackages = collectWorkspacePackagesByName();
  const missingScripts = TEST_PACKAGE_ENTRIES.filter(
    ({ pkg }) => !workspacePackages.get(pkg)?.scripts?.test
  ).map(({ pkg }) => pkg);

  assert.deepEqual(missingScripts, []);
});

test('test matrix includes affected package tests and planner contract dependency', () => {
  const matrix = buildTestMatrixOutputs(['packages/@dvt/contracts/src/index.ts']);

  assert.equal(matrix.anyTests, true);
  assert.deepEqual(
    matrix.include.map(({ pkg }) => pkg).sort(),
    ['@dvt/contracts', '@dvt/planner'].sort()
  );
});

test('test matrix routes API package tests through the CI lifecycle bypass', () => {
  const workspacePackages = collectWorkspacePackagesByName();
  const apiPackage = workspacePackages.get('dvt-api');
  const matrix = buildTestMatrixOutputs(['apps/api/src/server.ts']);

  assert.equal(
    apiPackage?.scripts?.pretest,
    'node ../../scripts/skip-pretest-if-ci.cjs || pnpm --filter "dvt-api^..." build'
  );
  assert.equal(apiPackage?.scripts?.test, 'vitest run --config vitest.config.ts');
  assert.equal(apiPackage?.scripts?.['test:ci'], 'vitest run --config vitest.config.ts');
  assert.deepEqual(matrix.include, [
    {
      key: 'api',
      name: 'api',
      pkg: 'dvt-api',
      command: 'pnpm --filter dvt-api test:ci',
    },
  ]);
});

test('test matrix fans out to package tests for root build sensitive changes', () => {
  const matrix = buildTestMatrixOutputs(['turbo.json']);

  assert.equal(matrix.anyTests, true);
  assert.deepEqual(
    matrix.include.map(({ pkg }) => pkg).sort(),
    TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg).sort()
  );
});

test('test matrix omits packages owned by explicit test lanes', () => {
  const matrixPackages = new Set(TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg));

  for (const pkg of DEDICATED_TEST_PACKAGES) {
    assert.equal(matrixPackages.has(pkg), false);
  }
});
