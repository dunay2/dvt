/** Owned concern: prove the scope-aware changed-slice verification plan. */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVerifyChangedPlan,
  commandLabel,
  executeVerifyChangedPlan,
  parseArgs,
} = require('./verify-changed.cjs');

function labelsFor(files) {
  return buildVerifyChangedPlan(files).map(commandLabel);
}

test('buildVerifyChangedPlan keeps docs-only iteration on changed-file gates', () => {
  const labels = labelsFor(['docs/planning/templates/component-engineering-record-template.md']);

  assert.deepEqual(labels, [
    'node scripts/docs-workboard-check-changed.cjs',
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
});

test('buildVerifyChangedPlan adds planning DB validation for planning query-store changes', () => {
  const labels = labelsFor([
    'scripts/planning-db-query.cjs',
    'tools/planning-db/migrations/022_component_engineering_record_query.sql',
  ]);

  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(labels.filter((label) => label === 'pnpm test:planning:db').length, 1);
  assert.ok(
    labels.indexOf('pnpm planning:db:inventory:check') < labels.indexOf('pnpm test:planning:db')
  );
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

test('buildVerifyChangedPlan self-tests prepush verifier changes', () => {
  const labels = labelsFor(['scripts/verify-prepush.cjs']);

  assert.ok(labels.includes('node --test scripts/verify-changed.test.cjs'));
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

test('parseArgs supports dry-run planning without executing commands', () => {
  assert.deepEqual(parseArgs(['--dry-run']), { dryRun: true });
  assert.throws(() => parseArgs(['--unknown']), /Unknown argument: --unknown/);
});
