/**
 * Owned concern: validate that active documentation disposition findings are
 * canonized through the planning DB queue instead of acting as a parallel docs backlog.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/proposals/mandatory/governance-and-docs/docs-disposition-canon-plan-20260524.md',
  'docs/architecture/components/ci-governance/docs-disposition-canon-component.md',
  'docs/architecture/components/ci-governance/docs-disposition-canon-user-stories.md',
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/status/docs-task-disposition-inventory-20260510.md',
  'buzon/20260524-codex-fowler-docs-disposition-canon.md',
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

test('docs disposition canonization has semantic ownership and DB-first closure', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
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

  const analysis = readRepoFile('buzon/20260524-codex-fowler-docs-disposition-canon.md');
  for (const section of [
    '## Fowler Analysis',
    '## Mature-System Comparison',
    '## Antipatterns',
    '## Drift',
    '## Applied Pattern',
  ]) {
    assert.match(analysis, new RegExp(escapeRegExp(section)));
  }
});
