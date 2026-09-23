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
  const currentPaths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' }
  ).split('\0');
  const retiredPaths = [
    'docs/planning/proposals/mandatory/frontend-and-ux/superseded',
    'docs/planning/proposals/mandatory/frontend-and-ux/archive-candidates',
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
    assert.equal(
      currentPaths.some((name) => name === path || name.startsWith(`${path}/`)),
      false,
      path
    );
  }

  const frontendClassification = readRepoFile(
    'docs/planning/proposals/mandatory/frontend-and-ux/index.md'
  );
  assert.doesNotMatch(frontendClassification, /\.\/superseded\//u);
  assert.doesNotMatch(frontendClassification, /archive-candidates\//u);
  assert.doesNotMatch(frontendClassification, /move to archive|put it in superseded/u);
  assert.ok(frontendClassification.includes('History stays in Git.'));

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
    '20260316-workspace-build-baseline-closeout.md',
    '20260316-workspace-script-graph-dedup-closeout.md',
    '20260317-adapter-dependency-graph-alignment-closeout.md',
    '20260317-app-workspace-script-dedup-closeout.md',
    '20260317-package-tsconfig-base-closeout.md',
    '20260318-ts-esm-monorepo-m02-closeout.md',
    '20260318-typescript-package-classification-closeout.md',
    '20260414-hotfix-app-services-context-hmr-stability-closeout.md',
    '20260414-hotfix-dev-stack-local-postgres-bootstrap-closeout.md',
    '20260414-hotfix-frontend-app-services-provider-startup-closeout.md',
    '20260418-local-build-hook-warm-cache-p0-closeout.md',
    '20260418-rc-c2-turbo-build-orchestrator-closeout.md',
    '20260421-web-xyflow-12-10-2-closeout.md',
    '20260422-rc-c2-wave-2a-typecheck-contract-closeout.md',
    '20260830-dev-stack-worker-runtime-build-closeout.md',
    '20260316-docs-governance-tooling-closeout.md',
    '20260320-planning-archive-sweep-closeout.md',
    '20260320-planner-r1-doc-triage-closeout.md',
    '20260320-planner-assessment-roadmap-closeout.md',
    '20260324-s18-follow-up-proposal-capture-closeout.md',
    '20260407-doc-arch-01-documentation-governance-audit-closeout.md',
    '20260423-selected-closure-ux-proof-story-capture-closeout.md',
    '20260423-tf-e2-project-playground-host-proposal-capture-closeout.md',
    '20260424-tf-e2-k-cycle-story-capture-closeout.md',
    '20260315-g10-lineage-runtime-closeout.md',
    '20260315-run-domain-projection-closeout.md',
    '20260320-gap4-pr3-resilience-envelope-closeout.md',
    '20260329-run-event-retention-closeout.md',
    '20260402-s08-contract-layer-hardening-closeout.md',
    '20260408-tf-c2-b-run-read-evidence-closeout.md',
    '20260412-tf-b1-b-provenance-evidence-linkage-closeout.md',
    '20260413-ar-c6-provider-status-convergence-closeout.md',
    '20260413-f22-sql-first-transformation-handoff-closeout.md',
    '20260413-pr-925-temporal-arc2-closeout.md',
    '20260419-mw-d1-external-compile-boundary-closeout.md',
    '20260423-access-decision-contract-vocabulary-closeout.md',
    '20260423-access-decision-embedded-first-closeout.md',
    '20260423-iworkflowengine-contract-ownership-cleanup-closeout.md',
    '20260424-ar-a8-provider-vocabulary-hard-cut-closeout.md',
    '20260424-hard-cut-auth-mock-cleanup-closeout.md',
    '20260426-api-tenant-qa-hardening-closeout.md',
    '20260427-temporal-planref-spec-config-hardening-closeout.md',
    '20260429-plan-admission-semantic-architecture-closeout.md',
    '20260513-ar-a6-snapshot-rebuild-concurrency-contract-closeout.md',
    '20260522-s08-plan-store-scope-closeout.md',
    '20260522-tf-c3-e-temporal-worker-dbt-canary-closeout.md',
    '20260522-tf-c3-plugin-backed-dbt-parent-closeout.md',
    '20260526-e-dbt-author-run-closeout.md',
    '20260816-2401-dbt-source-config-meta-closeout.md',
    '20260315-task8-intent-reconciliation-and-api-flags-thinkfirst.md',
    '20260315-adapter-postgres-schema-timeout-fixes-closeout.md',
    '20260315-intent-store-bug-fixes-closeout.md',
    '20260315-provider-adapter-contract-versioning-closeout.md',
    '20260315-task8-intent-reconciliation-and-api-flags-closeout.md',
    '20260316-outbox-cleanup-serialization-closeout.md',
    '20260321-s06-migration-version-table-closeout.md',
    '20260324-rc-a1-simulate-error-production-hardening-closeout.md',
    '20260324-rc-a2-deterministic-start-run-intent-id-closeout.md',
    '20260324-s14-gateway-context-across-continue-as-new-closeout.md',
    '20260324-s15-run-snapshot-cas-guard-closeout.md',
    '20260324-s15f1-stale-snapshot-discard-closeout.md',
    '20260331-rc-c1-http-error-envelope-normalization-closeout.md',
    '20260331-s1-manifestref-production-path-closeout.md',
    '20260401-dhm-ws1-start-run-boundary-residual-hardening-closeout.md',
    '20260406-mw-a1-step-kind-registry-governance-closeout.md',
    '20260406-s08-4c-fail-closed-admission-coverage-closeout.md',
    '20260406-s08-5c-plugin-compatibility-fingerprint-closeout.md',
    '20260407-engine-entrypoint-plan-integrity-closeout.md',
    '20260407-snapshot-prewarm-active-runs-closeout.md',
    '20260409-provider-ref-contract-hardening-closeout.md',
    '20260410-mw-a5-temporal-helper-artifact-facts-narrowing-closeout.md',
    '20260423-ar-c3-b-temporal-readyz-capacity-binding-closeout.md',
    '20260423-ar-c3-c-execution-capacity-operational-closure-closeout.md',
    '20260423-engine-capability-validation-fail-closed-closeout.md',
    '20260424-ar-c3-admission-observability-semantic-hardening-closeout.md',
    '20260411-s05-truth-sync-closeout.md',
    '20260414-tf-a1-d-web-plan-anti-corruption-closeout.md',
    '20260416-shell-session-context-persistence-closeout.md',
    '20260416-shell-session-context-rehydration-guard-closeout.md',
    '20260416-tf-e2-canvas-draft-cas-hardening-closeout.md',
    '20260417-tf-e2-canvas-draft-followup-qa-hardening-closeout.md',
    '20260417-tf-e2-canvas-draft-race-and-import-edge-hardening-closeout.md',
    '20260417-tf-e2-canvas-draft-reload-recovery-hardening-closeout.md',
    '20260418-tf-e2-canvas-interaction-command-seam-closeout.md',
    '20260420-tf-e2-canvas-typed-authoring-port-hard-cut-closeout.md',
    '20260421-tf-e2-graph-lifecycle-hard-cut-closeout.md',
    '20260422-tf-e2-canvas-component-governance-follow-up-closeout.md',
    '20260422-tf-e2-canvas-route-composition-and-projection-refactor-closeout.md',
    '20260422-tf-e2-canvas-source-import-capability-hardening-closeout.md',
    '20260422-tf-e2-semantic-protected-draft-projection-cut-closeout.md',
    '20260423-tf-a2-c3-c4-api-web-adoption-closeout.md',
    '20260424-tf-e2-k-supporting-cycle-story-expansion-closeout.md',
    '20260425-canvas-graph-strategy-policy-qa-closeout.md',
    '20260425-tf-e2-d-inspector-authoring-closeout.md',
    'F-04-D-E-composition-root-foundation-closeout.md',
    'F-04-RESIDUAL-B-provider-override-test-seams-closeout.md',
    'gh-2845-delete-selected-canvas-edge-closeout.md',
    'gh-2847-source-import-explore-navigation-closeout.md',
    'gh-2882-data-tab-card-name-closeout.md',
    'gh-2889-preview-terminal-result-copy-closeout.md',
    '20260315-adapter-postgres-phase1-extraction-closeout.md',
    '20260316-monorepo-peer-runtime-policy-closeout.md',
    '20260316-platform-baseline-lock-closeout.md',
    '20260321-s01-contract-dead-code-cleanup-closeout.md',
    '20260406-mw-a2-b-contract-cleanup-closeout.md',
    '20260406-mw-a2-c-planner-boundary-evolution-closeout.md',
    '20260406-mw-a2-d-api-ref-resolution-alignment-closeout.md',
    '20260406-mw-a2-e-determinism-and-integration-hardening-closeout.md',
    '20260407-ar-c1-t1-admin-route-test-harness-closeout.md',
    '20260407-ar-c1-t2-admin-rebuild-snapshot-contract-schema-closeout.md',
    '20260407-ar-c1-t3-protected-runtime-admin-route-composition-closeout.md',
    '20260418-protected-runtime-integration-seam-split-closeout.md',
    '20260419-lane-e-remediation-backlog-alignment-closeout.md',
    '20260420-adapter-temporal-workflowhelpers-decomposition-closeout.md',
    '20260420-temporal-worker-runtime-config-shape-closeout.md',
    '20260422-rc-c2-wave-1-node-precommit-turbo-cache-closeout.md',
    '20260422-web-canvas-sonar-maintenance-closeout.md',
    '20260423-rc-c2-wave-2b-turbo-affected-task-routing-closeout.md',
    '20260423-rc-c2-wave-4a-ci-tools-merge-gate-closeout.md',
    '20260426-rc-g1-c-truth-sync-closeout.md',
    '20260426-tf-e2-l-canvas-strategy-boundary-truth-sync-closeout.md',
    '20260429-bootstrap-presentation-separation-closeout.md',
    '20260515-f06-frontend-query-boundary-standardization-closeout.md',
    '20260518-dhm-ws3-admission-seam-closeout.md',
    '20260522-ar-c1-t4-api-snapshot-fixture-closeout.md',
    '20260522-dhm-modularization-parent-closeout.md',
    '20260417-tf-e2-canvas-draft-scope-fowler-refactor-closeout.md',
    '20260417-tf-e2-canvas-draft-session-refactor-closeout.md',
    '20260418-tf-e2-canvas-draft-repository-seam-closeout.md',
    '20260418-tf-e2-canvas-srp-seams-closeout.md',
    '20260421-api-http-error-translation-ast-seam-guard-closeout.md',
    '20260421-api-http-error-translation-facade-writer-refinement-closeout.md',
    '20260421-api-http-error-translation-public-api-facade-closeout.md',
    '20260421-api-http-error-translation-response-writer-unification-closeout.md',
    '20260421-api-http-error-translation-route-static-error-convergence-closeout.md',
    '20260421-api-http-runtime-error-translation-component-hardening-closeout.md',
    '20260421-tf-e2-canvas-handler-component-semantics-closeout.md',
    '20260421-tf-e2-canvas-route-composer-and-shell-subbuilders-closeout.md',
    '20260421-tf-e2-canvas-route-composition-semantic-component-closeout.md',
    '20260421-tf-e2-canvas-route-presentation-hard-cut-closeout.md',
    '20260421-tf-e2-canvas-shell-composition-slimming-closeout.md',
    '20260421-tf-e2-canvas-shell-semantic-prop-contract-closeout.md',
    '20260421-tf-e2-handler-contracts-hardening-closeout.md',
    '20260422-tf-e2-canvas-authoring-runtime-contract-closeout.md',
    '20260507-gov-s3-planning-db-export-parity-closeout.md',
    '20260510-gov-s3-w18-docs-disposition-queue-closeout.md',
    '20260510-gov-s3-w19-task-provenance-ledger-closeout.md',
    '20260510-gov-s3-w20-planning-work-intake-query-closeout.md',
    '20260515-remaining-review-reconciliation-closeout.md',
    '20260604-knowledge-intake-dbfirst-retirement-closeout.md',
    '20260604-knowledge-intake-generated-literature-closeout.md',
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
    assert.equal(
      isRetired(path.split('/').at(-1)),
      false,
      `retired editorial closeout path: ${path}`
    );
    // Only exact Git revisions can supply historical provenance, never main.
    const current = readRepoFile(path).replace(
      /https:\/\/github\.com\/dunay2\/dvt\/blob\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
      ''
    );
    for (const match of current.matchAll(
      /\b[0-9]{8}-[a-z0-9.-]+-(?:closeout|thinkfirst)(?:\.md)?\b/gu
    )) {
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

// History belongs to Git. Recorded commands remain byte-bound historical evidence,
// never a licence for new live references from the same evidence document.
test('retired historical reviews and delivery records have no live consumers', () => {
  const retiredFiles = [
    'buzon/20260429-codex-canvas-operability-auth-and-drag-fowler-review.md',
    'buzon/20260429-codex-fowler-branch-architecture-post-codescene-analysis-and-remediation.md',
    'buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md',
    'buzon/20260430-codex-fowler-canvas-ready-node-authoring-analysis.md',
    'buzon/20260514-codex-fowler-ar-a7-delivery-domain-runtime-split-analysis.md',
    'buzon/20260514-codex-fowler-ea-20260429-06-semantic-fitness-analysis.md',
    'buzon/20260515-codex-fowler-ar-d-plan-pointer-architecture-authority-analysis.md',
    'buzon/20260515-codex-fowler-f05-store-domain-ownership-hard-review.md',
    'buzon/20260516-codex-fowler-canvas-screen-problems-architecture-analysis.md',
    'buzon/20260516-codex-fowler-element-canvas-empty-state-placement.md',
    'buzon/20260516-codex-fowler-element-canvas-route-shell-posture.md',
    'buzon/20260516-codex-fowler-element-canvas-topbar-command-priority.md',
    'buzon/20260516-codex-fowler-element-readonly-first-canvas-policy.md',
    'buzon/20260518-codex-fowler-f27-alpha-route-gate-branch-analysis.md',
    'buzon/20260518-f10-fowler-run-event-convergence-analysis.md',
    'buzon/20260523-codex-fowler-planner-ingress-hard-cut-canon.md',
    'docs/planning/closeouts/20260315-api-protected-runtime-closeout.md',
    'docs/planning/closeouts/20260316-api-start-run-adapter-config-closeout.md',
    'docs/planning/closeouts/20260316-g7-projector-worker-runtime-closeout.md',
    'docs/planning/closeouts/20260316-g7-provider-ref-reconciliation-closeout.md',
    'docs/planning/closeouts/20260319-gap-5-pr1-archive-artifact-contracts-closeout.md',
    'docs/planning/closeouts/20260319-planversion-governance-thinkfirst.md',
    'docs/planning/closeouts/20260320-api-runtime-query-integration-closeout.md',
    'docs/planning/closeouts/20260320-gap-5-pr1-terminal-snapshot-pinning-closeout.md',
    'docs/planning/closeouts/20260320-planner-r2-redefinition-closeout.md',
    'docs/planning/closeouts/20260320-planner-r2-typed-graph-source-boundary-closeout.md',
    'docs/planning/closeouts/20260321-gap-5-pr1-export-verifier-closeout.md',
    'docs/planning/closeouts/20260321-gap-5-pr2-deferred-deletion-restore-closeout.md',
    'docs/planning/closeouts/20260321-gap-5-pr3-delivery-buffer-retention-closeout.md',
    'docs/planning/closeouts/20260324-s12-remove-deprecated-state-store-methods-closeout.md',
    'docs/planning/closeouts/20260324-schema-migration-rollback-closeout.md',
    'docs/planning/closeouts/20260401-rc-c2-preflight-and-log-triage-rollout-closeout.md',
    'docs/planning/closeouts/20260404-ar-a9-planner-cycle-fail-closed-closeout.md',
    'docs/planning/closeouts/20260404-f04-findings-todo.md',
    'docs/planning/closeouts/20260404-f04-qa-hardening-closeout.md',
    'docs/planning/closeouts/20260404-f04-w4-decomposition-manifest.md',
    'docs/planning/closeouts/20260404-plan-qa-tareas-mvp.md',
    'docs/planning/closeouts/20260406-mw-a3-step-artifact-ref-generalization-closeout.md',
    'docs/planning/closeouts/20260408-tf-c1-b-preview-profile-contract-closeout.md',
    'docs/planning/closeouts/20260408-tf-c2-b-read-surface-evidence-closeout.md',
    'docs/planning/closeouts/20260410-mw-a6-planner-hard-cut-boundary-remediation-closeout.md',
    'docs/planning/closeouts/20260413-ar-a12-a-contract-pack-reset-closeout.md',
    'docs/planning/closeouts/20260413-ar-a12-b-status-model-split-closeout.md',
    'docs/planning/closeouts/20260413-tf-a1-a-preview-contract-freeze-closeout.md',
    'docs/planning/closeouts/20260413-tf-c2-runtime-vertical-acceptance-closeout.md',
    'docs/planning/closeouts/20260413-tf-d1-proof-environment-lifecycle-closeout.md',
    'docs/planning/closeouts/20260414-ar-b2-distributed-consistency-model-closeout.md',
    'docs/planning/closeouts/20260414-shell-chrome-signal-compaction-closeout.md',
    'docs/planning/closeouts/20260414-tf-a1-b-compiler-mapping-closeout.md',
    'docs/planning/closeouts/20260414-tf-a1-c-srp-hardening-closeout.md',
    'docs/planning/closeouts/20260414-tf-c1-preview-persist-convergence-closeout.md',
    'docs/planning/closeouts/20260414-tf-c3-dbt-plugin-runtime-projection-closeout.md',
    'docs/planning/closeouts/20260414-tf-c3-run-execution-context-resolver-closeout.md',
    'docs/planning/closeouts/20260416-ar-b1-write-boundary-closeout.md',
    'docs/planning/closeouts/20260416-ar-d1-incremental-snapshot-projection-closeout.md',
    'docs/planning/closeouts/20260417-mw-d1-planning-closeout.md',
    'docs/planning/closeouts/20260417-tf-e2-route-bootstrap-srp-refactor-closeout.md',
    'docs/planning/closeouts/20260419-rc-g1-c-owner-package-migration-closeout.md',
    'docs/planning/closeouts/20260419-tf-a1-c14-plan-compile-language-alignment-closeout.md',
    'docs/planning/closeouts/20260420-ar-d-plan-pointer-follow-up-hardening-closeout.md',
    'docs/planning/closeouts/20260420-temporal-fowler-architecture-drift-follow-up-closeout.md',
    'docs/planning/closeouts/20260421-api-http-entrypoint-response-componentization-closeout.md',
    'docs/planning/closeouts/20260422-api-start-run-execution-capacity-admission-closeout.md',
    'docs/planning/closeouts/20260422-tf-e2-protected-runtime-dev-auth-alignment-closeout.md',
    'docs/planning/closeouts/20260424-temporal-plan-ref-contract-closeout.md',
    'docs/planning/closeouts/20260425-production-tenant-isolation-baseline-closeout.md',
    'docs/planning/closeouts/20260427-ar-d-plan-pointer-qa1-readiness-closeout.md',
    'docs/planning/closeouts/20260427-rc-g1-d-planner-ownership-migration-closeout.md',
    'docs/planning/closeouts/20260427-temporal-continue-payload-env-propagation-closeout.md',
    'docs/planning/closeouts/20260428-canvas-draft-replacement-and-drag-closeout.md',
    'docs/planning/closeouts/20260429-we-hx-1-boundary-ownership-closeout.md',
    'docs/planning/closeouts/20260430-ar-d-continuation-safety-closeout.md',
    'docs/planning/closeouts/20260507-ar-b5-lineage-worker-runtime-decomposition-closeout.md',
    'docs/planning/closeouts/20260511-f28c-project-snapshot-roundtrip-closeout.md',
    'docs/planning/closeouts/20260513-ea-20260429-engine-audit-disposition-closeout.md',
    'docs/planning/closeouts/20260514-ar-d2-temporal-planref-capacity-sla-closeout.md',
    'docs/planning/closeouts/20260514-ea-20260429-06-semantic-architecture-fitness-closeout.md',
    'docs/planning/closeouts/20260514-f04-parent-acceptance-closeout.md',
    'docs/planning/closeouts/20260514-f05-store-domain-ownership-closeout.md',
    'docs/planning/closeouts/20260515-ar-d-plan-pointer-final-closeout.md',
    'docs/planning/closeouts/20260520-f15f-canvas-workbench-screen-consolidation-closeout.md',
    'docs/planning/closeouts/20260522-f25-plugin-ux-contract-closeout.md',
    'docs/planning/closeouts/20260522-we-hx-parent-hardcut-closeout.md',
    'docs/planning/closeouts/20260525-f17c-artifacts-monaco-readonly-viewer-closeout.md',
    'docs/planning/closeouts/20260525-f17g-code-monaco-editable-workspace-access-closeout.md',
    'docs/planning/closeouts/20260525-f29c-canvas-insert-palette-closeout.md',
    'docs/planning/closeouts/F-02-closeout.md',
    'docs/planning/closeouts/F-04-F-capabilities-port-and-route-query-boundary-closeout.md',
    'docs/planning/closeouts/F-04-RESIDUAL-A-root-provider-guard-closeout.md',
    'docs/planning/closeouts/G7.1-closeout.md',
    'docs/planning/closeouts/engine-deps-refactor-closeout.md',
    'docs/planning/closeouts/f-04-risk-a-qa-03-backend-owned-planref-closeout.md',
    'docs/planning/closeouts/f-04-risk-b-mock-workspace-isolation-closeout.md',
    'docs/planning/reviews/20260402-f03-shell-health-banner-hard-qa-review.md',
    'docs/planning/reviews/20260407-f04-f-capabilities-port-hard-qa-review.md',
    'docs/planning/reviews/20260407-f04-risk-b-mock-workspace-isolation-hard-qa-review.md',
    'docs/planning/reviews/20260408-f04-residual-a-root-provider-guard-hard-qa-review.md',
    'docs/planning/reviews/20260417-dvt-plus-deep-architectural-review.md',
    'docs/planning/reviews/20260419-dvt-plus-deep-architectural-review.md',
    'docs/planning/reviews/architecture-and-governance/20260314-domain-cohesion-review.md',
    'docs/planning/reviews/architecture-and-governance/20260323-solid-ddd-hexagonal-ci-and-adapters-review.md',
    'docs/planning/reviews/architecture-and-governance/20260326-dvt-principal-architectural-review.md',
    'docs/planning/reviews/architecture-and-governance/20260331-principal-architecture-deep-review.md',
    'docs/planning/reviews/architecture-and-governance/20260402-f03-shell-health-fowler-hard-review.md',
    'docs/planning/reviews/architecture-and-governance/20260404-f04-frontend-data-boundary-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260404-mvp-e1-f03-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260407-dvt-principles-boundaries-and-target-state-review.md',
    'docs/planning/reviews/architecture-and-governance/20260407-engine-boundary-current-target-and-migration-review.md',
    'docs/planning/reviews/architecture-and-governance/20260407-execution-plan-and-run-execution-policy-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260407-principal-architecture-review-progress-and-diagrams.md',
    'docs/planning/reviews/architecture-and-governance/20260407-retry-step-boundary-and-use-case-review.md',
    'docs/planning/reviews/architecture-and-governance/20260407-retry-step-boundary-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260408-retry-run-boundary-and-provider-signal-mapper-review.md',
    'docs/planning/reviews/architecture-and-governance/20260408-retry-run-boundary-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260409-dvt-monorepo-bug-audit-and-backend-valuation.md',
    'docs/planning/reviews/architecture-and-governance/20260410-contract-pack-and-read-boundary-reset-fowler-review.md',
    'docs/planning/reviews/architecture-and-governance/20260410-runtime-and-shared-kernel-risk-triage-review.md',
    'docs/planning/reviews/architecture-and-governance/20260411-ar-a12-b-status-model-split-fowler-review.md',
    'docs/planning/reviews/architecture-and-governance/20260411-project-architecture-strengths-weaknesses-fowler-review.md',
    'docs/planning/reviews/architecture-and-governance/20260413-dvt-plus-architectural-audit-review.md',
    'docs/planning/reviews/architecture-and-governance/20260414-principal-architect-review-dvtplus.md',
    'docs/planning/reviews/architecture-and-governance/20260418-mw-d1-external-compile-boundary-review.md',
    'docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md',
    'docs/planning/reviews/architecture-and-governance/20260420-dvt-plus-system-architecture-review.md',
    'docs/planning/reviews/architecture-and-governance/20260421-canvas-handler-seams-fowler-review.md',
    'docs/planning/reviews/architecture-and-governance/20260421-canvas-route-composition-fowler-review.md',
    'docs/planning/reviews/architecture-and-governance/20260422-canvas-component-governance-follow-up-review.md',
    'docs/planning/reviews/architecture-and-governance/20260422-dvt-plus-principal-architect-deep-review.md',
    'docs/planning/reviews/architecture-and-governance/20260425-canvas-graph-strategy-fowler-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md',
    'docs/planning/reviews/architecture-and-governance/20260427-dvt-deep-architectural-review.md',
    'docs/planning/reviews/architecture-and-governance/20260427-rc-g1-d-fowler-architecture-review.md',
    'docs/planning/reviews/architecture-and-governance/20260429-dvt-plus-principal-deep-review-april-2026.md',
    'docs/planning/reviews/architecture-and-governance/20260525-architecture-buzon-fowler-canonization-review.md',
    'docs/planning/reviews/architecture-and-governance/20260525-backlog-intake-reconciliation-review.md',
    'docs/planning/reviews/architecture-and-governance/20260525-buzon-fowler-canonization-inventory.md',
    'docs/planning/reviews/architecture-and-governance/20260525-frontend-buzon-fowler-canonization-review.md',
    'docs/planning/reviews/architecture-and-governance/20260607-api-workspace-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-api-workspace-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-contracts-workspace-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-contracts-workspace-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-core-execution-planning-source-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-core-execution-planning-source-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-cross-cutting-workspaces-source-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-cross-cutting-workspaces-source-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-product-flow-closure-source-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-product-flow-closure-source-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-runtime-adapters-workers-source-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-runtime-adapters-workers-source-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-source-grounded-24-workspace-gap-reports-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-source-grounded-24-workspace-gap-reports.md',
    'docs/planning/reviews/architecture-and-governance/20260607-web-workspace-gap-report-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-web-workspace-gap-report.md',
    'docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-batch-01-source-extension.md',
    'docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-batch-01.md',
    'docs/planning/reviews/architecture-and-governance/20260823-dbt-osmosis-integration-study.md',
    'docs/planning/reviews/canvas-controller-fowler-hard-qa-20260404.md',
    'docs/planning/reviews/ci-and-delivery/20260330-ci-prepush-pr-process-observations.md',
    'docs/planning/reviews/ci-and-delivery/20260401-ci-process-review.md',
    'docs/planning/reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md',
    'docs/planning/reviews/engine/20260405-mw-a2-policy-first-fowler-qa-review.md',
    'docs/planning/reviews/event-contract-and-traceability/20260326-reconciler-runtime-solid-qa-review.md',
    'docs/planning/reviews/event-contract-and-traceability/20260328-lineage-outbox-fowler-qa-hard-review.md',
    'docs/planning/reviews/event-contract-and-traceability/20260404-s05-envelope-boundary-fowler-qa-review.md',
    'docs/planning/reviews/event-contract-and-traceability/20260404-s05-envelope-boundary-hardening-plan-review.md',
    'docs/planning/reviews/event-lifecycle-and-retention/20260329-run-event-retention-fowler-hard-review.md',
    'docs/planning/reviews/event-lifecycle-and-retention/20260329-run-event-retention-risks-mitigations.md',
    'docs/planning/reviews/event-lifecycle-and-retention/20260329-run-event-retention-ttl-kickoff-review.md',
    'docs/planning/reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md',
    'docs/planning/reviews/event-lifecycle-and-retention/index.md',
    'docs/planning/reviews/execution-runtime/20260315-postgres-start-run-intent-store-qa-review.md',
    'docs/planning/reviews/execution-runtime/20260315-postgres-state-store-adapter-refactor-review.md',
    'docs/planning/reviews/execution-runtime/20260315-run-plan-workflow-architecture-review.md',
    'docs/planning/reviews/execution-runtime/20260315-start-run-intent-schema-manager-architecture-review.md',
    'docs/planning/reviews/execution-runtime/20260315-workflow-helpers-architecture-review.md',
    'docs/planning/reviews/execution-runtime/20260321-planner-backed-start-run-qa-review.md',
    'docs/planning/reviews/execution-runtime/20260323-start-run-route-parser-qa-review.md',
    'docs/planning/reviews/execution-runtime/20260326-run-maintenance-service-srp-review.md',
    'docs/planning/reviews/execution-runtime/20260326-s03-hard-qa-review.md',
    'docs/planning/reviews/execution-runtime/20260328-runtime-command-rbac-review.md',
    'docs/planning/reviews/execution-runtime/20260331-mvp-a1-backend-contractual-inventory-review.md',
    'docs/planning/reviews/execution-runtime/20260409-tf-c2-b-read-surface-hard-qa-review.md',
    'docs/planning/reviews/execution-runtime/index.md',
  ];
  const frozenInvocations = new Map([
    [
      'docs/evidence/ED-20260412-tf-c2-b-success-only-materialization-reads.md',
      new Set(['8e5be5508ee7655486a746b806b09e022ecff770']),
    ],
    [
      'docs/evidence/ED-20260414-ar-b2-distributed-consistency-model.md',
      new Set(['186dec344fe87a5d3c79fb2db426f19278950e56']),
    ],
    [
      'docs/evidence/ED-20260416-ar-b1-write-boundary-closure.md',
      new Set(['7d9626e5db37fe770b090588d1569954b273aefc']),
    ],
    [
      'docs/evidence/ED-20260417-mw-d1-external-compile-boundary-arc2.md',
      new Set(['2fb89d37acc2002030bab76ec95e9d3e50679468']),
    ],
    [
      'docs/evidence/ED-20260419-plan-compile-language-alignment-arc2.md',
      new Set(['291120e04a8583a06a84e4af0c1586b3f0093d86']),
    ],
    [
      'docs/evidence/ED-20260419-rc-g1-c-owner-package-migration.md',
      new Set([
        '9060f423eacb8372d91ca9fd0b532bd7950c0298',
        'a862c50ac1819aa37df95eea352bbf4bb40f421b',
      ]),
    ],
    [
      'docs/evidence/ED-20260421-api-plan-route-response-and-adapter-build-baseline.md',
      new Set(['cadcf55b38f1ffc7890be49f515ae98f917fe557']),
    ],
    [
      'docs/planning/closeouts/20260429-static-analysis-followup-closeout.md',
      new Set(['92d32d12c874463faea047cbdc3b12f2fb61cf7a']),
    ],
  ]);
  const observedInvocations = new Set();
  const names = retiredFiles
    .filter((path) => !path.endsWith('/index.md'))
    .map((path) => path.split('/').at(-1));
  const references = new RegExp(
    `(?<![\\w.-])(?:${names.map(escapeRegExp).join('|')})(?![\\w.-])`,
    'u'
  );
  const retiredIndexes = retiredFiles.filter((path) => path.endsWith('/index.md'));
  const paths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
  for (const retired of retiredFiles) {
    assert.equal(existsSync(retired), false, `Retired file returned: ${retired}`);
  }
  for (const path of paths) {
    if (!existsSync(path) || path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    assert.equal(
      names.includes(path.split('/').at(-1)),
      false,
      `Relocated historical file: ${path}`
    );
    const text = readRepoFile(path);
    for (const line of text.split(/\r?\n/u)) {
      const live = line.replace(
        /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
        ''
      );
      if (!references.test(live) && !retiredIndexes.some((retired) => live.includes(retired)))
        continue;
      const hash = execFileSync('git', ['hash-object', '--stdin'], {
        input: line.trim(),
        encoding: 'utf8',
      }).trim();
      assert.ok(
        frozenInvocations.get(path)?.has(hash),
        `Live historical reference in ${path}: ${line.trim()}`
      );
      observedInvocations.add(`${path}:${hash}`);
    }
  }
  for (const [path, hashes] of frozenInvocations) {
    for (const hash of hashes)
      assert.ok(
        observedInvocations.has(`${path}:${hash}`),
        `Historical command changed or disappeared: ${path}:${hash}`
      );
  }
});
