/**
 * Owned concern: validate that the DVT workbench UX draft is dispositioned into
 * governed frontend delivery work instead of remaining a parallel UX backlog.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-canon-plan-20260524.md',
  'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md',
  'docs/architecture/components/web/workbench-ux-canon-component.md',
  'docs/architecture/components/web/workbench-ux-canon-user-stories.md',
  'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md',
  'docs/architecture/components/web/index.md',
  'docs/planning/proposals/portfolio-map-20260403.md',
  'buzon/20260524-codex-fowler-workbench-ux-canon.md',
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

test('DVT workbench UX draft canonization has semantic ownership', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

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

  const analysis = readRepoFile('buzon/20260524-codex-fowler-workbench-ux-canon.md');
  for (const section of [
    '## Fowler Analysis',
    '## Mature-System Comparison',
    '## Antipatterns',
    '## Repetitions',
    '## Drift',
    '## Applied Pattern',
  ]) {
    assert.match(analysis, new RegExp(escapeRegExp(section)));
  }

  assertContains('docs/architecture/components/web/index.md', 'Workbench UX Canon Component');
  assertContains(
    'docs/planning/proposals/portfolio-map-20260403.md',
    'DVT Workbench UX Canon Plan 2026-05-24'
  );
});
