/** Owned concern: pr quality governance.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import yaml from 'js-yaml';
import { buildCiScopeOutputs } from '../ci-scope-outputs.mjs';
import { assertWorkflowContains, assertWorkflowExcludes } from './assertions.mjs';

const PR_QUALITY_GOVERNANCE_COMMANDS = [
  'pnpm docs:gov:filenames:changed',
  'pnpm docs:gov:frontmatter:changed',
  'pnpm docs:governance:unit-coverage',
  'pnpm traceability:adr0',
  'pnpm docs:feature-mechanization',
  'pnpm qa:artifact:check',
  'pnpm arch:deps',
];

test('PR quality does not materialize human documentation indexes', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  assertWorkflowExcludes(prQualityGate, 'pnpm docs:sync:check');
});

test('PR quality gate keeps merge-blocking non-projection governance commands wired', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(prQualityGate, 'pnpm docs:gov:locations -- --changed-only');
  assert.doesNotMatch(
    prQualityGate,
    /if:\s*github\.event_name == 'pull_request'[^\n]*steps\.scope\.outputs\.docs_changed[^\n]*\n\s*run: pnpm docs:gov:locations\n/u
  );

  for (const command of PR_QUALITY_GOVERNANCE_COMMANDS) {
    assertWorkflowContains(prQualityGate, command);
  }
});

test('PR quality gate consumes prepush-equivalent scope outputs for expensive gates', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).governance_global_relevant'
  );
  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).traceability_adr0_relevant'
  );
  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).feature_mechanization_relevant'
  );
  assertWorkflowContains(
    prQualityGate,
    'fromJSON(needs.detect-pr-scope.outputs.workflow_scope).code_validation_relevant'
  );
});

test('PR quality gate prepares planning DB for its remaining DB-backed consumers', () => {
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const preparePlanningDbAction = readFileSync(
    '.github/actions/prepare-planning-db/action.yml',
    'utf8'
  );
  const steps = yaml.load(prQualityGate).jobs['pr-checks'].steps;
  const preparations = steps.filter(
    (step) => step.uses === './.github/actions/prepare-planning-db'
  );
  assert.equal(preparations.length, 1);
  const preparation = preparations[0];
  const consumers = steps.filter((step) => step.run?.startsWith('pnpm planning:db:'));
  for (const command of [
    'pnpm planning:db:inventory:check',
    'pnpm planning:db:integrity:check --bootstrap',
  ]) {
    assert.ok(
      consumers.some((step) => step.run === command),
      command
    );
  }
  for (const consumer of consumers) assert.ok(steps.indexOf(preparation) < steps.indexOf(consumer));
  // Evaluate the folded YAML Actions reads against the existing classifier's actual outputs.
  const selected = (step, event, outputs, manualOptIn) =>
    runInNewContext(step.if.replaceAll('needs.detect-pr-scope', "needs['detect-pr-scope']"), {
      github: { event_name: event, event: { inputs: { run_typecheck_gate: manualOptIn } } },
      needs: { 'detect-pr-scope': { outputs } },
      fromJSON: JSON.parse,
    });
  for (const [path, expected] of [
    ['docs/architecture/components/api/dbt-project-analysis-component.md', false],
    ['tools/docs/check-links.ts', false],
    ['scripts/planning-db-query.cjs', true],
    ['tools/ci/pr-quality-workflow-contract.test.mjs', false],
  ]) {
    const outputs = buildCiScopeOutputs([path]);
    const prepared = selected(preparation, 'pull_request', outputs, 'false');
    assert.equal(prepared, expected, path);
    for (const consumer of consumers) {
      const consumerSelected = selected(consumer, 'pull_request', outputs, 'false');
      assert.equal(consumerSelected, expected, `${path}: ${consumer.run}`);
      if (consumerSelected) assert.equal(prepared, true, consumer.run);
    }
  }
  for (const [event, optIn, expected] of [
    ['push', 'false', true],
    ['workflow_dispatch', 'true', true],
    ['workflow_dispatch', 'false', false],
  ])
    assert.equal(selected(preparation, event, {}, optIn), expected, event + optIn);
  for (const outputs of [{}, { workflow_scope: '{' }]) {
    assert.throws(() => selected(preparation, 'pull_request', outputs, 'false'));
    for (const consumer of consumers)
      assert.throws(() => selected(consumer, 'pull_request', outputs, 'false'));
  }
  assert.equal(selected(preparation, 'pull_request', { workflow_scope: '{}' }, 'false'), false);
  assertWorkflowExcludes(preparation.if, 'feature_mechanization_relevant');
  assertWorkflowExcludes(prQualityGate, 'pnpm docs:dbt-roundtrip-capabilities:check');
  assertWorkflowExcludes(prQualityGate, 'DVT_GIT_EVIDENCE_REPO');
  assert.doesNotMatch(prQualityGate, /import-governance:/u);
  assertWorkflowContains(preparePlanningDbAction, 'pnpm planning:db:import');
  const cryptoBuildIndex = preparePlanningDbAction.indexOf('pnpm --filter @dvt/crypto build');
  const schemaLoadIndex = preparePlanningDbAction.indexOf('node scripts/planning-db-schema.cjs');
  const planningImportIndex = preparePlanningDbAction.indexOf('pnpm planning:db:import');
  assert.notEqual(cryptoBuildIndex, -1);
  assert.notEqual(schemaLoadIndex, -1);
  assert.ok(cryptoBuildIndex < schemaLoadIndex, 'build crypto before its first schema consumer');
  assert.ok(cryptoBuildIndex < planningImportIndex);
  assert.doesNotMatch(preparePlanningDbAction, /planning:db:migrate/u);
  assertWorkflowContains(prQualityGate, 'GIT_BASE:');
  assertWorkflowContains(prQualityGate, 'github.event.pull_request.base.sha');
  assertWorkflowContains(prQualityGate, 'GIT_HEAD: ${{ github.sha }}');
});
