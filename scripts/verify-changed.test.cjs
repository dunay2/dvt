/** Owned concern: prove the scope-aware changed-slice verification plan. */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFocusedChangedTestPlan,
  buildVerifyChangedPlan,
  commandLabel,
  executeVerifyChangedPlan,
  main,
  parseArgs,
} = require('./verify-changed.cjs');

function labelsFor(files) {
  return buildVerifyChangedPlan(files).map(commandLabel);
}

function focusedLabelsFor(files) {
  return buildFocusedChangedTestPlan(files).map(commandLabel);
}

test('buildFocusedChangedTestPlan retains adjacent script tests without duplicating general gates', () => {
  const labels = focusedLabelsFor([
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/git-local-changes.cjs',
    'scripts/planning-db-query.cjs',
  ]);

  assert.deepEqual(labels, [
    'node --test scripts/git-local-changes.test.cjs',
    'node --test scripts/planning-db-query.test.cjs',
  ]);
  assert.ok(!labels.includes('pnpm lint:md:changed'));
  assert.ok(!labels.includes('pnpm test:web:changed'));
  assert.ok(!labels.includes('pnpm governance:db:import'));
});

test('buildFocusedChangedTestPlan retains the ordinary-workflow publication guard', () => {
  const labels = focusedLabelsFor([
    '.github/workflows/pr-quality-gate.yml',
    'scripts/documentation-publication.test.cjs',
  ]);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/documentation-publication.test.cjs')
      .length,
    1
  );
});

test('buildVerifyChangedPlan keeps docs-only iteration on changed-file gates', () => {
  const labels = labelsFor(['docs/planning/templates/component-engineering-record-template.md']);

  assert.deepEqual(labels, [
    'pnpm planning:db:knowledge-intake:retirement:check',
    'pnpm docs:gov:locations -- --changed-only',
    'pnpm docs:gov:filenames:changed',
    'pnpm docs:gov:frontmatter:changed',
    'pnpm docs:arc:evidence:check -- --changed-only',
    'pnpm qa:artifact:check',
    'pnpm lint:md:changed',
    'pnpm docs:feature-mechanization:implementation',
    'node scripts/check-changed.cjs',
    'node scripts/check-forbidden-tracked-files.cjs',
  ]);

  assert.ok(!labels.includes('pnpm docs:governance:document-unit-map:check'));
  assert.ok(!labels.includes('pnpm docs:governance:file-component-index:check'));
  assert.ok(!labels.includes('pnpm docs:governance:file-fingerprint-baseline:check'));
  assert.ok(!labels.includes('pnpm docs:governance:coverage-report:check'));
  assert.ok(!labels.includes('pnpm docs:governance:remediation-queue:check'));
  assert.ok(!labels.includes('pnpm verify:prepush'));
  assert.ok(!labels.includes('node scripts/docs-workboard-check-changed.cjs'));
});

