import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  computeTestPackageMatrix,
  TEST_PACKAGE_ENTRIES,
  WORKSPACE_ENTRIES,
} from './scope-config.mjs';
import {
  buildNonPullRequestTestMatrixOutputs,
  buildTestMatrixOutputs,
} from './package-test-matrix.mjs';

const DEDICATED_TEST_PACKAGES = new Set([
  '@dvt/adapter-postgres',
  '@dvt/adapter-temporal',
  '@dvt/engine',
  '@dvt/web',
]);

const PLANNING_DB_WITH_CI_CONTRACT_FIXTURE = [
  'scripts/planning-db-export.cjs',
  'scripts/planning-db-export.test.cjs',
  'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
  'scripts/planning-db-operate-tests/governed-source-refresh.test.cjs',
  'scripts/planning-db-operate.cjs',
  'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-schema.test.cjs',
  'scripts/planning-db/commands/governed-source-refresh-command.cjs',
  'scripts/planning-db/governed-source-refresh-write-rail.cjs',
  'tools/ci/sync-docs-status-policy.test.mjs',
  'tools/planning-db/schema.sql',
  'tools/planning-db/state/db-governance-surfaces.json',
];

const selectedPackages = (matrix) => matrix.include.flatMap(({ packages }) => packages).sort();

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
  assert.deepEqual(selectedPackages(matrix), ['@dvt/contracts', '@dvt/planner'].sort());
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
  assert.equal(apiPackage?.scripts?.['test:ci'], 'pnpm test:unit && pnpm test:integration:ci');
  assert.deepEqual(matrix.include, [
    {
      name: 'api',
      packages: ['dvt-api'],
      buildFilters: '--filter=dvt-api',
      command: 'pnpm --filter dvt-api test:ci',
    },
  ]);
});

test('test matrix keeps pull-request workflow policy changes out of package tests', () => {
  const matrix = buildTestMatrixOutputs(['.github/workflows/test.yml']);

  assert.equal(matrix.anyTests, false);
  assert.deepEqual(matrix.include, []);
});

test('test matrix keeps the measured Planning DB fixture out of product package tests', () => {
  const matrix = buildTestMatrixOutputs(PLANNING_DB_WITH_CI_CONTRACT_FIXTURE);

  assert.equal(matrix.anyTests, false);
  assert.deepEqual(matrix.include, []);
});

test('test matrix preserves non-pull-request full package test fan-out', () => {
  const matrix = buildNonPullRequestTestMatrixOutputs();

  assert.equal(matrix.anyTests, true);
  assert.deepEqual(selectedPackages(matrix), TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg).sort());
});

test('test matrix fans out to package tests for root build sensitive changes', () => {
  const matrix = buildTestMatrixOutputs(['turbo.json']);

  assert.equal(matrix.anyTests, true);
  assert.deepEqual(selectedPackages(matrix), TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg).sort());
});

test('test matrix fails closed for an uncatalogued CI configuration', () => {
  const matrix = buildTestMatrixOutputs(['tools/ci/policy/unknown-policy.json']);

  assert.equal(matrix.anyTests, true);
  assert.deepEqual(selectedPackages(matrix), TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg).sort());
});

test('test matrix omits packages owned by explicit test lanes', () => {
  const matrixPackages = new Set(TEST_PACKAGE_ENTRIES.map(({ pkg }) => pkg));

  for (const pkg of DEDICATED_TEST_PACKAGES) {
    assert.equal(matrixPackages.has(pkg), false);
  }
});

