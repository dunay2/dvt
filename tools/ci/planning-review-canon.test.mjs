/**
 * Owned concern: validate that planning review intake links executable work to
 * GitHub Issues without recreating a local task lifecycle.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertContains,
  assertFilesExist,
  escapeRegExp,
  readRepoFile,
} from './canonization-guard.mjs';

const requiredFiles = [
  'docs/planning/state/github-mvp-issue-workflow.md',
  'docs/planning/reviews/review-naming-policy.md',
  'docs/architecture/components/ci-governance/planning-review-canon-component.md',
  'docs/architecture/components/ci-governance/planning-review-canon-user-stories.md',
  'docs/architecture/components/ci-governance/index.md',
];

test('planning review canonization preserves GitHub issue task authority', () => {
  assertFilesExist(requiredFiles);

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/planning-review-canon-component.md'
  );
  for (const requiredHeading of [
    '## Public API',
    '## Invariants',
    '## Transitions',
    '## Consumers',
    '## Command And Query Rail',
    '## Semantic Fitness Function',
    '## Diagrams',
  ]) {
    assert.match(componentGuide, new RegExp(escapeRegExp(requiredHeading)));
  }
  for (const rail of ['ValidatePlanningReviewBoardTraceability']) {
    assert.match(
      componentGuide,
      new RegExp(escapeRegExp(rail)),
      `component must define rail ${rail}`
    );
  }
  for (const retiredToken of [
    'ClassifyPlanningReviewIntake',
    'RecordPlanningReviewFollowUp',
    'planning:db:operate task',
    'Planning DB is the canonical execution queue',
  ]) {
    assert.doesNotMatch(componentGuide, new RegExp(escapeRegExp(retiredToken)));
  }

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/planning-review-canon-user-stories.md'
  );
  for (const scenario of [
    'Review Steward Links Executable Work To GitHub',
    'Sprint Operator Avoids A Parallel Backlog',
    'Reviewer Checks Naming And Linkage Drift',
    'Agent Selects The Next MVP Issue From GitHub',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(scenario)));
  }

  assertContains('docs/planning/state/github-mvp-issue-workflow.md', 'is the only task backlog');
  assertContains(
    'docs/planning/state/github-mvp-issue-workflow.md',
    'lifecycle authority for MVP delivery'
  );
  assertContains(
    'docs/architecture/components/ci-governance/index.md',
    'Planning Review Canon Component'
  );
});
