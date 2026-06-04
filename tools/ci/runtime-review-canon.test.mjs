/**
 * Owned concern: validate that runtime/API review canonization has a semantic
 * disposition, component contract, user stories, and Fowler analysis.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCanonPlan,
  assertContains,
  assertFilesExist,
  escapeRegExp,
  readRepoFile,
} from './canonization-guard.mjs';

const requiredFiles = [
  'docs/planning/reviews/review-status-board.md',
  'docs/planning/domains/execution-runtime.md',
  'docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md',
  'docs/architecture/components/api/runtime-review-canon-component.md',
  'docs/architecture/components/api/runtime-review-canon-user-stories.md',
];

test('runtime review canonization has a semantic disposition and component contract', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md'
  );

  assertContains(
    'docs/planning/reviews/review-status-board.md',
    '2026-05-23 Runtime Review Canonical Disposition'
  );
  assertContains('docs/planning/reviews/review-status-board.md', 'C-REV-RUNTIME-CANON');
  assertContains(
    'docs/planning/reviews/review-status-board.md',
    'No runtime review remains an orphan execution queue'
  );

  const componentGuide = readRepoFile(
    'docs/architecture/components/api/runtime-review-canon-component.md'
  );
  for (const requiredHeading of [
    '## Public API',
    '## Invariants',
    '## Transitions',
    '## Consumers',
    '## Command And Query Rail',
    '## Semantic Fitness Function',
  ]) {
    assert.match(
      componentGuide,
      new RegExp(escapeRegExp(requiredHeading)),
      `runtime component guide must include ${requiredHeading}`
    );
  }
  assert.match(
    componentGuide,
    /ClassifyRuntimeReviewDisposition/,
    'component guide must name the semantic query rail'
  );
  assert.match(
    componentGuide,
    /RecordRuntimeReviewCanon/,
    'component guide must name the semantic command rail'
  );

  const userStories = readRepoFile(
    'docs/architecture/components/api/runtime-review-canon-user-stories.md'
  );
  for (const persona of ['Runtime maintainer', 'API maintainer', 'Planning steward']) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }

  assertContains(
    'docs/planning/domains/execution-runtime.md',
    'Runtime Review Canon Plan 2026-05-23'
  );
});
