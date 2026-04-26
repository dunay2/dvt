import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import yaml from 'js-yaml';

function readText(path) {
  return readFileSync(path, 'utf8');
}

function findTask(lane, taskId) {
  return lane.tasks.find((task) => task.task_id === taskId);
}

test('Lane E TF-E2-L status matches the governed Fowler QA verdict', () => {
  const lane = yaml.load(readText('docs/planning/state/agent-lane-e.yaml'));
  const review = readText(
    'docs/planning/reviews/architecture-and-governance/20260425-canvas-graph-strategy-fowler-hard-qa-review.md'
  );
  const task = findTask(lane, 'TF-E2-L');

  assert.match(
    review,
    /`TF-E2-L` closed the false authoring topology policy, DBT fail-closed adapter\s+validation, active-document strategy selection, graph-strategy route-posture\s+leakage, and canonical admission\/projection split\./
  );
  assert.equal(task.status, 'done');
  assert.equal(task.progress_pct, 100);
});
