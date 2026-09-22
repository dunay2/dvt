/** Owned concern: bind the existing governance gate to explicit candidate evidence. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';

const workflow = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
const steps = workflow.jobs['pr-checks'].steps;
const step = steps.find((entry) => entry.name === 'Validate feature implementation mechanization');

test('the DB implementation gate receives the actual immutable comparison endpoints', () => {
  assert.ok(step, 'Existing command must remain the gate');
  assert.ok(step.run.split('\n').includes('pnpm docs:feature-mechanization:implementation'));
  assert.match(step.env?.GIT_BASE ?? '', /github\.event\.pull_request\.base\.sha/);
  assert.match(step.env?.GIT_BASE ?? '', /github\.event\.before/);
  assert.equal(step.env?.GIT_HEAD, '${{ github.sha }}');
});

test('manual validation requires a supplied base instead of an automatic empty comparison', () => {
  assert.equal(workflow.on.workflow_dispatch.inputs.comparison_base?.type, 'string');
  assert.equal(
    step.env.GIT_BASE,
    '${{ github.event.pull_request.base.sha || github.event.before || inputs.comparison_base }}'
  );
  assert.match(step.run.split('\n')[0], /^: "\$\{GIT_BASE:\?[^}]+\}"$/);
});