test('runner grouping preserves the canonical selected set without duplicate package execution', () => {
  for (const paths of [
    [],
    ['apps/api/src/server.ts'],
    ['packages/@dvt/contracts/src/index.ts'],
    ['apps/api/src/server.ts', 'packages/@dvt/crypto/test/hash.test.ts'],
    ['turbo.json'],
    ['tools/ci/policy/unknown-policy.json'],
  ]) {
    const expected = computeTestPackageMatrix(paths)
      .include.map(({ pkg }) => pkg)
      .sort();
    const matrix = buildTestMatrixOutputs(paths);
    assert.deepEqual(selectedPackages(matrix), expected);
    assert.equal(new Set(selectedPackages(matrix)).size, expected.length);
    assert.equal(matrix.anyTests, expected.length > 0);
    assert.ok(matrix.include.length <= 3);
    for (const group of matrix.include) {
      assert.ok(group.packages.length > 0);
      assert.equal(group.buildFilters, group.packages.map((pkg) => `--filter=${pkg}`).join(' '));
      if (group.name === 'api') {
        assert.deepEqual(group.packages, ['dvt-api']);
      } else {
        assert.ok(['packages-1', 'packages-2'].includes(group.name));
        assert.ok(!group.packages.includes('dvt-api'));
        assert.match(group.command, /--recursive --no-bail --workspace-concurrency=1 --sort/u);
        assert.ok(group.command.endsWith(' exec pnpm run test'));
        assert.ok(!group.command.includes('--if-present'));
      }
    }
  }
});

test('package buckets retain catalog ownership across narrow and reordered diffs', () => {
  const full = buildNonPullRequestTestMatrixOutputs();
  assert.deepEqual(
    full.include.map(({ name }) => name),
    ['api', 'packages-1', 'packages-2']
  );
  const ownership = new Map(
    full.include.flatMap(({ name, packages }) => packages.map((pkg) => [pkg, name]))
  );
  const packagePaths = TEST_PACKAGE_ENTRIES.map(({ pkg }) => {
    const workspace = WORKSPACE_ENTRIES.find((entry) => entry.pkg === pkg);
    return workspace.patterns[0].replace('/**', '/src/example.ts');
  });
  for (const paths of [
    ...packagePaths.map((file) => [file]),
    packagePaths.slice(1),
    packagePaths.slice(1).reverse(),
  ]) {
    const matrix = buildTestMatrixOutputs(paths);
    const expected = computeTestPackageMatrix(paths)
      .include.map(({ pkg }) => pkg)
      .sort();
    assert.ok(expected.length > 0, paths.join(','));
    assert.deepEqual(selectedPackages(matrix), expected);
    for (const { name, packages } of matrix.include) {
      for (const pkg of packages) {
        assert.equal(name, ownership.get(pkg), `${pkg} changed bucket for ${paths.join(',')}`);
      }
    }
  }
});

test('shared package execution runs existing scripts and rejects failures or missing scripts', () => {
  const matrix = buildTestMatrixOutputs([
    'packages/@dvt/artifacts/test/example.test.ts',
    'packages/@dvt/observability-otel/test/example.test.ts',
  ]);
  const group = matrix.include[0];
  assert.equal(matrix.include.length, 1);
  const directory = mkdtempSync(path.join(tmpdir(), 'dvt-package-batch-'));
  try {
    writeFileSync(path.join(directory, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true }));
    const execute = (posture) => {
      for (const [index, name] of group.packages.entries()) {
        const packageDirectory = path.join(directory, 'packages', String(index));
        mkdirSync(packageDirectory, { recursive: true });
        const exitCode = posture === 'failure' && index === 0 ? 1 : 0;
        const scripts =
          posture === 'missing' && index === 0
            ? {}
            : {
                test: `node -e "console.log('EXECUTED:${name}');process.exit(${exitCode})"`,
              };
        writeFileSync(
          path.join(packageDirectory, 'package.json'),
          JSON.stringify({ name, scripts })
        );
      }
      const [command, ...args] = group.command.split(' ');
      return spawnSync(command, args, {
        cwd: directory,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      });
    };
    for (const posture of ['success', 'failure', 'missing']) {
      const result = execute(posture);
      assert.ifError(result.error);
      assert.equal(result.status === 0, posture === 'success', result.stdout + result.stderr);
      for (const name of group.packages.slice(posture === 'missing' ? 1 : 0)) {
        assert.ok(result.stdout.includes(`EXECUTED:${name}`), result.stdout + result.stderr);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
