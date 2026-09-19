/**
 * Owned concern: validate the current DVT workbench UX authority and the
 * disposition of historical input without retaining a parallel UX backlog.
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
  'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md',
  'docs/architecture/components/web/workbench-ux-canon-component.md',
  'docs/architecture/components/web/workbench-ux-canon-user-stories.md',
  'docs/architecture/components/web/screen-manuals-and-user-stories.md',
  'docs/architecture/components/web/index.md',
  'docs/planning/proposals/portfolio-map-20260403.md',
];

test('DVT workbench UX canonization preserves current authority and semantic ownership', () => {
  assertFilesExist(requiredFiles);
  const canonPlan = assertCanonPlan(
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md'
  );

  assertContains(
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md',
    'featureId: F-MAND-WORKBENCH-UX'
  );
  assertContains(
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md',
    'screen-manuals-and-user-stories.md'
  );
  assertContains('docs/planning/state/github-mvp-issue-workflow.md', 'is the only task backlog');
  assert.doesNotMatch(
    canonPlan,
    /\bPlanning\s+DB\s+tasks?\b/u,
    'Executable UX work belongs to GitHub Issues, not Planning DB tasks'
  );
  assert.match(
    canonPlan,
    /cypressFlows:\s*\n\s+- N\/A[^\n]*\bGitHub issue\b/u,
    'Canon-only Cypress disposition must route future execution to its governing GitHub issue'
  );
  const screenManual = readRepoFile(
    'docs/architecture/components/web/screen-manuals-and-user-stories.md'
  );
  assert.match(screenManual, /Process Map as the persistent primary surface/u);
  assert.match(screenManual, /Code and node details opened contextually/u);
  assert.match(screenManual, /### Shell workspace context/u);

  const componentGuide = readRepoFile(
    'docs/architecture/components/web/workbench-ux-canon-component.md'
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
  assert.match(componentGuide, /ClassifyWorkbenchUxDisposition/);
  assert.match(componentGuide, /RecordWorkbenchUxCanon/);
  assert.match(componentGuide, /ValidateWorkbenchShellContract/);

  const userStories = readRepoFile(
    'docs/architecture/components/web/workbench-ux-canon-user-stories.md'
  );
  for (const persona of [
    'Frontend Maintainer',
    'Canvas Maintainer',
    'Route Workbench Owner',
    'Planning Steward',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }

  assertContains('docs/architecture/components/web/index.md', 'Workbench UX Canon Component');
  assertContains(
    'docs/planning/proposals/portfolio-map-20260403.md',
    'DVT Workbench UX Canon Plan 2026-05-24'
  );
});
