/**
 * Owned concern: validate that the Canvas Fowler remediation proposal is
 * canonized as executable frontend governance instead of remaining an orphan
 * proposal.
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
  'docs/planning/reviews/review-status-board.md',
  'docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md',
  'docs/architecture/components/web/graph/canvas-fowler-canon-component.md',
  'docs/architecture/components/web/graph/canvas-fowler-canon-user-stories.md',
  'docs/architecture/components/web/graph/index.md',
];

test('Canvas Fowler remediation canonization has semantic ownership', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md'
  );

  assertContains(
    'docs/planning/reviews/review-status-board.md',
    '2026-05-23 Canvas Fowler Canonical Disposition'
  );
  assertContains('docs/planning/reviews/review-status-board.md', 'F-MAND-CANVAS-FOWLER');
  assertContains(
    'docs/planning/reviews/review-status-board.md',
    'No Canvas Fowler remediation proposal remains an orphan execution queue'
  );

  const componentGuide = readRepoFile(
    'docs/architecture/components/web/graph/canvas-fowler-canon-component.md'
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
  assert.match(componentGuide, /ClassifyCanvasFowlerDisposition/);
  assert.match(componentGuide, /RecordCanvasFowlerCanon/);
  assert.match(componentGuide, /RenderCanvasContextualGraphSurface/);

  const userStories = readRepoFile(
    'docs/architecture/components/web/graph/canvas-fowler-canon-user-stories.md'
  );
  for (const persona of [
    'Canvas maintainer',
    'Frontend maintainer',
    'Planning steward',
    'Browser proof reviewer',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }

  assertContains(
    'docs/architecture/components/web/graph/index.md',
    'Canvas Fowler Canon Component'
  );
});
