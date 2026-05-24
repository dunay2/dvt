/**
 * Owned concern: validate that planning review boards and sprint intake rules
 * are canonized into Planning DB-owned follow-up semantics instead of becoming
 * a parallel board-file backlog.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md',
  'docs/planning/reviews/review-status-board.md',
  'docs/planning/reviews/review-naming-policy.md',
  'docs/planning/reviews/sprints/index.md',
  'docs/architecture/components/ci-governance/planning-review-canon-component.md',
  'docs/architecture/components/ci-governance/planning-review-canon-user-stories.md',
  'docs/architecture/components/ci-governance/index.md',
  'buzon/20260524-codex-fowler-planning-review-canon.md',
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

test('planning review canonization preserves DB-first review intake semantics', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

  const plan = readRepoFile(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md'
  );
  for (const rail of [
    'ClassifyPlanningReviewIntake',
    'RecordPlanningReviewFollowUp',
    'ValidatePlanningReviewBoardTraceability',
  ]) {
    assert.match(plan, new RegExp(escapeRegExp(rail)), `plan must define rail ${rail}`);
  }
  for (const marker of [
    'GD-REV-PLANNING-CANON',
    'review-status-board.md',
    'review-naming-policy.md',
    'reviews/sprints/index.md',
    'Planning DB is the write surface',
  ]) {
    assert.match(plan, new RegExp(escapeRegExp(marker)), `plan must contain ${marker}`);
  }

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

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/planning-review-canon-user-stories.md'
  );
  for (const scenario of [
    'Review steward promotes a finding to Planning DB',
    'Sprint operator avoids a parallel board backlog',
    'Reviewer checks naming and linkage drift',
    'Agent selects the next task from DB state',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(scenario)));
  }

  const analysis = readRepoFile('buzon/20260524-codex-fowler-planning-review-canon.md');
  for (const section of [
    '## Fowler Analysis',
    '## Mature-System Comparison',
    '## Improved Patterns',
    '## Antipatterns',
    '## Component Grouping',
    '## Future Lessons',
    '## Repetition And Drift',
    '## Applied Pattern',
    '## Opportunities',
  ]) {
    assert.match(analysis, new RegExp(escapeRegExp(section)));
  }

  assertContains(
    'docs/planning/reviews/review-status-board.md',
    '2026-05-24 Planning review canonical disposition'
  );
  assertContains(
    'docs/planning/reviews/sprints/index.md',
    'Planning DB is the canonical execution queue'
  );
  assertContains(
    'docs/architecture/components/ci-governance/index.md',
    'Planning Review Canon Component'
  );
});
