/**
 * Owned concern: validate that the DVT workbench UX draft is dispositioned into
 * governed frontend delivery work instead of remaining a parallel UX backlog.
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
  'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md',
  'docs/architecture/components/web/workbench-ux-canon-component.md',
  'docs/architecture/components/web/workbench-ux-canon-user-stories.md',
  'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md',
  'docs/architecture/components/web/index.md',
  'docs/planning/proposals/portfolio-map-20260403.md',
];

test('DVT workbench UX draft canonization has semantic ownership', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md'
  );

  assertContains(
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md',
    'canonical_disposition: F-MAND-WORKBENCH-UX'
  );
  assertContains(
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md',
    'accepted_subset: dvt-workbench-ux-canon-plan-20260524'
  );

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