test('buildVerifyChangedPlan adds planning DB validation for planning query-store changes', () => {
  const labels = labelsFor(['scripts/planning-db-query.cjs', 'tools/planning-db/schema.sql']);

  assert.equal(labels.filter((label) => label === 'pnpm governance:db:import').length, 0);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:integrity:check').length, 1);
  assert.ok(
    labels.indexOf('pnpm planning:db:inventory:check') <
      labels.indexOf('pnpm planning:db:integrity:check')
  );
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-query.test.cjs').length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs the buzon retirement guard before markdown gates', () => {
  const labels = labelsFor(['buzon/new-fowler-analysis.md']);

  assert.ok(labels.includes('pnpm planning:db:knowledge-intake:retirement:check'));
  assert.ok(
    labels.indexOf('pnpm planning:db:knowledge-intake:retirement:check') <
      labels.indexOf('pnpm docs:gov:locations -- --changed-only')
  );
});

test('buildVerifyChangedPlan routes schema-only changes to the current-schema suite', () => {
  const labels = labelsFor(['tools/planning-db/schema.sql']);

  assert.equal(labels.filter((label) => label === 'pnpm governance:db:import').length, 0);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:integrity:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan avoids duplicate schema tests when the suite is already direct', () => {
  const labels = labelsFor(['scripts/planning-db-schema.test.cjs', 'tools/planning-db/schema.sql']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-schema.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db:current-schema'));
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan keeps mixed docs and planning DB slices targeted and deduped', () => {
  const labels = labelsFor([
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-schema.test.cjs',
    'tools/planning-db/schema.sql',
  ]);

  assert.deepEqual(labels, [...new Set(labels)]);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-import.test.cjs').length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-schema.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db:current-schema'));
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed planning DB tests directly', () => {
  const labels = labelsFor(['scripts/planning-db-surface-inventory-check.test.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/planning-db-surface-inventory-check.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan routes planning DB query shards to the canonical suite', () => {
  const labels = labelsFor([
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'scripts/planning-db-query-tests/fowler-analysis.test.cjs',
    'scripts/planning-db-query-tests/governance-refresh.test.cjs',
    'scripts/planning-db-query-tests/helpers.cjs',
  ]);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-query.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs focused frontend component inventory tests directly', () => {
  const labels = labelsFor(['scripts/planning-db/frontend-component-inventory.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/planning-db-frontend-component-inventory.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed governance DB tests directly', () => {
  const labels = labelsFor(['scripts/governance-db-import.test.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/governance-db-import.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan reuses canonical planning DB scope for inventory checks', () => {
  const labels = labelsFor(['scripts/governance-generated-paths.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs adjacent planning workflow tests without the full DB suite', () => {
  const labels = labelsFor(['scripts/governance-refresh.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/governance-refresh.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed closeout helper tests directly', () => {
  const labels = labelsFor(['scripts/closeout-changed.cjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/closeout-changed.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs targeted governance report generator tests for AI-sized changes', () => {
  const labels = labelsFor([
    'scripts/generate-governance-coverage-report.cjs',
    'scripts/generate-governance-remediation-queue.cjs',
  ]);

  assert.ok(!labels.includes('pnpm planning:db:inventory:check'));
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-coverage-report.test.cjs'
    ).length,
    1
  );
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-remediation-queue.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs targeted ownership generator tests for AI-sized changes', () => {
  const labels = labelsFor([
    'scripts/check-governance-unit-coverage.cjs',
    'scripts/generate-governance-file-component-index.cjs',
    'scripts/generate-governance-document-unit-map.cjs',
  ]);

  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/check-governance-unit-coverage.test.cjs'
    ).length,
    1
  );
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-file-component-index.test.cjs'
    ).length,
    1
  );
  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-document-unit-map.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs changed governance report tests directly', () => {
  const labels = labelsFor(['scripts/generate-governance-remediation-queue.test.cjs']);

  assert.equal(
    labels.filter(
      (label) => label === 'node --test scripts/generate-governance-remediation-queue.test.cjs'
    ).length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan runs governed changed web suites for web changes', () => {
  const labels = labelsFor(['apps/web/src/testing/vitestSuites.architecture.test.ts']);

  assert.equal(labels.filter((label) => label === 'pnpm test:web:changed').length, 1);
  assert.ok(
    labels.indexOf('pnpm docs:feature-mechanization:implementation') <
      labels.indexOf('pnpm test:web:changed')
  );
  assert.ok(
    labels.indexOf('pnpm test:web:changed') < labels.indexOf('node scripts/check-changed.cjs')
  );
});

test('buildVerifyChangedPlan self-tests developer workflow verifier changes', () => {
  const labels = labelsFor(['scripts/local-validation-plan.cjs']);

  assert.ok(labels.includes('node --test scripts/verify-changed.test.cjs'));
  assert.ok(labels.includes('node --test scripts/verify-prepush.test.cjs'));
});

test('buildVerifyChangedPlan runs changed AI preflight tests directly', () => {
  const labels = labelsFor(['scripts/ai-preflight.cjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test scripts/ai-preflight.test.cjs').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan routes CI tooling modules to adjacent tests', () => {
  const labels = labelsFor(['tools/ci/repository-command-catalog.mjs']);

  assert.equal(
    labels.filter((label) => label === 'node --test tools/ci/repository-command-catalog.test.mjs')
      .length,
    1
  );
  assert.ok(!labels.includes('pnpm test:ci-tools'));
});

test('buildVerifyChangedPlan runs changed CI tooling tests directly and deduped', () => {
  const labels = labelsFor([
    'tools/ci/repository-command-catalog.mjs',
    'tools/ci/repository-command-catalog.test.mjs',
    'tools/ci/workflow-pattern-parity.test.mjs',
  ]);

  assert.deepEqual(labels, [...new Set(labels)]);
  assert.equal(
    labels.filter((label) => label === 'node --test tools/ci/repository-command-catalog.test.mjs')
      .length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'node --test tools/ci/workflow-pattern-parity.test.mjs')
      .length,
    1
  );
  assert.ok(!labels.includes('pnpm test:ci-tools'));
});

test('buildVerifyChangedPlan self-tests changed verifier changes without prepush verifier tests', () => {
  const labels = labelsFor(['scripts/verify-changed.cjs']);

  assert.ok(labels.includes('node --test scripts/verify-changed.test.cjs'));
  assert.ok(!labels.includes('node --test scripts/verify-prepush.test.cjs'));
});

test('buildVerifyChangedPlan self-tests prepush verifier changes without changed verifier tests', () => {
  const labels = labelsFor(['scripts/verify-prepush.cjs']);

  assert.ok(!labels.includes('node --test scripts/verify-changed.test.cjs'));
  assert.ok(labels.includes('node --test scripts/verify-prepush.test.cjs'));
});

test('executeVerifyChangedPlan stops at the first failed check', () => {
  const calls = [];
  const status = executeVerifyChangedPlan(
    [
      { id: 'first', command: 'node', args: ['first.cjs'] },
      { id: 'second', command: 'node', args: ['second.cjs'] },
    ],
    {
      spawn: (command, args) => {
        calls.push(commandLabel({ command, args }));
        return { status: calls.length === 1 ? 7 : 0 };
      },
    }
  );

  assert.equal(status, 7);
  assert.deepEqual(calls, ['node first.cjs']);
});

test('main records a reusable prepush stamp after successful changed verification', () => {
  const changedFiles = ['apps/web/src/app/AppProviders.tsx'];
  const stamps = [];
  const status = main([], {
    changedFiles,
    executeVerifyChangedPlan: () => 0,
    printPlan: () => {},
    writePrepushStamp: (stamp) => stamps.push(stamp),
    buildPrepushStamp: (files) => ({
      validationLevel: 'default',
      changedFiles: files,
      stateFingerprint: 'same-tree',
    }),
  });

  assert.equal(status, 0);
  assert.deepEqual(stamps, [
    {
      validationLevel: 'default',
      changedFiles,
      stateFingerprint: 'same-tree',
    },
  ]);
});

test('main does not record a prepush stamp when changed verification fails', () => {
  const stamps = [];
  const status = main([], {
    changedFiles: ['apps/web/src/app/AppProviders.tsx'],
    executeVerifyChangedPlan: () => 7,
    printPlan: () => {},
    writePrepushStamp: (stamp) => stamps.push(stamp),
  });

  assert.equal(status, 7);
  assert.deepEqual(stamps, []);
});

test('main runs focused tests from the exact committed diff without writing a local stamp', () => {
  const calls = [];
  const stamps = [];
  const status = main(['--committed-tests'], {
    listCommittedChangedFiles: () => ['scripts/planning-db-query.cjs'],
    executeFocusedChangedTestPlan: (plan) => {
      calls.push(...plan.map(commandLabel));
      return 0;
    },
    printPlan: () => {},
    writePrepushStamp: (stamp) => stamps.push(stamp),
  });

  assert.equal(status, 0);
  assert.deepEqual(calls, ['node --test scripts/planning-db-query.test.cjs']);
  assert.deepEqual(stamps, []);
});

test('parseArgs supports dry-run planning without executing commands', () => {
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true, committedTests: false });
  assert.deepEqual(parseArgs(['--committed-tests']), {
    dryRun: false,
    committedTests: true,
  });
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument: --unknown/);
});
