/**
 * Owned concern: validate that runtime/API review canonization has a semantic
 * disposition, component contract, user stories, and Fowler analysis.
 */
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const requiredFiles = [
  'docs/planning/reviews/review-status-board.md',
  'docs/planning/domains/execution-runtime.md',
  'docs/planning/proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md',
  'docs/architecture/components/api/runtime-review-canon-component.md',
  'docs/architecture/components/api/runtime-review-canon-user-stories.md',
  'buzon/20260523-codex-fowler-runtime-review-canon.md',
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

test('runtime review canonization has a semantic disposition and component contract', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

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

  const analysis = readRepoFile('buzon/20260523-codex-fowler-runtime-review-canon.md');
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
    'docs/planning/domains/execution-runtime.md',
    'Runtime Review Canon Plan 2026-05-23'
  );
});
