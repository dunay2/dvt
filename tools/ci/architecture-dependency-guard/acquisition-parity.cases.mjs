/** Owned concern: prove real CLI/query parity and isolation without repeating CLI startup per fixture. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runDependencyCruiseReport } from '../architecture-dependency-acquisition.mjs';
import {
  DEPCRUISE_CONFIG,
  collectDependencyViolations,
  createDependencyFixture,
} from './dependency-fixture.mjs';
import { removeFixtureRoot, writeFixtureFiles } from './fixture-files.mjs';

const DEPCRUISE_BIN = resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs');
const request = { configFile: DEPCRUISE_CONFIG, targets: ['apps', 'packages', 'tools'] };
const validFiles = {
  'apps/api/src/index.ts':
    "import runtime from '@dvt/engine'; import type { Value } from './value.js'; export const value: Value = { id: runtime };\n",
  'apps/api/src/value.ts': 'export interface Value { readonly id: number }\n',
  'packages/@dvt/engine/src/index.ts': "import value from './internal.js'; export default value;\n",
  'packages/@dvt/engine/src/internal.ts': 'export default 1;\n',
  'packages/@dvt/fixture-future/src/index.ts':
    "import value from '../../engine/src/index.js'; export default value;\n",
  'tools/proof.ts': 'export const proof = 1;\n',
};
const forbiddenFile = 'packages/@dvt/contracts/src/index.ts';
const forbiddenSource =
  "import runtime from '../../engine/src/index.js'; export default runtime;\n";
const crossPackageFile = 'packages/@dvt/fixture-future/src/index.ts';
const crossPackageSource =
  "import value from '../../engine/src/internal.js'; export default value;\n";

function cliReport(root) {
  const result = spawnSync(
    process.execPath,
    [DEPCRUISE_BIN, ...request.targets, '--config', DEPCRUISE_CONFIG, '--output-type', 'json'],
    { cwd: root, encoding: 'utf8' }
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

function semanticReport(report) {
  assert.ok(Array.isArray(report.modules));
  assert.ok(Array.isArray(report.summary.violations));
  assert.ok(report.summary.ruleSetUsed?.forbidden.length > 0);
  const order = (values) =>
    values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    modules: order(
      report.modules.map((module) => ({
        source: module.source,
        dependencies: order(
          module.dependencies.map((dependency) => ({
            resolved: dependency.resolved,
            dependencyTypes: dependency.dependencyTypes,
            dynamic: dependency.dynamic,
          }))
        ),
      }))
    ),
    violations: order(report.summary.violations),
    ruleSetUsed: report.summary.ruleSetUsed,
  };
}

for (const scenario of ['valid', 'forbidden']) {
  test(`explicit dependency query matches real CLI for ${scenario} graph, aliases and rules`, async () => {
    const root = createDependencyFixture({
      ...validFiles,
      ...(scenario === 'forbidden'
        ? { [forbiddenFile]: forbiddenSource, [crossPackageFile]: crossPackageSource }
        : {}),
    });
    try {
      const cli = cliReport(root);
      const report = await runDependencyCruiseReport(root, request);
      assert.deepEqual(semanticReport(report), semanticReport(cli));
      assert.equal(report.summary.optionsUsed.rulesFile, DEPCRUISE_CONFIG);
      assert.ok(report.modules.some((module) => module.source === 'tools/proof.ts'));
      assert.ok(
        report.modules.some((module) =>
          module.dependencies.some(
            (dependency) => dependency.resolved === 'packages/@dvt/engine/src/index.ts'
          )
        )
      );
      assert.ok(
        report.modules.some((module) =>
          module.dependencies.some(
            (dependency) =>
              dependency.resolved === 'apps/api/src/value.ts' &&
              dependency.dependencyTypes.includes('type-only')
          )
        )
      );
      assert.equal(
        report.summary.violations.some(
          (violation) => violation.rule.name === 'no-contracts-to-dvt-runtime'
        ),
        scenario === 'forbidden'
      );
      assert.equal(
        report.summary.violations.some(
          (violation) =>
            violation.rule.name === 'no-cross-package-deep-imports' &&
            violation.from === crossPackageFile
        ),
        scenario === 'forbidden'
      );
    } finally {
      removeFixtureRoot(root);
    }
  });
}

test('independent roots and repeated source edits never reuse a previous dependency graph', async () => {
  const first = createDependencyFixture(validFiles);
  const names = async (root) =>
    (await runDependencyCruiseReport(root, request)).summary.violations.map(
      (violation) => violation.rule.name
    );
  try {
    const second = createDependencyFixture({ ...validFiles, [forbiddenFile]: forbiddenSource });
    try {
      assert.deepEqual(await names(first), []);
      assert.ok((await names(second)).includes('no-contracts-to-dvt-runtime'));
      assert.deepEqual(await names(first), []);
      writeFixtureFiles(first, { [forbiddenFile]: forbiddenSource });
      assert.ok((await names(first)).includes('no-contracts-to-dvt-runtime'));
      writeFixtureFiles(first, { [forbiddenFile]: 'export default 1;\n' });
      assert.deepEqual(await names(first), []);
    } finally {
      removeFixtureRoot(second);
    }
  } finally {
    removeFixtureRoot(first);
  }
});

test('explicit acquisition rejects absent configuration and invalid target scope', async () => {
  const root = createDependencyFixture(validFiles);
  try {
    await assert.rejects(
      runDependencyCruiseReport(root, { ...request, configFile: join(root, 'absent.cjs') })
    );
    await assert.rejects(runDependencyCruiseReport(root, { ...request, targets: [] }), TypeError);
    await assert.rejects(runDependencyCruiseReport(root, { ...request, targets: [42] }), TypeError);
    writeFixtureFiles(root, { 'invalid.json': '{invalid' });
    await assert.rejects(
      runDependencyCruiseReport(root, { ...request, configFile: join(root, 'invalid.json') })
    );
    writeFixtureFiles(root, { 'tsconfig.json': '{invalid' });
    await assert.rejects(runDependencyCruiseReport(root, request));
  } finally {
    removeFixtureRoot(root);
  }
});

test('package identity and public entry exceptions remain enforced without a package inventory', async () => {
  const cases = [
    ['fixture-a', 'fixture-a', 'internal.ts', false, false],
    ['fixture-a', 'fixture-b', 'internal.ts', false, true],
    ['fixture-a', 'fixture-b', 'internal.ts', true, true],
    ['fixture-a', 'fixture-a-extra', 'internal.ts', false, true],
    ['fixture-a-extra', 'fixture-a', 'internal.ts', false, true],
    ...['index.ts', 'runtime.ts', 'testing.ts', 'contracts/planner/value.ts'].map((entry) => [
      'fixture-new',
      'fixture-b',
      entry,
      false,
      false,
    ]),
    ['fixture-a', 'fixture-b', 'index.ts/internal.ts', false, true],
    ['fixture-a', 'fixture-b', 'area/index.ts', false, true],
  ];
  for (const [from, to, entry, typeOnly, denied] of cases) {
    const target = `../../${to}/src/${entry.replace(/\.ts$/u, '.js')}`;
    const source = typeOnly
      ? `import type { Value } from '${target}'; export type { Value };\n`
      : `import value from '${target}'; export default value;\n`;
    const violations = await collectDependencyViolations({
      [`packages/@dvt/${from}/src/index.ts`]: source,
      [`packages/@dvt/${to}/src/${entry}`]: 'export default 1; export interface Value {}\n',
    });
    assert.equal(
      violations.includes('no-cross-package-deep-imports'),
      denied,
      JSON.stringify({ from, to, entry, typeOnly })
    );
  }
});

test('default acquisition retains production targets and fixture cleanup rejects unowned roots', async () => {
  const root = createDependencyFixture({
    'apps/api/src/index.ts': "import value from './value.js'; export default value;\n",
    'apps/api/src/value.ts': 'export default 1;\n',
    'packages/@dvt/contracts/src/index.ts': 'export default 1;\n',
    'tools/proof.ts': 'export default 1;\n',
    '.dependency-cruiser.cjs': readFileSync(DEPCRUISE_CONFIG, 'utf8'),
  });
  try {
    const report = await runDependencyCruiseReport(root);
    assert.deepEqual(report.summary.violations, []);
    assert.ok(report.modules.some((module) => module.source.startsWith('apps/')));
    assert.ok(report.modules.some((module) => module.source.startsWith('packages/')));
    assert.ok(!report.modules.some((module) => module.source.startsWith('tools/')));
    assert.throws(() => removeFixtureRoot(process.cwd()));
  } finally {
    removeFixtureRoot(root);
  }
});
