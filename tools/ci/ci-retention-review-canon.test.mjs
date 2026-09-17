/**
 * Owned concern: validate that CI, delivery, and retention reviews have a
 * canonical disposition instead of acting as an implicit execution queue.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertCanonPlan,
  assertContains,
  assertFilesExist,
  escapeRegExp,
  readRepoFile,
} from './canonization-guard.mjs';

const requiredFiles = [
  'docs/planning/state/github-mvp-issue-workflow.md',
  'docs/planning/domains/event-lifecycle-and-retention.md',
  'docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md',
  'docs/architecture/components/ci-governance/ci-retention-review-canon-component.md',
  'docs/architecture/components/ci-governance/ci-retention-review-canon-user-stories.md',
];

test('CI, delivery, and retention review canonization has semantic ownership', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md'
  );

  assertContains('docs/planning/state/github-mvp-issue-workflow.md', 'is the only task backlog');
  assertContains(
    'docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md',
    'featureId: D-REV-CI-RETENTION-CANON'
  );

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/ci-retention-review-canon-component.md'
  );
  for (const requiredHeading of [
    '## Public API',
    '## Invariants',
    '## Transitions',
    '## Consumers',
    '## Command And Query Rail',
    '## Semantic Fitness Function',
  ]) {
    assert.match(componentGuide, new RegExp(escapeRegExp(requiredHeading)));
  }
  assert.match(componentGuide, /ClassifyCiRetentionReviewDisposition/);
  assert.match(componentGuide, /RecordCiRetentionReviewCanon/);

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/ci-retention-review-canon-user-stories.md'
  );
  for (const persona of [
    'CI maintainer',
    'Delivery maintainer',
    'Retention maintainer',
    'Planning steward',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }

  assertContains(
    'docs/planning/domains/event-lifecycle-and-retention.md',
    'CI Retention Review Canon Plan 2026-05-23'
  );
});
