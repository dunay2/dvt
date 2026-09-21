/** Owned concern: bind the existing governance gate to explicit candidate evidence. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';

const workflow = yaml.load(readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8'));
const steps = workflow.jobs['pr-checks'].steps;

test('the DB implementation gate receives the actual immutable comparison endpoints', () => {
  const step = steps.find(
    (entry) => entry.run === 'pnpm docs:feature-mechanization:implementation'
  );
  assert.ok(step, 'Existing command must remain the gate');
  assert.match(step.env?.GIT_BASE ?? '', /github\.event\.pull_request\.base\.sha/);
  assert.match(step.env?.GIT_BASE ?? '', /github\.event\.before/);
  assert.equal(step.env?.GIT_HEAD, '${{ github.sha }}');
});
