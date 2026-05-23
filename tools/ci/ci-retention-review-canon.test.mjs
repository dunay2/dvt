/**
 * Owned concern: validate that CI, delivery, and retention reviews have a
 * canonical disposition instead of acting as an implicit execution queue.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/reviews/review-status-board.md',
  'docs/planning/domains/event-lifecycle-and-retention.md',
  'docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md',
  'docs/architecture/components/ci-governance/ci-retention-review-canon-component.md',
  'docs/architecture/components/ci-governance/ci-retention-review-canon-user-stories.md',
  'buzon/20260523-codex-fowler-ci-retention-review-canon.md',
];

function readRepoFile(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function assertContains(path, expected) {
  assert.match(
    readRepoFile(path),
    typeof expected === 'string' ? new RegExp(escapeRegExp(expected)) : expected,
    `${path} must contain ${expected.toString()}`
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('CI, delivery, and retention review canonization has semantic ownership', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

  assertContains(
    'docs/planning/reviews/review-status-board.md',
    '2026-05-23 CI Delivery Retention Review Canonical Disposition'
  );
  assertContains('docs/planning/reviews/review-status-board.md', 'D-REV-CI-RETENTION-CANON');
  assertContains(
    'docs/planning/reviews/review-status-board.md',
    'No CI, delivery, or retention review remains an orphan execution queue'
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

  const analysis = readRepoFile('buzon/20260523-codex-fowler-ci-retention-review-canon.md');
  for (const section of [
    '## Fowler Analysis',
    '## Mature-System Comparison',
    '## Antipatterns',
    '## Drift',
    '## Applied Pattern',
  ]) {
    assert.match(analysis, new RegExp(escapeRegExp(section)));
  }

  assertContains(
    'docs/planning/domains/event-lifecycle-and-retention.md',
    'CI Retention Review Canon Plan 2026-05-23'
  );
});
