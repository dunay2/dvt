/** Owned concern: keep authoritative implementation validation local, not CI-imported. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import validationPlan from '../../scripts/local-validation-plan.cjs';

const workflow = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
const steps = workflow.jobs['pr-checks'].steps;
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const implementationCommand = 'pnpm docs:feature-mechanization:implementation';

test('the normal mechanization test command includes its real Git regressions', () => {
  assert.ok(
    scripts['test:docs:feature-mechanization']
      .split(/\s+/)
      .includes('scripts/lib/feature-mechanization-git-diff.test.cjs')
  );
});

test('PR and full CI retain manifest checks without claiming DB implementation validation', () => {
  assert.ok(steps.some((entry) => entry.run === 'pnpm docs:feature-mechanization'));
  assert.ok(steps.every((entry) => !entry.run?.includes(implementationCommand)));
  assert.ok(scripts['ci:full'].split(' && ').includes('pnpm ci:docs'));
  const docsCommands = scripts['ci:docs'].split(' && ');
  assert.ok(docsCommands.includes('pnpm docs:feature-mechanization'));
  assert.ok(!docsCommands.includes(implementationCommand));
});

test('local verification keeps the real implementation gate while committed CI tests stay DB-free', () => {
  const files = ['apps/web/src/app/views/canvas/CanvasView.tsx'];
  const commands = validationPlan.buildVerifyChangedPlan(files).map(validationPlan.commandLabel);
  assert.ok(commands.includes(implementationCommand));
  assert.ok(scripts['docs:gov'].split(' && ').includes(implementationCommand));
  assert.match(scripts['docs:feature-mechanization:implementation'], /--implementation\b/u);
  const focusedCommands = validationPlan
    .buildFocusedChangedTestPlan(files)
    .map(validationPlan.commandLabel);
  assert.ok(!focusedCommands.includes(implementationCommand));
});

test('manual CI has no unused local-comparison input', () => {
  assert.equal(workflow.on.workflow_dispatch.inputs.comparison_base, undefined);
});

test('PR Git governance prepares its runtime dependency independently of the DB route', () => {
  const checkIndex = steps.findIndex(
    (step) => step.run === 'pnpm docs:governance:changed-files:check'
  );
  const buildIndex = steps.findIndex((step) => step.run === 'pnpm --filter @dvt/crypto build');
  assert.ok(buildIndex >= 0 && buildIndex < checkIndex);
  assert.equal(steps[buildIndex].if, "github.event_name == 'pull_request'");
  assert.equal(steps[buildIndex].if, steps[checkIndex].if);
});
