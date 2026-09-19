/**
 * Owned concern: validate that active documentation disposition findings are
 * canonized through the planning DB queue instead of acting as a parallel docs backlog.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
    'docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout.md',
    'docs/planning/closeouts/F-04-RISK-B-mock-workspace-isolation-closeout.md',
    'docs/planning/reviews/sprints',
    'docs/planning/proposals/tradeoffs',
    'docs/planning/proposals/mandatory/governance-and-docs/ar-d6-triple-versioning-governance-review-plan-20260513.md',
    'docs/planning/proposals/mandatory/governance-and-docs/ea-20260429-engine-audit-disposition-plan-20260513.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-review-canon-plan-20260524.md',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md',
    'docs/planning/proposals/mandatory/governance-and-docs/post-merge-planning-closeout-drift-problem-20260508.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-operational-evidence-drift-reconciliation-plan-20260522.md',
    'docs/planning/reviews/review-status-board.md',
    'docs/planning/roadmap/diagrams/review-sprint-capacity-2026-04.md',
    'docs/planning/roadmap/diagrams/review-sprint-critical-path-2026-04.md',
    'docs/planning/roadmap/diagrams/review-sprint-dependency-graph-2026-04.md',
    'docs/planning/roadmap/diagrams/review-sprint-timeline-2026-04.md',
    'docs/planning/roadmap/review-remediation-roadmap-20260402.md',
    'docs/planning/proposals/superseded/runtime-and-contracts',
    'docs/planning/proposals/superseded/runtime-and-delivery',
    'docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md',
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

test('retired efficiency playbook has no live local consumers', () => {
  const retiredPath =
    'docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md';
  const basename = retiredPath.split('/').at(-1);
  const provenance =
    'https://github.com/dunay2/dvt/blob/1b07acde33300a19d97914eb719b262b44e79182/' + retiredPath;
  const files = execFileSync(
    'git',
    [
      'ls-files',
      '-z',
      '--',
      'AGENTS.md',
      'CLAUDE.md',
      'docs',
      'scripts',
      'tools',
      '.github',
      'package.json',
    ],
    {
      encoding: 'utf8',
    }
  )
    .split('\0')
    .filter(Boolean);
  for (const path of files) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs' || path === retiredPath) continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    const content = readRepoFile(path).replaceAll(provenance, '');
    assert.equal(content.includes(basename), false, `retired efficiency review reference: ${path}`);
  }
  assertContains('AGENTS.md', 'docs/guides/pr-preflight-and-ci-triage.md');
  const guide = readRepoFile('docs/guides/pr-preflight-and-ci-triage.md');
  for (const marker of [
    '## Conflict Triage And Cleanup Safety',
    'conflict markers',
    'explicit opt-in',
    'failed job logs first',
    'pnpm verify:prepush',
  ]) {
    assert.ok(guide.includes(marker), `missing retained practice: ${marker}`);
  }
});

test('retired runtime delivery plans have no tracked consumers', () => {
  const retiredNames = [
    'dvt_production_readiness_corrected_review_and_roadmap.md',
    'gap4-backpressure-admission-pr4-planb-20260326.md',
    'superseded/runtime-and-delivery',
  ];
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  for (const path of files) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    const content = readRepoFile(path);
    for (const name of retiredNames) {
      assert.equal(content.includes(name), false, `retired runtime delivery reference: ${path}`);
    }
  }
});

// Pinned Git provenance is not active navigation. The sole raw-command exception
// below preserves the exact recorded ARC evidence invocation, not a rerun recipe.
test('retired legacy planning pack has no operational consumers', () => {
  const retiredMarkers = [
    'F-04-RISK-A-QA-03-backend-owned-planref-closeout.md',
    'F-04-RISK-B-mock-workspace-isolation-closeout.md',

    'ar-d6-triple-versioning-governance-review-plan-20260513.md',
    'ea-20260429-engine-audit-disposition-plan-20260513.md',
    'planning-review-canon-plan-20260524.md',
    'planning-state-query-store-plan-20260506.md',
    'post-merge-planning-closeout-drift-problem-20260508.md',
    'ar-c2-operational-evidence-drift-reconciliation-plan-20260522.md',
    'proposal-portfolio-tradeoffs-20260403.md',
    'review-status-board.md',
    'board-001-start-run-coordinator-extraction.md',
    'board-002-event-payload-versioning.md',
    'board-003-rc-c2-cycle-closure.md',
    'board-004-lint-staged-script-coverage.md',
    'board-005-diff-semantics-consistency.md',
    'board-006-review-link-stability-hardening.md',
    'board-007-typed-compiled-code-ref-contract.md',
    'board-008-observability-hash-decoupling.md',
    'board-009-retry-reservation-contract-mandatory.md',
    'board-010-step-executor-port-definition.md',
    'board-011-snapshot-schema-versioning.md',
    'board-012-input-hash-plan-cache-port.md',
    'board-013-per-step-kind-policy-vocabulary.md',
    'board-014-manifest-schema-validation-at-boundary.md',
    'board-015-intent-reconciler-distributed-lease.md',
    'board-016-admission-backpressure-temporal-queue-depth.md',
    'review-sprint-capacity-2026-04.md',
    'review-sprint-critical-path-2026-04.md',
    'review-sprint-dependency-graph-2026-04.md',
    'review-sprint-timeline-2026-04.md',
    'review-remediation-roadmap-20260402.md',
    'reviews/sprints',
    'sprints/index.md',
    'sprint-2026-04a',
    'sprint-2026-04b',
    'sprint-2026-04c',
    'tradeoffs/',
  ];
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const provenance =
    /https:\/\/github\.com\/dunay2\/dvt\/blob\/d8c3e3b9479139a35d6e269f6a6ef42dde2080f6\/[^\s)<>\]`]+/gu;
  let preservedCommand = false;
  for (const path of files) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    let content = readRepoFile(path);
    if (path === 'docs/evidence/ED-20260419-plan-compile-language-alignment-arc2.md') {
      const lines = content.split('\n');
      content = lines
        .map((line) => {
          if (!line.includes('review-status-board.md')) return line;
          const digest = execFileSync('git', ['hash-object', '--stdin'], {
            input: line.trim(),
            encoding: 'utf8',
          }).trim();
          assert.equal(
            digest,
            '291120e04a8583a06a84e4af0c1586b3f0093d86',
            'historical evidence invocation changed'
          );
          preservedCommand = true;
          return '';
        })
        .join('\n');
    }
    if (path === 'tools/ci/repository-change-scope.mjs') {
      // Keep existing validation routing for a reintroduced retired path.
      content = content.replace(
        "'docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md'",
        ''
      );
    }
    content = content.replace(provenance, '');
    for (const marker of retiredMarkers) {
      assert.equal(content.includes(marker), false, `legacy planning consumer: ${path}: ${marker}`);
    }
  }
  assert.equal(preservedCommand, true, 'recorded evidence must be preserved');
  assertContains('docs/planning/state/github-mvp-issue-workflow.md', 'is the only task backlog');
});

// Completed editorial journals do not replace current contracts or issue history.
test('retired documentation-only closeouts have no files or local consumers', () => {
  const contractCloseouts = new Set([
    '20260318-stage-1-1-planner-canonicalization-companion-boundary-closeout.md',
    '20260318-stage-1-1-planner-canonicalization-contract-evolution-protocol-closeout.md',
    '20260318-stage-1-1-planner-canonicalization-policy-vocabulary-contracts-closeout.md',
  ]);
  const editorialCloseouts = new Set([
    '20260331-dhm-ws5-b-engine-test-fixture-modularization-closeout.md',
    '20260419-tf-a1-c10-preview-route-facade-finalization-closeout.md',
    '20260419-tf-a1-c11-plan-route-grammar-ownership-closeout.md',
    '20260419-tf-a1-c12-plan-route-facade-regression-hardening-closeout.md',
    '20260419-tf-a1-c12-plan-route-facade-standardization-closeout.md',
    '20260419-tf-a1-c13-import-ownership-canonicalization-closeout.md',
    '20260419-tf-a1-c6-preview-route-facade-realignment-closeout.md',
    '20260419-tf-a1-c7-import-route-facade-realignment-closeout.md',
    '20260419-tf-a1-c8-preview-route-helper-seams-closeout.md',
    '20260419-tf-a1-c9-preview-contract-guard-and-scope-qa-closeout.md',
    '20260420-adapter-temporal-test-fixture-alignment-closeout.md',
    '20260420-adapter-temporal-test-seams-hardening-closeout.md',
    '20260420-api-http-error-mapper-srp-decomposition-closeout.md',
    '20260420-tf-a1-c15-c16-plan-route-seam-hardening-closeout.md',
    '20260420-tf-a1-c17-plan-route-request-resolution-recipe-closeout.md',
    '20260420-tf-a1-c18-plan-compile-boundary-ownership-convergence-closeout.md',
    '20260420-tf-a1-c19-plan-route-policy-catalog-and-envelope-convergence-closeout.md',
    '20260601-planning-db-import-test-fixture-reuse-closeout.md',
    '20260601-planning-db-migration-suite-routing-closeout.md',
    '20260601-planning-db-test-file-routing-closeout.md',
    '20260602-web-mechanical-truth-inventory-closeout.md',
    '20260904-gh-2896-retire-empty-canvas-guide-closeout.md',
    '20260316-principal-architecture-review-closeout.md',
    '20260413-web-config-hardening-closeout.md',
    '20260416-tf-e2-web-typecheck-hardening-closeout.md',
    '20260417-graph-architecture-doc-pack-split-closeout.md',
    '20260417-planning-gaps-governance-refresh-closeout.md',
    '20260417-root-local-doc-canonicalization-closeout.md',
    '20260417-root-local-doc-english-integration-closeout.md',
    '20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md',
    '20260423-docs-frontmatter-bom-governance-fix-closeout.md',
    '20260423-docs-markdown-parser-componentization-closeout.md',
    '20260423-rc-c2-wave-2c-prepush-affected-typecheck-closeout.md',
    '20260423-rc-c2-wave-3a-docs-manifest-determinism-closeout.md',
    '20260423-rc-c2-wave-3b-changed-doc-governance-closeout.md',
    '20260423-rc-c2-wave-3c-generated-doc-single-writer-closeout.md',
    '20260511-doc-gov-file-shards-closeout.md',
    '20260522-f24-parent-visual-token-convergence-closeout.md',
    '20260601-ai-targeted-governance-report-tests-closeout.md',
    '20260601-api-test-ci-lifecycle-bypass-closeout.md',
    '20260601-ci-remote-turbo-cache-closeout.md',
    '20260601-governance-owner-matcher-precompile-closeout.md',
    '20260601-governance-refresh-db-first-import-gate-closeout.md',
    '20260601-local-dbfirst-command-dedupe-closeout.md',
    '20260602-ci-affected-preflight-dedupe-closeout.md',
    '20260603-ci-security-analysis-scope-closeout.md',
    '20260315-architecture-components-map-closeout.md',
    '20260315-docs-governance-hardening-closeout.md',
    '20260315-markdown-location-governance-closeout.md',
    '20260316-phase2-arch-roadmap-closeout.md',
    '20260317-adapter-temporal-pretest-split-closeout.md',
    '20260317-outbox-worker-script-dedup-closeout.md',
    '20260317-repo-rule-git-commit-escalation-closeout.md',
    '20260317-tsconfig-app-base-closeout.md',
    '20260318-contracts-generated-artifact-cleanup-closeout.md',
    '20260331-zensical-single-config-migration-closeout.md',
    '20260402-evidence-information-architecture-classification-closeout.md',
    '20260402-evidence-information-architecture-phase3-migration-closeout.md',
    '20260402-rc-g1-governance-startup-reconciliation-closeout.md',
    '20260406-mw-a4-step-kind-extension-guide-closeout.md',
    '20260407-f23-git-file-history-docs-first-closeout.md',
    '20260411-pr911-merge-conflict-resolution-closeout.md',
    '20260413-pr-895-release-branch-reconciliation-closeout.md',
    '20260413-pr-926-web-toolchain-compatibility-closeout.md',
    '20260514-ci-audit-adr0-owner-closeout.md',
    '20260515-ci-audit-contracts-scope-closeout.md',
    '20260515-ci-audit-release-flow-closeout.md',
    '20260522-cfg-ts-t1-baseurl-deprecation-plan-closeout.md',
    '20260522-f24-canvas-route-chrome-token-convergence-closeout.md',
    '20260522-f24-context-panel-token-convergence-closeout.md',
    '20260522-f24-dbt-node-renderer-token-convergence-closeout.md',
    '20260522-f24-lineage-panel-token-convergence-closeout.md',
    '20260522-f24-monaco-visual-token-convergence-closeout.md',
    '20260522-f24-react-flow-token-convergence-closeout.md',
    '20260522-f25-plugin-capability-table-closeout.md',
    '20260525-f29-canvas-workbench-proposal-disposition-closeout.md',
    '20260601-ci-workflow-policy-fanout-trim-closeout.md',
    '20260603-ci-draft-ready-workflow-gates-closeout.md',
    '20260315-architecture-review-docs-closeout.md',
    '20260315-review-markdown-relocation-closeout.md',
    '20260316-engine-docs-current-state-closeout.md',
    '20260317-package-module-build-policy-proposal-closeout.md',
    '20260317-principal-architecture-review-execution-plan-closeout.md',
    '20260317-proposal-set-alignment-closeout.md',
    '20260402-evidence-information-architecture-proposal-closeout.md',
    '20260514-f13-frontend-architecture-doc-reconciliation-closeout.md',
    '20260331-zensical-primary-docs-runtime-closeout.md',
    '20260515-lane-e-p0-review-reconciliation-closeout.md',
  ]);
  const isRetired = (name) =>
    editorialCloseouts.has(name) ||
    (/^202603(?:17|18)-stage-1-1-planner-canonicalization-[a-z0-9-]+-closeout\.md$/u.test(name) &&
      !contractCloseouts.has(name));

  const directory = new URL('../../docs/planning/closeouts/', import.meta.url);
  for (const name of readdirSync(directory)) {
    assert.equal(isRetired(name), false, `retired editorial closeout: ${name}`);
  }

  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    // Only exact Git revisions can supply historical provenance, never main.
    const current = readRepoFile(path).replace(
      /https:\/\/github\.com\/dunay2\/dvt\/blob\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
      ''
    );
    for (const match of current.matchAll(/\b[0-9]{8}-[a-z0-9.-]+-closeout(?:\.md)?\b/gu)) {
      const name = match[0].endsWith('.md') ? match[0] : `${match[0]}.md`;
      assert.equal(
        isRetired(name),
        false,
        `retired editorial closeout reference: ${path}: ${name}`
      );
    }
  }
});

// Git holds the obsolete snapshots; current authorities and product tests remain.
test('retired atlas and superseded Canvas guidance have no live consumers', () => {
  const retiredFiles = [
    'docs/architecture/components/web/astproposal.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-empty-guide-preference-plan-20260602.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f29c-canvas-insert-palette-plan-20260525.md',
    'docs/planning/closeouts/20260602-canvas-empty-guide-preference-closeout.md',
    'docs/planning/reviews/architecture-and-governance/20260307-architecture-doc-consolidation-matrix-review.md',
  ];
  for (const path of ['docs/architecture/atlas', ...retiredFiles]) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }
  const retiredNames = retiredFiles.map((path) => path.split('/').at(-1).replace(/\.md$/u, ''));
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    const current = readRepoFile(path).replace(
      /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
      ''
    );
    const retiredAtlasPath = /docs\/architecture\/atlas\/|(?:^|[\s("'`])(?:\.\.?\/)*atlas\//u;
    assert.doesNotMatch(current, retiredAtlasPath, `retired atlas reference: ${path}`);
    for (const name of retiredNames) {
      assert.equal(current.includes(name), false, `retired guidance reference: ${path}: ${name}`);
    }
  }
  assertFilesExist([
    'docs/architecture/reference-architecture.md',
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-canon-plan-20260523.md',
    'docs/planning/state/github-mvp-issue-workflow.md',
    'apps/web/src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts',
  ]);
});

// PR conversations and one-off command logs belong in Git/GitHub, not live files.
test('retired PR drafts and historical intake have no files or live consumers', () => {
  const retiredDirectories = ['.gh-comments', '.git.bfg-report'];
  const retiredFiles = [
    'docs/planning/closeouts/20260423-rc-c2-post-merge-ci-measurement.md',
    'docs/planning/reviews/architecture-and-governance/20260513-ar-d6-triple-versioning-governance-review.md',
    'docs/planning/reviews/architecture-and-governance/20260525-f29-canvas-workbench-proposal-disposition-review.md',
    'docs/planning/reviews/architecture-and-governance/20260605-buzon-fowler-db-activation-review.md',
    'docs/planning/reviews/ci-and-delivery/20260401-lane-c-rc-c2-efficiency-institutionalization-review.md',
    'docs/planning/status/evidence-classification-inventory-20260402.md',
    '.gh-comments/normalize_issues_v2.ps1',
    '.gh-comments/pr-117.md',
    '.gh-comments/pr-221.md',
    '.gh-comments/pr-226-glossary-and-postgres-hardening-2026-02-19.md',
    '.gh-comments/pr-9.md',
    '.gh-comments/pr-closure-notes-14-15.md',
    '.gh-comments/pr-postgres-hardening-p0-p2-2026-02-19.md',
    '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md',
    '.git.bfg-report/2026-02-19/14-48-28/cache-stats.txt',
    '.git.bfg-report/2026-02-19/14-48-28/object-id-map.old-new.txt',
    'buzon/20260524-codex-fowler-planning-review-canon.md',
    'buzon/dvt_front_component_inventory_app_reflection_study_20260604.md',
    'docs/planning/status/20260402-command-logging-pane.md',
  ];
  for (const path of [...retiredDirectories, ...retiredFiles]) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }
  const retiredNames = retiredFiles.map((path) => path.split('/').at(-1));
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    let current = readRepoFile(path).replace(
      /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
      ''
    );
    if (path === requiredFiles[0]) {
      // The existing guard permits removal of fully absent forbidden subtrees.
      // Exempt only this exact prohibition, never the owning document as a whole.
      const prohibition =
        'forbiddenImplementationSurfaces:\n  - .gh-comments/**\n  - .git.bfg-report/**\n';
      assert.equal(current.split(prohibition).length, 2, 'retired roots must remain forbidden');
      current = current.replace(prohibition, 'forbiddenImplementationSurfaces:\n');
    }
    for (const name of retiredNames) {
      assert.equal(current.includes(name), false, `retired journal reference: ${path}: ${name}`);
    }
    for (const directory of retiredDirectories) {
      assert.equal(
        current.includes(`${directory}/`),
        false,
        `retired metadata ownership or reference: ${path}: ${directory}`
      );
    }
  }
  assertFilesExist([
    'docs/planning/state/github-mvp-issue-workflow.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/frontend-component-reflection-inventory-plan-20260604.md',
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-plan-20260402.md',
  ]);
});

// Input records retain their exact provenance; they are not live workbench contracts.
test('retired Workbench peer-route documents have no live consumers', () => {
  const retiredFiles = [
    'docs/architecture/components/web/main-workspace-views-and-ux.md',
    'docs/architecture/components/web/screen-layout-and-cross-surface-behavior-rules.md',
    'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md',
  ];
  const preservedIntake = {
    'buzon/20260506-codex-fowler-canvas-workbench-shell-context-review-and-risk.md':
      'f48ab6cd777fb60ac7cb2156db16a255a626bd7f',
    'buzon/20260516-codex-fowler-canvas-screen-problems-architecture-analysis.md':
      '0412e6631aec6e4883b8d4f94f5ece8d187bf5ec',
    'buzon/20260516-codex-fowler-f15-canvas-view-menu-architecture-analysis.md':
      'aff43167c065b348173cb3640230e2d781922231',
  };
  for (const path of retiredFiles) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }
  const retiredNames = retiredFiles.map((path) => path.split('/').at(-1).replace(/\.md$/u, ''));
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    let content = readRepoFile(path);
    if (Object.hasOwn(preservedIntake, path)) {
      const digest = execFileSync('git', ['hash-object', '--stdin'], {
        input: content,
        encoding: 'utf8',
      }).trim();
      assert.equal(digest, preservedIntake[path], `historical input changed: ${path}`);
      continue;
    }
    content = content.replace(
      /https:\/\/github\.com\/dunay2\/dvt\/blob\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
      ''
    );
    for (const name of retiredNames) {
      assert.equal(content.includes(name), false, `retired Workbench reference: ${path}: ${name}`);
    }
  }
  assertFilesExist([
    'docs/architecture/components/web/screen-manuals-and-user-stories.md',
    'docs/architecture/components/web/appshell/shell-workspace-context-component.md',
    'docs/architecture/components/web/appshell/shell-workspace-context-user-stories.md',
  ]);
});
