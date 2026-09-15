/**
 * Owned concern: validate that active documentation disposition findings are
 * canonized through the planning DB queue instead of acting as a parallel docs backlog.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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
];

const retiredSnapshots = [
  'docs/planning/status/docs-task-disposition-inventory-20260510.md',
  'docs/planning/status/review-proposal-disposition-index-20260510.md',
];

// Historical text saying "no open rows" cannot prove current DB closure.
// Protect the existing authority and retirement instead of freezing that text.
test('retired disposition snapshots do not return as files or canonical authority', () => {
  for (const path of retiredSnapshots) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }

  const { surfaces } = JSON.parse(readRepoFile('tools/planning-db/state/db-governance-surfaces.json'));
  assert.ok(Array.isArray(surfaces));
  assert.equal(
    surfaces.some((surface) => surface.surfaceName === 'Docs task disposition inventory'),
    false
  );
  for (const surface of surfaces) {
    for (const path of retiredSnapshots) {
      assert.equal(JSON.stringify(surface).includes(path), false, path);
    }
  }

  const owners = surfaces.filter((surface) => surface.surfaceName === 'Docs resolution overlays');
  assert.equal(owners.length, 1);
  const [owner] = owners;
  assert.equal(owner.authorityMode, 'database');
  assert.equal(owner.writeRailKind, 'db_command');
  assert.equal(owner.writeRail, 'pnpm planning:db:operate docs-disposition resolve');
  assert.equal(owner.readQueryRail, 'pnpm planning:db:query docs-disposition --resolution <state>');
  assert.equal(
    owner.canonicalSource,
    'planning_query_store.doc_resolution_overlays keyed to current source hashes'
  );
});

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
