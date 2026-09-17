/**
 * Owned concern: validate that active documentation disposition findings are
 * canonized through the planning DB queue instead of acting as a parallel docs backlog.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
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

  const { surfaces } = JSON.parse(
    readRepoFile('tools/planning-db/state/db-governance-surfaces.json')
  );
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

// This is a retirement guard, not a substitute for DB-backed docs generation.
test('retired historical packs and generators cannot return', () => {
  const retiredPaths = [
    'docs/archive',
    'docs/planning/archive',
    'docs/planning/proposals/superseded/runtime-and-contracts',
    'docs/planning/status/planner-local-doc-triage-20260320.md',
    'docs/planning/status/root-local-doc-triage-20260417.md',
    'docs/adr/_archive',
    'docs/evidence/archive',
    'docs/planning/proposals/disposable/manifests/planner-stage-1-1-canonicalization.manifest.json',
    'docs/planning/proposals/disposable/manifests/planner-stage-1-1-canonicalization.manifest.schema.json',
    'tools/docs/validate-planner-stage-1-1-manifest.ts',
    'docs/planning/proposals/mandatory/governance-and-docs/planner-local-doc-archive-plan-20260601.md',
  ];
  for (const path of retiredPaths) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }

  const { scripts } = JSON.parse(readRepoFile('package.json'));
  assert.equal(Object.hasOwn(scripts, 'docs:gov:planner-stage-1-1'), false);
  for (const command of Object.values(scripts)) {
    assert.equal(command.includes('docs:gov:planner-stage-1-1'), false);
    assert.equal(command.includes('validate-planner-stage-1-1-manifest.ts'), false);
  }

  const syncSource = readRepoFile('scripts/sync-docs.cjs');
  assert.doesNotMatch(syncSource, /relPath:\s*['"](?:archive|adr\/_archive)['"]/u);
  assert.equal(syncSource.includes('[Archived ADRs](_archive/index.md)'), false);

  const { artifactClasses } = JSON.parse(readRepoFile('docs/generated-docs-policy.json'));
  const owners = artifactClasses.filter((entry) => entry.id === 'tracked-docs-sync-indexes');
  assert.equal(owners.length, 1);
  const [owner] = owners;
  assert.equal(owner.generatorCommand, 'pnpm docs:sync');
  assert.equal(owner.manualEditPolicy, 'generator-owned');
  for (const path of ['docs/archive/index.md', 'docs/adr/_archive/index.md']) {
    assert.equal(owner.artifacts.includes(path), false, path);
    assert.equal(scripts['docs:sync:check'].includes(path), false, path);
  }
  for (const path of ['docs/adr/index.md', 'docs/evidence/index.md']) {
    assert.ok(owner.artifacts.includes(path), path);
    assert.ok(scripts['docs:sync:check'].includes(path), path);
  }
});

test('current records do not point to retired planning files as local evidence', () => {
  const walk = (directory) =>
    readdirSync(new URL(`../../${directory}`, import.meta.url), { withFileTypes: true }).flatMap(
      (entry) => {
        const path = `${directory}/${entry.name}`;
        if (entry.isDirectory()) return walk(path);
        return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
      }
    );

  for (const path of walk('docs/planning/proposals/mandatory')) {
    assert.doesNotMatch(readRepoFile(path), /^archived_record:/mu, path);
  }
  for (const directory of ['docs/evidence', 'docs/risk-register']) {
    for (const path of walk(directory)) {
      assert.doesNotMatch(
        readRepoFile(path),
        /(?<![\w/])docs\/planning\/archive\/[\w./-]+\.md/u,
        path
      );
    }
  }
});
