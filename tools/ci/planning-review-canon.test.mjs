/**
 * Owned concern: validate that planning review boards and sprint intake rules
 * are canonized into Planning DB-owned follow-up semantics instead of becoming
 * a parallel board-file backlog.
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
  'docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md',
  'docs/planning/reviews/review-status-board.md',
  'docs/planning/reviews/review-naming-policy.md',
  'docs/planning/reviews/sprints/index.md',
  'docs/architecture/components/ci-governance/planning-review-canon-component.md',
  'docs/architecture/components/ci-governance/planning-review-canon-user-stories.md',
  'docs/architecture/components/ci-governance/index.md',
];

test('planning review canonization preserves DB-first review intake semantics', () => {
  assertFilesExist(requiredFiles);

  const plan = assertCanonPlan(
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
