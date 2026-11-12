/** Owned concern: workflow governance preparation.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import { assertWorkflowContains, countWorkflowCommand } from './assertions.mjs';

test('the canonical docs sync rail consumes existing Planning DB authority without importing', () => {
  const packageScripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
  const localDocsPreflight = readFileSync('scripts/docs-pr-local.cjs', 'utf8');

  assert.equal(packageScripts['docs:sync'], 'node scripts/sync-docs.cjs');
  assert.doesNotMatch(packageScripts['docs:sync'], /planning:db:(?:up|health|import)/u);
  assert.match(packageScripts['docs:sync:check'], /^pnpm docs:sync &&/u);
  assert.match(packageScripts['docs:ci'], /^pnpm docs:sync &&/u);
  assert.match(localDocsPreflight, /\['pnpm', \['docs:sync:check'\]\]/u);
});

test('main full CI prepares Planning DB before the full validation baseline', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const preparePlanningDbAction = readFileSync(
    '.github/actions/prepare-planning-db/action.yml',
    'utf8'
  );
  const steps = yaml.load(ciWorkflow).jobs['full-ci'].steps;
  const prepareDbIndex = steps.findIndex(
    (step) => step.uses === './.github/actions/prepare-planning-db'
  );
  const fullBaselineIndex = steps.findIndex((step) => step.name === 'Run full CI baseline');

  assert.notEqual(prepareDbIndex, -1);
  assert.notEqual(fullBaselineIndex, -1);
  assert.ok(prepareDbIndex < fullBaselineIndex);
  assert.equal(steps[fullBaselineIndex].env.PLANNING_DB_INTEGRITY_SCOPE, 'bootstrap');
  assert.doesNotMatch(ciWorkflow, /import-governance:/u);
  assertWorkflowContains(preparePlanningDbAction, 'pnpm planning:db:import');
  assert.doesNotMatch(preparePlanningDbAction, /planning:db:migrate/u);
});

test('PR quality gate is the single remote owner for ADR-0000 traceability', () => {
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const prQualityGate = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');

  assert.equal(countWorkflowCommand(prQualityGate, 'pnpm traceability:adr0'), 1);
  assert.equal(countWorkflowCommand(ciWorkflow, 'pnpm traceability:adr0'), 0);
});
