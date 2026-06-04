/**
 * Owned concern: validate that active documentation disposition findings are
 * canonized through the planning DB queue instead of acting as a parallel docs backlog.
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
  'docs/planning/proposals/mandatory/governance-and-docs/docs-disposition-canon-plan-20260524.md',
  'docs/architecture/components/ci-governance/docs-disposition-canon-component.md',
  'docs/architecture/components/ci-governance/docs-disposition-canon-user-stories.md',
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/status/docs-task-disposition-inventory-20260510.md',
];

test('docs disposition canonization has semantic ownership and DB-first closure', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/governance-and-docs/docs-disposition-canon-plan-20260524.md'
  );

  for (const path of requiredFiles) {
    assertContains(path, 'ResolveDocsDispositionQueue');
    assertContains(path, 'ClassifyDocsDispositionClosure');
  }

  assertContains(
    'docs/planning/domains/documentation-governance.md',
    'Docs Disposition Canon Plan 2026-05-24'
  );
  assertContains('docs/planning/domains/documentation-governance.md', 'GD-DOC-DISPOSITION-CANON');
  assertContains(
    'docs/planning/domains/documentation-governance.md',
    'No Draft, Superseded, or task-like identifier finding remains an open parallel documentation backlog'
  );

  assertContains(
    'docs/planning/status/docs-task-disposition-inventory-20260510.md',
    '2026-05-24 Canonical Disposition'
  );
  assertContains(
    'docs/planning/status/docs-task-disposition-inventory-20260510.md',
    'planning:db:query docs-disposition --resolution open'
  );
  assertContains(
    'docs/planning/status/docs-task-disposition-inventory-20260510.md',
    'returns no open rows'
  );

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/docs-disposition-canon-component.md'
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
  assert.match(componentGuide, /ResolveDocsDispositionQueue/);
  assert.match(componentGuide, /ClassifyDocsDispositionClosure/);

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/docs-disposition-canon-user-stories.md'
  );
  for (const persona of [
    'Documentation maintainer',
    'Planning steward',
    'Architecture reviewer',
    'Governance operator',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }
});
