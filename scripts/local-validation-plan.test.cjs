/**
 * Owned concern: prove ordered composition and complete versus partial validation.
 * @baseline Local Changed Files Gate: preserve each selected contract and failure boundary.
 * @decision Move existing assertions with their concrete owner instead of copying routing data.
 * @consequence Partial selection cannot hide lost coverage or acceptance obligations.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildVerifyChangedPlan } = require('./local-validation-plan.cjs');

const { effectiveNodeTestFiles } = require('./lib/local-test-coverage.cjs');
const { commandLabel } = require('./lib/local-validation-plan-values.cjs');

const MIXED_CHANGED_FILES = [
  'apps/web/src/testing/vitestSuites.architecture.test.ts',
  'tools/planning-db/schema/manifest.cjs',
  'scripts/local-validation-plan.cjs',
  'scripts/check-changed.cjs',
];
function labelsFor(files) {
  return buildVerifyChangedPlan(files).map(commandLabel);
}

const packagePath = path.resolve(__dirname, '../package.json');
const packageScripts = JSON.parse(fs.readFileSync(packagePath, 'utf8')).scripts;

test('core aggregate and direct CLI changes retain every contract without conflicting step identities', () => {
  const plan = buildVerifyChangedPlan([
    'scripts/local-validation-plan.cjs',
    'scripts/verify-changed.cjs',
    'scripts/verify-prepush.cjs',
  ]);
  const selected = effectiveNodeTestFiles(plan);
  for (const member of packageScripts['test:verify-prepush'].split(/\s+/u).slice(2)) {
    assert.equal(selected.filter((file) => file === member).length, 1, member);
  }
});

test('CI iteration is partial Vitest feedback with real focused DB contracts and unchanged defaults', () => {
  const files = ['apps/web/src/app/views/CodeView.tsx', 'tools/planning-db/schema/manifest.cjs'];
  const complete = buildVerifyChangedPlan(files);
  const partial = buildVerifyChangedPlan(files, { iteration: true });
  for (const id of [
    'planning-db-inventory-check',
    'planning-db-integrity-check',
    'feature-mechanization-implementation',
  ]) {
    assert.ok(
      complete.some((step) => step.id === id),
      id
    );
    assert.ok(!partial.some((step) => step.id === id), id);
  }
  assert.deepEqual(partial.find((step) => step.id === 'test-web-changed').args, [
    'test:web:changed',
    '--phase=vitest',
  ]);
  assert.deepEqual(complete.find((step) => step.id === 'test-web-changed').args, [
    'test:web:changed',
  ]);
  assert.ok(partial.some((step) => step.args.includes('test:planning:db:current-schema')));
  assert.ok(partial.some((step) => step.id === 'check-changed'));
  assert.equal(partial.at(-1).id, 'forbidden-tracked-files');
  assert.deepEqual(buildVerifyChangedPlan([], { iteration: true }), []);
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
  const labels = labelsFor([
    'scripts/planning-db-query.cjs',
    'tools/planning-db/schema/manifest.cjs',
  ]);

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
  const labels = labelsFor(['tools/planning-db/schema/manifest.cjs']);

  assert.equal(labels.filter((label) => label === 'pnpm governance:db:import').length, 0);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:inventory:check').length, 1);
  assert.equal(labels.filter((label) => label === 'pnpm planning:db:integrity:check').length, 1);
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan covers direct schema edits through the complete current-schema suite', () => {
  const labels = labelsFor([
    'scripts/planning-db-schema.test.cjs',
    'tools/planning-db/schema/manifest.cjs',
  ]);

  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('node --test scripts/planning-db-schema.test.cjs'));
  assert.ok(!labels.includes('pnpm test:planning:db'));
});

test('buildVerifyChangedPlan keeps mixed docs and planning DB slices targeted and deduped', () => {
  const labels = labelsFor([
    'docs/guides/testing-and-ci-capabilities.md',
    'scripts/planning-db-import.cjs',
    'scripts/planning-db-import.test.cjs',
    'scripts/planning-db-schema.test.cjs',
    'tools/planning-db/schema/manifest.cjs',
  ]);

  assert.deepEqual(labels, [...new Set(labels)]);
  assert.equal(
    labels.filter((label) => label === 'node --test scripts/planning-db-import.test.cjs').length,
    1
  );
  assert.equal(
    labels.filter((label) => label === 'pnpm test:planning:db:current-schema').length,
    1
  );
  assert.ok(!labels.includes('node --test scripts/planning-db-schema.test.cjs'));
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

test('buildVerifyChangedPlan retains every mixed-scope gate once with static checks before tests', () => {
  const plan = buildVerifyChangedPlan(MIXED_CHANGED_FILES);
  const labels = plan.map(commandLabel);
  const admissionEnd = plan.findIndex((step) => step.id === 'check-changed');
  assert.deepEqual(labels.slice(0, admissionEnd + 1), [
    'pnpm planning:db:knowledge-intake:retirement:check',
    'pnpm planning:db:inventory:check',
    'pnpm planning:db:integrity:check',
    'pnpm docs:gov:locations -- --changed-only',
    'pnpm docs:gov:filenames:changed',
    'pnpm docs:gov:frontmatter:changed',
    'pnpm docs:arc:evidence:check -- --changed-only',
    'pnpm qa:artifact:check',
    'pnpm lint:md:changed',
    'pnpm docs:feature-mechanization:implementation',
    'node scripts/check-changed.cjs',
  ]);
  assert.ok(
    plan.filter((step) => step.kind === 'test').every((step) => plan.indexOf(step) > admissionEnd)
  );
  assert.ok(
    plan.findIndex((step) => step.id === 'test-ci-tools') <
      plan.findIndex((step) => step.id === 'test-web-changed')
  );
  assert.equal(plan.at(-1).id, 'forbidden-tracked-files');
  assert.equal(new Set(plan.map((step) => step.id)).size, plan.length);
  const selected = effectiveNodeTestFiles(plan);
  assert.equal(selected.length, new Set(selected).size);
  for (const member of packageScripts['test:verify-prepush'].split(/\s+/u).slice(2))
    assert.ok(selected.includes(member), member);
});

test('buildVerifyChangedPlan self-tests developer workflow verifier changes', () => {
  const selected = effectiveNodeTestFiles(
    buildVerifyChangedPlan(['scripts/local-validation-plan.cjs'])
  );
  for (const member of packageScripts['test:verify-prepush'].split(/\s+/u).slice(2))
    assert.equal(selected.filter((file) => file === member).length, 1, member);
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
