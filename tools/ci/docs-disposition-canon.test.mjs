/**
 * Owned concern: validate that active documentation disposition findings are
 * canonized through the planning DB queue instead of acting as a parallel docs backlog.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { posix } from 'node:path';

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
    '20260318-stage-1-1-planner-policy-boundary-migration-closeout.md',
    '20260331-mvp-a1-contractual-inventory-closeout.md',
    '20260402-rc-c2-operational-friction-intake-closeout.md',
    '20260403-api-current-to-target-architecture-closeout.md',
    '20260404-ar-c2-sla-and-manuals-closeout.md',
    '20260414-unified-raven-startup-bootstrap-closeout.md',
    '20260415-tf-e1-selection-scoped-authoring-mvp-closeout.md',
    '20260417-tf-e2-canvas-bootstrap-presentation-handoff-closeout.md',
    '20260417-tf-e2-canvas-draft-aggregate-alignment-closeout.md',
    '20260417-tf-e2-route-bootstrap-contract-generalization-closeout.md',
    '20260423-tf-a2-c-execution-selection-proposal-closeout.md',
    '20260423-tf-a2-c1-execution-selection-contract-pack-closeout.md',
    '20260423-tf-a2-c2-executable-subgraph-derivation-closeout.md',
    '20260423-tf-a2-c5-selected-closure-end-to-end-proof-closeout.md',
    '20260423-tf-e2-k-a-first-canvas-playground-host-closeout.md',
    '20260423-tf-e2-k-b-host-tab-restoration-closeout.md',
    '20260423-tf-e2-k-c-typed-empty-canvas-posture-closeout.md',
    '20260423-workspace-graph-draft-application-component-closeout.md',
    '20260424-tf-e2-e-a-b-c-selected-closure-browser-proof-closeout.md',
    '20260424-tf-e2-e-d-live-selected-closure-browser-proof-closeout.md',
    '20260424-tf-e2-k-d-host-cycle-dto-closeout.md',
    '20260424-tf-e2-k-d-transformation-host-cycle-proof-closeout.md',
    '20260424-tf-e2-k-e-dbt-host-cycle-proof-closeout.md',
    '20260424-tf-e2-k-f-authoritative-restore-proof-closeout.md',
    '20260424-tf-e2-k-g-typed-canvas-preview-run-proof-closeout.md',
    '20260424-tf-e2-k-h-blocked-readonly-host-cycle-proof-closeout.md',
    '20260424-tf-e2-k-i-authoritative-first-canvas-lifecycle-proof-closeout.md',
    '20260425-tf-e2-b-c-node-edge-lifecycle-closure-closeout.md',
    '20260427-frontend-policy-drift-and-bootstrap-closeout.md',
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
    'buzon/20260514-codex-fowler-ar-c2-t2-dashboard-evidence-analysis.md',
    'buzon/20260514-codex-fowler-ar-c2-t3-alert-evidence-analysis.md',
    'buzon/20260523-codex-fowler-postgres-tenant-isolation-canon.md',
    'buzon/20260703-web-state-health-direction-update.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/f-07-frontend-runtime-contract-baseline-plan-20260404.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/temporal-workflow-helper-artifact-facts-narrowing-slice-20260410.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-authoring-draft-aggregate-roots-plan-20260423.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-workspace-graph-draft-persistence-boundary-plan-20260416.md',
    'docs/planning/reviews/architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md',
    'docs/planning/reviews/architecture-and-governance/20260426-canvas-runtime-policy-architecture-review.md',
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
  const paths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    assert.equal(
      retiredNames.includes(path.split('/').at(-1)),
      false,
      `Relocated retired document: ${path}`
    );
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

test('retired historical reviews and delivery records have no live consumers', () => {
  const retiredFiles = [
    'docs/planning/reviews/ci-and-delivery/index.md',
    'docs/planning/reviews/event-contract-and-traceability/index.md',
    'docs/planning/closeouts/f-04-f-capabilities-port-and-route-query-boundary-closeout.md',
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

test('retired completed plans and intake packs have no live consumers', () => {
  const retired = new Set([
    'buzon/20260423-codex-fowler-access-decision-component-analysis-and-remediation.md',
    'buzon/20260423-codex-fowler-ar-c3-execution-capacity-admission-analysis-and-remediation.md',
    'buzon/20260423-codex-fowler-branch-start-run-control-boundary-analysis-and-remediation.md',
    'buzon/20260423-codex-fowler-run-id-uuidv7-migration-analysis-and-remediation.md',
    'buzon/20260423-codex-fowler-tenant-run-identity-analysis-and-remediation.md',
    'buzon/20260424-codex-fowler-provider-vocabulary-hard-cut-qa.md',
    'buzon/20260424-codex-fowler-temporal-plan-ref-contract-qa.md',
    'buzon/20260428-codex-fowler-temporal-dbt-core-decoupling-analysis-and-remediation.md',
    'buzon/20260428-codex-fowler-temporal-planref-workflow-boundary-analysis-and-remediation.md',
    'buzon/20260429-codex-fowler-temporal-step-plugin-architecture-analysis-and-remediation.md',
    'docs/planning/proposals/README.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/README.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/data/benchmark-comparison.csv',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/data/component-impact-matrix.csv',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/data/component-impact-matrix.json',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/00-executive-summary.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/01-market-benchmarks.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/02-dvt-current-state-audit.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/03-target-product-grammar-and-flows.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/04-visual-system-and-style-guide.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/06-impact-matrix.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/07-rollout-plan.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/08-doc-and-code-drift-notes.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/09-wireframes-and-layouts.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/docs/10-governed-slice-extraction-and-lane-e-mapping.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/references/repo-surfaces.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/references/source-list.md',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/styles/dvt-professional-density.css',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/styles/dvt-professional-theme.tokens.css',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/styles/dvt-professional-typography.css',
    'docs/planning/proposals/dvt-product-ux-professionalization-bundle-20260409/styles/dvt-workbench-monaco-theme-notes.md',
    'docs/planning/proposals/frontend-f04-scope-and-slicing-20260404.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-empty-authoring-entrypoint-design-20260422.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-e-selected-closure-ux-proof-stories-20260423.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-inspector-authoring-and-lifecycle-closure-plan-20260425.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-node-and-edge-lifecycle-closure-plan-20260425.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-project-playground-and-multi-canvas-host-plan-20260423.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/postgres-rls-fowler-qa-remediation-plan-20260426.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/postgres-rls-qa-remediation-plan-20260425.md',
    'docs/planning/proposals/nice-to-have/architecture/rc-e3-execution-tracking-plan-20260328.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/canvas-controller-hardening-compliance-roadmap-20260404.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/dvt-ui-workbench-implementation-roadmap-20260404.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/f-04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md',
  ]);
  const uniqueNames = [...retired]
    .filter(
      (path) =>
        !path.includes('dvt-product-ux-professionalization-bundle-20260409/') &&
        !path.endsWith('/README.md')
    )
    .map((path) => path.split('/').at(-1));
  const namedReference = new RegExp(`(?:${uniqueNames.map(escapeRegExp).join('|')})`, 'u');
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
  for (const path of retired)
    assert.equal(existsSync(path), false, `Retired file returned: ${path}`);
  for (const path of files) {
    if (!existsSync(path) || path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    assert.equal(
      uniqueNames.includes(path.split('/').at(-1)),
      false,
      `Relocated retired file: ${path}`
    );
    const text = readRepoFile(path).replace(
      /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
      ''
    );
    assert.doesNotMatch(text, namedReference, `Live historical reference in ${path}`);
    for (const target of retired)
      assert.equal(text.includes(target), false, `Live historical path in ${path}: ${target}`);
    for (const match of text.matchAll(/\]\(([^\s)]+)\)|`([^`\r\n]+)`/gu)) {
      const value = (match[1] || match[2]).split('#')[0];
      if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) continue;
      const resolved = posix.normalize(posix.join(posix.dirname(path), value));
      assert.equal(
        retired.has(resolved),
        false,
        `Relative historical reference in ${path}: ${value}`
      );
    }
  }
});

test('retired migration plans and dated assessments cannot return', () => {
  const retired = [
    'buzon/20260423-codex-fowler-workspace-authoring-draft-aggregate-analysis.md',
    'buzon/20260424-codex-fowler-ar-c3-admission-observability-analysis-and-remediation.md',
    'buzon/20260430-codex-frontend-operability-fowler-review.md',
    'buzon/20260510-codex-fowler-web-api-mock-hardcut-semantic-encapsulation-analysis.md',
    'buzon/20260518-dhm-ws4-fowler-runtime-path-boundary-hardening-analysis.md',
    'docs/planning/execution-model/execution-state.md',
    'docs/planning/execution-model/handbook-state.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-a12-b-status-model-split-plan-20260411.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-a12-c-read-boundary-purity-plan-20260411.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-b1-run-status-write-boundary-plan-20260404.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-c6-temporal-cancel-semantics-plan-20260410.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-workflow-input-hardening-plan-20260420.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/dvt-dbt-agnostic-generalization-plan-20260403.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-hard-qa-remediation-roadmap-20260404.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/planner-hard-cut-boundary-remediation-20260410.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/planner-kernel-dbt-boundary-extraction-follow-up-20260410.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-c2-b-runtime-read-surface-evidence-plan-20260408.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-postgresql-publication-contract-study-20260903.md',
    'docs/planning/proposals/nice-to-have/architecture/mvp-backend-operability-baseline-roadmap-20260329.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/canvas-controller-document-first-hard-gate-20260404.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/f-23-git-file-history-review-plan-20260407.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/mvp-e1-f03-frontend-backend-contract-and-health-plan-20260404.md',
    'docs/planning/proposals/web-user-stories-20260530.md',
    'docs/planning/proposals/workspace-first-frontend-architecture-specification.md',
    'docs/planning/reviews/architecture-and-governance/20260403-postgres-plan-store-srp-remediation-target.md',
    'docs/planning/reviews/ci-and-delivery/20260330-ci-performance-review-and-action-plan.md',
    'docs/planning/reviews/event-contract-and-traceability/20260330-mvp-b1-claim-evidence-traceability-matrix.md',
    'docs/planning/roadmap/ar-b1-quality-hardening-roadmap-20260404.md',
    'docs/planning/roadmap/diagrams/api-admission-architecture-delta.md',
    'docs/planning/roadmap/diagrams/documentation-governance-architecture-delta.md',
    'docs/planning/roadmap/diagrams/event-lifecycle-retention-architecture-delta.md',
    'docs/planning/roadmap/diagrams/planner-contracts-architecture-delta.md',
    'docs/planning/status/frontend-mature-system-gap-status-20260602.md',
    'docs/planning/studies/planner-source-first-study-20260828.md',
  ];
  const recordedCommands = new Map([
    [
      'docs/evidence/ED-20260410-temporal-native-cancel-semantics.md',
      new Set(['a0360c62f2b476cac9f7fb02d64445848699dfa8']),
    ],
    [
      'docs/evidence/ED-20260412-ar-a12-c5-read-boundary-purity-closeout.md',
      new Set(['a44bb818547d021f2b0c990ecfb7ba70799bf9af']),
    ],
  ]);
  const observedCommands = new Set();
  const stems = retired.map((path) => path.split('/').at(-1).replace(/\.md$/u, ''));
  const referencePatterns = stems.map(
    (stem) =>
      escapeRegExp(stem) +
      (['execution-state', 'handbook-state'].includes(stem) ? '\\.md' : '(?:\\.md)?')
  );
  const references = new RegExp(`(?<![\\w.-])(?:${referencePatterns.join('|')})(?![\\w.-])`, 'u');
  for (const path of retired)
    assert.equal(existsSync(path), false, `Retired document returned: ${path}`);
  const paths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    if (!existsSync(path) || path === 'tools/ci/docs-disposition-canon.test.mjs') continue;
    assert.equal(
      stems.includes(path.split('/').at(-1).replace(/\.md$/u, '')),
      false,
      `Retired document relocated: ${path}`
    );
    for (const line of readRepoFile(path).split(/\r?\n/u)) {
      const live = line.replace(
        /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
        ''
      );
      if (!references.test(live)) continue;
      const hash = execFileSync('git', ['hash-object', '--stdin'], {
        input: line.trim(),
        encoding: 'utf8',
      }).trim();
      assert.ok(
        recordedCommands.get(path)?.has(hash),
        `Live retired reference in ${path}: ${line.trim()}`
      );
      observedCommands.add(`${path}:${hash}`);
    }
  }
  for (const [path, hashes] of recordedCommands) {
    for (const hash of hashes)
      assert.ok(
        observedCommands.has(`${path}:${hash}`),
        `Recorded command changed or missing: ${path}:${hash}`
      );
  }
});

test('current task guidance no longer routes work through retired planning groups', () => {
  const surfaces = [
    'docs/architecture/architecture-surface-inventory-20260402.md',
    'docs/architecture/components/api/runtime-review-canon-component.md',
    'docs/architecture/components/ci-governance/local-changed-files-gate-component.md',
    'docs/architecture/components/engine/adapters/state-store/postgres/run-events-partitioning-component.md',
    'docs/architecture/components/engine/adapters/temporal/temporal-planref-capacity-sla.md',
    'docs/architecture/components/engine/architecture/c4-engine.md',
    'docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md',
    'docs/architecture/components/engine/ops/observability.md',
    'docs/architecture/components/engine/ops/runbooks/incident-response.md',
    'docs/architecture/components/engine/ops/slo-posture.md',
    'docs/architecture/components/engine/reviews/refactor-list-stale-snapshot-runs-sql.md',
    'docs/architecture/components/web/graph/canvas-draft-access-posture-component.md',
    'docs/architecture/components/web/runs/frontend-backend-mvp-contract.md',
    'docs/architecture/domain-map.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/guides/api-control-plane-technical-manual-20260404.md',
    'docs/guides/ar-c2-automated-evidence-technical-manual-20260404.md',
    'docs/guides/generic-graph-source-user-manual-20260404.md',
    'docs/guides/plan-compile-catalog-extension-technical-manual-20260417.md',
    'docs/guides/testing-and-ci-capabilities.md',
    'docs/planning/domains/execution-runtime.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-inspector-plugin-authoring-fields-plan-20260604.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-context-properties-panel-plan-20260604.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-node-identity-policy-plan-20260601.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-visible-i18n-debt-plan-20260508.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-3-project-snapshot-roundtrip-plan-20260511.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/cux1-wux1-workbench-ux-convergence-plan-20260806.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/e-dvt-inspector-panels-plan-20260601.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f05-store-domain-ownership-closure-plan-20260503.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f15f-canvas-workbench-screen-consolidation-plan-20260519.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f15g-first-canvas-creation-capability-plan-20260519.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f15h-first-canvas-draft-capability-split-plan-20260520.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f19-marquez-public-data-visual-system-plan-20260522.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f24-context-panel-token-convergence-plan-20260522.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f24-monaco-visual-token-convergence-plan-20260522.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/f25-plugin-capability-table-plan-20260522.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/implemented-capabilities/index.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/implemented-technical/index.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/index.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/pending-work/index.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/sql-canvas-demanding-user-flow-review-plan-20260608.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-a-authoring-draft-hard-cut-implementation-plan-20260503.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-k-playground-complete-cycle-stories-20260424.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-b-canvas-draft-denial-posture-implementation-plan-20260501.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-m-c-first-canvas-first-node-live-proof-implementation-plan-20260501.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-production-node-authoring-and-persistence-plan-20260416.md',
    'docs/planning/proposals/mandatory/frontend-and-ux/web-auth-project-onboarding-and-actionable-gaps-20260501.md',
    'docs/planning/proposals/mandatory/governance-and-docs/arc-state-store-policy-routing-plan-20260510.md',
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-plan-20260402.md',
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-governance-parity-implementation-plan-20260502.md',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-scope-optimization-plan-20260508.md',
    'docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md',
    'docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-a5-plan-identity-determinism-verification-20260506.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-sla-operational-closure-plan-20260404.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-execution-capacity-admission-user-stories-20260424.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-c3-start-run-execution-capacity-admission-plan-20260422.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/ar-d-plan-pointer-dbt-plugin-package-extraction-plan-20260514.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/dbt-step-capability-admission-plan-20260603.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/mw-c1-to-tf-c2-runtime-vertical-sequence-analysis-20260409.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/plan-creation-interface-route-proposal-20260405.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/protected-runtime-rail-closure-plan-20260503.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/rc-c2-shared-preflight-and-ci-log-first-triage-plan-20260401.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/run-events-hash-partitioning-plan-20260513.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/runtime-hardening-shared-kernel-and-operations-roadmap-20260410.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-record-plan-store-execution-plan-20260402.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/s08-plan-store-command-query-matrix-20260501.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tenant-run-identity-platform-owned-run-id-plan-20260423.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-a1-c-srp-and-extensibility-hardening-plan-20260414.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-architecture-and-contracts-20260405.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-product-decisions-20260405.md',
    'docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md',
    'docs/planning/proposals/nice-to-have/architecture/ddd-hexagonal-modularization-plan-20260323.md',
    'docs/planning/proposals/nice-to-have/architecture/evidence-information-architecture-plan-20260402.md',
    'docs/planning/proposals/nice-to-have/architecture/todo.md',
    'docs/planning/proposals/nice-to-have/frontend-and-ux/frontend-roadmap-20260219.md',
    'docs/planning/proposals/portfolio-map-20260403.md',
    'docs/planning/roadmap/diagrams/execution-dependency-gates.md',
    'docs/planning/roadmap/diagrams/index.md',
    'docs/planning/status/ai-efficiency-adoption-status.md',
    'docs/runbooks/api-runtime-sla-canonical-20260404.md',
    'docs/runbooks/backend-mvp-control-plane-runbook-20260329.md',
  ];
  const reviewGuide = readRepoFile(
    'docs/architecture/components/api/runtime-review-canon-component.md'
  );
  assert.doesNotMatch(reviewGuide, /Planning DB task|PlanningDbTask/u);
  assert.match(reviewGuide, /governing GitHub issue/u);
  const retiredRouting =
    /(?<![\w-])(?:lane[ -]+[A-E]\b|lane[-\s]+(?:YAML|registry|tasks?|plan|closeout|metadata))|agent-lane-|lane_yaml_changed|^lane:\s*[A-E]\s*$|docs:planning:lanes|docs:workboard|gap-execution-parallel-lanes\.md/imu;
  for (const path of surfaces) {
    const currentGuidance = readRepoFile(path)
      .replace(/^```feature-mechanization[^\n]*\n[\s\S]*?^```/gmu, '')
      .replace(
        /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu,
        ''
      );
    assert.doesNotMatch(currentGuidance, retiredRouting, path);
  }
  assert.equal(existsSync('docs/planning/roadmap/diagrams/gap-execution-parallel-lanes.md'), false);
  assert.match(
    readRepoFile('docs/planning/roadmap/diagrams/execution-dependency-gates.md'),
    /^# Execution Dependency Gates$/mu
  );
});

// Refs #3004: dated implementation journals are historical Git content, not live authority.
// Retained mechanization paths below describe previously allowed/changed surfaces only.
// They are NOT governing sources, component guides, user stories, or evidence presence rules.
test('historical implementation journals stay retired without erasing mechanization history', async () => {
  const { createHash } = await import('node:crypto');
  const { readFileSync } = await import('node:fs');
  const { extractFeatureMechanizationManifests } =
    await import('../../scripts/lib/feature-mechanization-manifest.cjs');
  const retired = [
    'buzon/20260428-codex-fowler-web-graph-startup-and-draft-recovery-analysis.md',
    'buzon/20260502-tf-e2-m-b-canvas-draft-access-posture-fowler-review.md',
    'buzon/20260502-tf-e2-m-d-startup-route-readiness-fowler-review.md',
    'buzon/20260503-branch-fowler-hard-qa-review.md',
    'buzon/20260503-tf-e2-a-authoring-draft-hard-cut-fowler-review.md',
    'buzon/20260503-tf-e2-a-fowler-hard-qa-review-followup.md',
    'buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md',
    'buzon/20260506-codex-fowler-canvas-workbench-shell-context-hardening-review.md',
    'buzon/20260506-codex-fowler-canvas-workbench-shell-context-review-and-risk.md',
    'buzon/20260506-codex-fowler-canvas-workbench-stage-1-text-only-tabs-review.md',
    'buzon/20260509-codex-fowler-ar-d7-tenant-aware-outbox-sharding-analysis.md',
    'buzon/20260510-codex-fowler-web-api-authority-hardcut-analysis.md',
    'buzon/20260510-codex-fowler-web-api-remediation-analysis.md',
    'buzon/20260510-codex-fowler-workspace-port-decomposition-analysis.md',
    'buzon/20260510-web-api-remediation-execution-log.md',
    'buzon/20260511-codex-fowler-canvas-project-snapshot-analysis-and-remediation.md',
    'buzon/20260512-codex-fowler-ar-c5-adapter-circuit-breaker-analysis-and-remediation.md',
    'buzon/20260512-codex-fowler-we-hx-3-start-run-decomposition-analysis-and-remediation.md',
    'buzon/20260513-codex-fowler-ar-a4-custom-policy-namespace-freeze-analysis.md',
    'buzon/20260513-codex-fowler-ar-a6-snapshot-rebuild-concurrency-contract-analysis.md',
    'buzon/20260514-codex-fowler-ar-c2-prometheus-sla-hardcut-analysis.md',
    'buzon/20260514-codex-fowler-ar-d-plan-pointer-dbt-package-extraction-analysis.md',
    'buzon/20260514-codex-fowler-ea-20260429-07-provider-ref-proof-analysis.md',
    'buzon/20260514-codex-fowler-f27-alpha-route-gate-analysis.md',
    'buzon/20260514-codex-fowler-we-hx-0-hardcut-map-analysis.md',
    'buzon/20260515-codex-fowler-ci-audit-engine-coverage-analysis.md',
    'buzon/20260516-codex-fowler-f15-canvas-view-menu-architecture-analysis.md',
    'buzon/20260518-codex-fowler-f27-plan-run-readiness-analysis.md',
    'buzon/20260518-dhm-ws3-fowler-admission-semantics-analysis.md',
    'buzon/20260518-f12-fowler-canvas-legacy-retirement-analysis.md',
    'buzon/20260518-f16-fowler-dense-operational-tables-analysis.md',
    'buzon/20260518-f24-fowler-runs-dense-table-token-convergence-analysis.md',
    'buzon/20260519-f17b-fowler-monaco-diff-review-surface-analysis.md',
    'buzon/20260520-codex-fowler-doc-governance-latency-analysis.md',
    'buzon/20260520-f14b-fowler-web-vitest-pr-changed-suite-routing-analysis.md',
    'buzon/20260520-f17c-fowler-artifacts-monaco-readonly-viewer-analysis.md',
    'buzon/20260520-f17g-fowler-code-monaco-editable-workspace-access-analysis.md',
    'buzon/20260521-codex-fowler-route-workbench-frame-analysis-and-remediation.md',
    'buzon/20260522-codex-fowler-f21-execution-template-workbench-analysis.md',
    'buzon/20260522-f17d-fowler-templates-monaco-preview-analysis.md',
    'buzon/20260522-f17e-fowler-monaco-bundle-isolation-analysis.md',
    'buzon/20260522-f17f-fowler-workspace-diff-backend-rail-analysis.md',
    'buzon/20260523-codex-fowler-ar-c11-start-run-identity-follow-up.md',
    'buzon/20260523-codex-fowler-architecture-doc-reconciliation-canon.md',
    'buzon/20260523-codex-fowler-canvas-workbench-canon.md',
    'buzon/20260523-codex-fowler-ci-retention-review-canon.md',
    'buzon/20260523-codex-fowler-runtime-review-canon.md',
    'buzon/20260523-codex-fowler-tsconfig-baseurl-policy-canon.md',
    'buzon/20260523-codex-fowler-web-auth-project-onboarding-canon.md',
    'buzon/20260524-codex-fowler-architecture-governance-review-canon.md',
    'buzon/20260524-codex-fowler-autogenerated-pages-canon.md',
    'buzon/20260524-codex-fowler-docs-disposition-canon.md',
    'buzon/20260524-codex-fowler-documentation-usability-canon.md',
    'buzon/20260524-codex-fowler-governance-startup-card-canon.md',
    'buzon/20260524-codex-fowler-workbench-ux-canon.md',
    'docs/planning/closeouts/20260415-ar-c4-run-state-circuit-breaker-closeout.md',
    'docs/planning/closeouts/20260416-tf-c4-workspace-graph-draft-protected-boundary-closeout.md',
    'docs/planning/closeouts/20260423-tenant-run-identity-platform-owned-run-id-closeout.md',
    'docs/planning/closeouts/20260502-tf-e2-m-c-first-authoring-live-proof-closeout.md',
    'docs/planning/closeouts/20260503-tf-e2-a-authoring-draft-hard-cut-closeout.md',
    'docs/planning/closeouts/20260503-tf-e2-m-b-canvas-draft-access-posture-closeout.md',
    'docs/planning/closeouts/20260503-tf-e2-m-d-startup-route-readiness-closeout.md',
    'docs/planning/closeouts/20260505-api-deploy-start-posture-closeout.md',
    'docs/planning/closeouts/20260509-ar-d7-tenant-aware-outbox-sharding-closeout.md',
    'docs/planning/closeouts/20260512-ar-c5-adapter-circuit-breaker-closeout.md',
    'docs/planning/closeouts/20260512-dhm-ws2-runtime-composition-root-closeout.md',
    'docs/planning/closeouts/20260512-dhm-ws4-runtime-path-decomposition-closeout.md',
    'docs/planning/closeouts/20260512-we-hx-5-provider-telemetry-seams-closeout.md',
    'docs/planning/closeouts/20260512-we-hx-6-boundary-fitness-closeout.md',
    'docs/planning/closeouts/20260513-ar-a4-custom-policy-namespace-freeze-closeout.md',
    'docs/planning/closeouts/20260513-ar-c2-inv-1-immutable-evidence-gate-closeout.md',
    'docs/planning/closeouts/20260513-ar-c2-inv-3-threshold-source-trace-closeout.md',
    'docs/planning/closeouts/20260513-ar-c2-inv-4-sustained-validation-window-gate-closeout.md',
    'docs/planning/closeouts/20260513-ar-c2-inv-5-non-skip-qa-artifact-gate-closeout.md',
    'docs/planning/closeouts/20260513-ar-d4-zero-downtime-schema-rollback-closeout.md',
    'docs/planning/closeouts/20260513-ea-20260429-01-plan-schema-version-admission-closeout.md',
    'docs/planning/closeouts/20260513-governance-file-shards-db-backed-policy-closeout.md',
    'docs/planning/closeouts/20260513-mw-d2-provider-neutral-worker-routing-closeout.md',
    'docs/planning/closeouts/20260513-run-events-hash-partitioning-closeout.md',
    'docs/planning/closeouts/20260513-s18-f1-a-state-store-role-boundary-closeout.md',
    'docs/planning/closeouts/20260514-ar-c2-prometheus-sla-hardcut-closeout.md',
    'docs/planning/closeouts/20260514-ar-d-plan-pointer-dbt-package-extraction-closeout.md',
    'docs/planning/closeouts/20260514-ar-d3-worker-scaling-strategy-closeout.md',
    'docs/planning/closeouts/20260514-f28-canvas-workbench-sequence-closeout.md',
    'docs/planning/closeouts/20260514-rc-g1-contract-ownership-closure-closeout.md',
    'docs/planning/closeouts/20260514-we-hx-0-hardcut-canonical-map-closeout.md',
    'docs/planning/closeouts/20260518-f16-dense-operational-tables-closeout.md',
    'docs/planning/closeouts/20260519-f17b-monaco-diff-review-surface-closeout.md',
    'docs/planning/closeouts/20260522-ar-d5-tenant-configurable-retention-policy-closeout.md',
    'docs/planning/closeouts/20260522-ar-d8-default-retention-runtime-baseline-closeout.md',
    'docs/planning/closeouts/20260522-f17d-templates-monaco-preview-closeout.md',
    'docs/planning/closeouts/20260522-f17e-monaco-bundle-isolation-closeout.md',
    'docs/planning/closeouts/20260522-f17f-workspace-diff-backend-rail-closeout.md',
    'docs/planning/closeouts/20260522-f18-live-log-console-closeout.md',
    'docs/planning/closeouts/20260522-f19-marquez-public-data-visual-system-closeout.md',
    'docs/planning/closeouts/20260522-f21-execution-template-source-generation-workbench-closeout.md',
    'docs/planning/closeouts/20260522-f23-git-file-history-review-closeout.md',
    'docs/planning/closeouts/20260525-f30-graph-code-artifacts-parity-closeout.md',
    'docs/planning/closeouts/20260530-e-canvas-source-import-backend-closeout.md',
    'docs/planning/closeouts/20260531-e-source-import-commercial-hardening-closeout.md',
  ];
  const retiredContentHashes = new Set([
    '04d413485484d8973ff8b931f1a89582e8df657807e940528aa28b976b007cbb',
    '055151dc24de19872a41850d11fc467786a356088493c9a17a93a1d63bc6af10',
    '0626e0bbba58f7b62a7666249cfe6f5674810bb98473208fdb2c95b6ec4adb6c',
    '0802d07d6208ca57330c202f2c6d2b5344342f67402ced06e2def124ed49e87f',
    '09ee1f77c0c833427ff3c4b167977ad9fcb20577d0e27b6dbf879ceccbd579d4',
    '0a242d661b394c466ecb11008f267fd584de84967e37214e85c2a29fc77126cd',
    '147a01ec384d5f9d82ddb9b8294b78344f7399158d4f2a438d71e960e6725ad9',
    '16fb7bb13b40267c8fdc5ae00e23d08e2b48d29a7f6789f9846aa4f58839fc66',
    '1957496c628ac8a65e68b0112e4add498ff973153f3f2cbe3c73e7e174077db9',
    '19c01113a12343979390bcc1f5513e1c1d21d86c61bbec2244714d94bc7696a6',
    '1ba3114631344f950536bbfe358f7ab7ff445618bbc82a662ad65abc71e72386',
    '1fc68d43f164c6bfc4a937973699af36c5ba5bc397bf4b8d95f7893e08537528',
    '2077bca47a95881c140d9eed76e47953a28a6c2e112163378a0726a5412aea0f',
    '20a21672e39068156b5af8ec03e2a842ae61ec185d6c83760fa1490d02aa255d',
    '2139ac5e5e67e07f962404a9c26ad7d92f39d2cd2800a390aff9214cf0b2a9cf',
    '26eb20e6e79bdc1604733d969cb0e695d1a5979259361ece4144d2ba228aaa0c',
    '290ce0c5cb7fcbe5ea9805e4e48aefc2132faf407a6d99734108a34d0c3be0ad',
    '300c48b6f464dd8d29b6535ad02eda1fd96ea42f55987466f59267a172443f1d',
    '33d02266d73b3178d3d78f798679c6276e868cc158eb8364055bc4ed3a37773b',
    '3cf929042555492bd25621d13a06b0c775df092152f7a6fa60c744d781e784dd',
    '3ea996c551e6f470dd52b3f54c5d475bbc3dc907e5c1c70104534c3b798bfdb2',
    '43a754faeb6e97bb310d2d7d74a04cf8fa59218629d8c56647a30826a775d85c',
    '44b98c50de7cb454f21303a14af3139a8cd0c7147e0ac5b73d023cf18e343128',
    '453f08702e79f905e112b559e569341074f71fe3df296b650d55adebdbf28c28',
    '455260c6c987860fc81de5866ecffdbe6e4cf55c0dc0ca1c836983870fa85db0',
    '47a78d384829696ee6f1e2e070b52b8291d0f95ce3d4cfc841f2637ecd87ed44',
    '494b4fc59ed493c4238dcee62f1687926a6a4ac3289d9c33844acc8552948993',
    '49648b598b1ff6acaa97165659ecc8555b0e86d2a5a4927c4902f2020a4f8ccc',
    '4ab5f4bc482e36ddc8e0a44418530090397cfa950afcea78ab91c231e4da011e',
    '4eed94188851d0a92487700a352e4dbaf680f0f9805348a8ffa11dd7c29bf9f2',
    '5678f24add7d68e03acbbdb58fef1d2756b05c3ceac0cc4e49cc7fcd2e017db6',
    '5cb11c76509da6b313f4cd68469e53b4b7a97167b10095e2f441654d075aa447',
    '5f7161b5d9594cb1c70470a156fe8e8f2d0609a6d80996cb46dcf0d65b782526',
    '6209526b7491d1abd53e063021bee31d12565873be4c9a64dcb03fb0282f02e4',
    '64facb898ac354991d685603d735273996458c0e2199f00df8a73d4b8571a959',
    '68302dcb377f2caadb49fdfdd122b0d32798279b097c7f3991c1b47880582fb6',
    '6a179b0f5f445060872050eb8e5ce0d3842f69f3f81cd911856f47aec7e4e251',
    '6cea462a9a29d4dd55f27b5a77e95fbfc4513d40b9f297ac78380739c871ad8c',
    '7031709d5728280b2558115cae338877c30b91a742a06061aafe947787ccf36a',
    '72c23a8394fd9cb10f415cdef228fafad829b9179f480e882c0f631e052c361b',
    '753507ba36e6d84da5ffc64f8392c57a9aabdf2daf15c101dfe4c371c85e6afd',
    '777c539de23b5c8a015e0433d96bbbe9bbc448e35ba465f515c93428061ac16d',
    '78e46e99b187f31b32fe65f5592bd85b05d634579a1ca3efddb1edce730825ae',
    '7fa55f560c4c878057c1d6f933cbc8bd3f64b661d5fa5f61cb098734ddecfb2e',
    '80658a16909875137a1d6ab5c7f810a9b7e5a1e265708db0d12e25b581844076',
    '834e05a236e9e6db9d575874b90af462ef07501cef27edfafa9c8572fdb1204a',
    '8424cfb0ed20a476983dfbd37469dc31b78125eab5cec733a6882e01eb8123e1',
    '84548cccc59e69f697eb4578919e6fb0d71fee583589ffbed17c937ddad739f8',
    '85774660e577ffc36f640de2c9ba58f5e325d4f285b39221a5e1323d2b9fd856',
    '89045fafa22aae16905ff8e8034c94cdfdbfa83e08268ea1ff582c69371f9392',
    '8b26f4e7523f2891451f51a8834d4db4dcd770dfa23ad33d488a5e4aa88dcd9c',
    '8d5764cc205d78314b969daa52204e4f40027a2f0f27c8cfc54ab9e9b2f1234d',
    '8e847348b53c3ffe5390ebc46f36098ff53c16b5de1a81f1000ea27320c0c460',
    '8ec2592193c662cd2d356071cb1c7f23571dc1af7834a785a36795d61c22762e',
    '8f855247b7dda874bca0d181d7007079e90a50f7508769a6ddb0b66d7e3e325c',
    '8fc0cc77728c4a94faf40ab1d36bcd60a6e2c72c65c2a8ec50ef62b50c937c99',
    '92a51eb5ec34914d6d5f6649b598494ace563427eaf7009a3fd9f1eb324c955c',
    '92df9a1f885ab6673d23e9530e5b9dcd452f4f1926f994238cd0dc4961de5d6b',
    '9385fe2949ee2c7923a6ca6299fe99a9fa1503fed6558cc0691017c5d16cf1d4',
    '94f69389d5dd31e8b86a39a94849d7debf7648e1ddafa6e2bd6f5b54ba8b0bb5',
    '9653d0ed53cf9ede88412c6cb3fe375ce7b81f909b4cf3d5ec0fc265b39cdfc8',
    '971823536453fb7b7674285195d2facf83fbcc31551a098cfd5d9d1af36064ef',
    '98d7c21cbe6a62d591c64fc3804ef82db9808b8e7b639e2a1365e17a73d5123d',
    '9aff9db598b35963f2a99d5242cb15c30db9e1be75609a31f7ce7c15e9489001',
    '9bce6c7fc6a7dad9b72c561551373da509f37ed7d260f7b40c83ab9c182effa5',
    '9c7c56efa66db11aba47d3597e62d4d6b6ab85dca8b9776f5d3aa014dcab5090',
    '9d0c53cd4652d315cd0a61e6aab006474a9ca0829939bb9883ff098224750ef7',
    '9da4a3f8bd720cedbab4cb1954c22d6937060623fa95a5600d9493d3080ccf3c',
    'a47d8867b1a4c79ee7026b0c5671fee3b2070fcd2e1ae389c76016452f502577',
    'aed663e24cb8d64c57016d0dc18e218baade9744ab5f564f796b86d2ee9b391e',
    'affb69df904c8014bae21df5473916e45a506252291224f7b5e05daffbde062c',
    'b6dd367369bc3c1c227cc221f6758a5f4844908bd44af35c7e9c80276eac1912',
    'bf387d49ada8b91933f9da8653cccc0f70690196f963508bbbdae838392055ff',
    'c2b60749230b59ac0c1c1a61b662b9ed48e60e5074181f95047f1ee9543b7f23',
    'c3f0b4ba460389246ef373c9783d1c733c25ff716b07da0fb563b53080b693f3',
    'c429d30f51aa6a5a779001324a91792bc6df22f302e8423dbd2b6ff1673c0612',
    'c83cab1b9878f2f9612260680c7781a1da6347fc7890a4f03ff62a1378e8e9fa',
    'ce1f36f2cd7cfc486b68ed3b5ae384e527f73a0121f8f503297f8010e06c9422',
    'ce3c245b3a23cbd7ef48e2a86b06a20f33ce8e370f9329e857e6757a5789ebfa',
    'd0f9cefaebfd4e02400017d7233fd62ab682c1fa8b01c3a3cf0e761412a1ed54',
    'd27bfb78cfbe2193af250e9aab0da2c9ec719f8e22ac82809a3cb73ce09c98e4',
    'd3131f968f90c11d8c7fd8812eaf15956eb6e86c1edf197601137c74a349b295',
    'da42b0a1590d27c9918b59ba21d732b12517315f662b58f3af7285f6e79c5373',
    'e1e7a4c5b327c3a687e6cd2850597f35da1b4bbd0fa0d133415c43f85708e951',
    'e2cc408970f8215833dae189ac50d7522350db7e70547fc600ab0ee78aaa5343',
    'e48f6825ff5ec188926eb73a4cc45afce8fbbc6f983dad99f20fcef5eefc4ab4',
    'e4de28737df36a95f5395a241c0a7b8a67923bb3e49c3d26f563d45187e416f7',
    'e52303da69b7da2cf26e32e08d34205b0a457310a3cd6b488887df19de07c990',
    'e8e0357b581c07f75f662c48318ced174c196135d8390bbb7156905ea6a0a957',
    'ea4fcccb158751448a3dfc70dd0d0768d8208801428952498aaa8370ad7e0f8b',
    'ecff86580d3db93b6499bb42e22a4c99e3d1bbec0f3ac54b009baddfa66e07f8',
    'f07668df6b65ca3f0bc70d4db4cf6a4f6582b25461998d94881d41cf42c641c5',
    'f15c2b264b7cc8e87c47b2d33cf34bb27c8acde338d7b807e8b97e39a5a6c5a3',
    'f283f17f153585f2e4b4d5e3ca1fe254667ff8c20117bc23cfa45df97ca58938',
    'f2c4956af272cf1674b1449a0929a95671a79229ceb491162f6b553bb45a704d',
    'f5a9eebda73362efb9c2b0d2364a25e0b030bbc2c5867976930bea8f709cdb5f',
    'f6b9fb23bcae4b718c0ac19edb19553763fb412d3f298c4c1cc697b0b7a37d80',
    'faad14022c3a8702d14ba5eeb154552876d2128dacb7ac3e7aafddd33ccd41df',
    'fc22a93392805d36a71a6081292f82b4836801d77d8981d750e56831d41a434c',
    'fd53d7bfd0d64e569d582e1c53fa4f9dcc3c564d1a070e91865b4096bd0bca96',
  ]);
  // SHA256([consumer path, featureId, exact field path, retired value]) -> original count.
  // Removing a historical field is allowed; moving, duplicating or adding a reference is not.
  const historicalFields = {
    '00e64b9d2beb74df36cf27d5bf9b297d7f6b2382efdd18eb81aa2e1a62555552': 1,
    '02407fac664b18f92a94ef565d52cb1ced254b0f1261f618338463be80330e2a': 1,
    '089a5aadb89fc4575d5ec0e3d44452a922a869d9761f9bedc9749351e1502f4c': 1,
    '08b65fb81d5a6d0bf92ef6d4254010eaf279e9a6018cb3c3eac803590c1d0cd2': 1,
    '0947244414776ecf423c60bc56301a7b6e6586cb5fa4e167bff6da3d08236898': 1,
    '0b50e7ad8746f8ae91f8247732353b927c4098a10316d43059c66f76a562853f': 1,
    '0ced64764a04d4b9567e43ca62f53c59a65c3373cabfc5c9cf283f55ddacfb69': 1,
    '0ecd5a2fc080b0e6484eaef111290909d6de84650345005d2e2b8dada64b223e': 1,
    '0fa452208770c570db63c3cc41b4695f1c3f118309cbd2aa66e7f7c0ef355113': 1,
    '15ccf143b4da28c728fb301ab16252bb20e9d5a4d6e63b235f8d680cf76b9624': 1,
    '17e23e789dc388c0a71d59bb37768fe6210b15dfd389338795dc34aeafe7cee5': 1,
    '1ccd0fe771f4f3d0ce3b1bc451e8957326691a052735aad82454fb4a189acbea': 1,
    '1d62330dd208aedfc13b3c68736d68d9df9d10ee46169488377214d54abd0063': 1,
    '1df0b1843e3fc3964824ac8ea71f9ceb564b741081f742e65c297e309b7d75a2': 1,
    '1ea960e042fc59039e2c0106ab5d487a74c17606032943b7a9542ef28633de30': 1,
    '203050e3a848669696f2c1bee8327ca2fff90bf9736da42d0db3d16da46eacdf': 1,
    '26842844633dcc52b77556a9e22e18a6d3dcb479a7d25d73e28ec58e2b6c2ed2': 1,
    '29f8ee59b553c3d0948fae2e2ed8b18e8d09ceb8ba59db0b4f99431f2e0a23eb': 1,
    '2c590418d766af6d87fb69e420b9639465f816e9844407d6544b113a08fa5e56': 1,
    '2d51059803279dca700d2e9e95d978b7353585b0131b5c038f14f82ee2e058dd': 1,
    '2dc486fb32445aa0f45499df93065527bdbbbe582e7ca241461950195254a4c1': 1,
    '2dc5835d831532a88bb932bdcdb121ca3d90fa9f94a9f76063a06f9c5da239b3': 1,
    '2e5e6fefe00470028cfac78cf8f77bc5cfb39a2c921242125837aadd21c43aa7': 1,
    '2fb596e3d0074d9be09c2eabebd544dbc79abd8cd6972bbd746b78e86628449f': 1,
    '3004c9fd9b4327b6030ae9eac3367fc3989059e9c9c7d487198cf45ae5839f56': 1,
    '31f56ac0e89878d1c0cc68235d6a5a599260b243897285a9be7cd6c8cc0108fb': 1,
    '3323a720f43f630ef4a49e5828d56f3be6b4067638ef285cc4f6df96c94ec403': 1,
    '36babfe468f2969d0a217081b8a6af080dc84b5cc3d397591e7f43084d9d033c': 1,
    '374e1aaddd33f9d61e1f478c4f40717f365c1b5c0b41992ed13b3a77951d8824': 1,
    '3bd046b029a6a6bec884086498bac1c30b0c27d369e583c0e80d52fb4d30c46f': 1,
    '41915388c20137fd4f4ef39b0fb087d378c374611f863c807864e4891e32cff4': 1,
    '4351661a6b910733d64e03c1c9bb80349dfb805c1c8e1cf9e733e3e35e7cc5cf': 1,
    '446f241c878ace369e01cd24285c60f3a8e494c329cca200c6af82f24a772d2f': 1,
    '46831229d908b133d651a1030e08b69ba923a9913fd30cbb3feb74699c89f68d': 1,
    '4e6e448c1efeb31cad26f7d1a509966708acf393383f71eaa51e842cf9c15ab1': 1,
    '4f6224a844a04a347987d1f6acb0ed2faea1c5a11dd8cbaf7034b131b6c30ee6': 1,
    '4fa3d6d08f822b9926635da45ae7cd8aecfc40f32abf0386bd99756b535a14de': 1,
    '551fe0e7cd80680be89382d324230dedb35246c5818823fe078ba7a267cc8f20': 1,
    '55d717bae7b4b39f44a71f05ddbbf6951001ead93569a61f2ae5182a17c83c46': 1,
    '580d3b9fe51c301af2108c8616ce5445bdee0e6659213b74127fc9f2c80a8ceb': 1,
    '5b91f75e68a71f8fc7d15102efd343b76e836922a67b7921d8d61ebc616db638': 1,
    '5d9add8148adb06eebad88dfcb9330127b16861ba88cb6882aee1d4cadfd762a': 1,
    '5dd06ec0126b4c2d809d7f50eb14feac838e1370f50cbbf05e3d5aa3e1a2e5cb': 1,
    '611d8cea03e71728b6e9649aba81c4f29d79903e56510c8bc4ca0b6a03b790d7': 1,
    '6349ea8455ec76cb00a2c0a1d82eb6579f7ffa28dd5d994ff7c5f39158aa4bba': 1,
    '64603ed2e5373f0ed4300ad01c47e08616020a6e391345745b8c47f3b8c18413': 1,
    '6a0eccf9c678984bd2040d3173f676ebe72990128977b983c19ef418f3c32334': 1,
    '6b16f5a50619f039adb0ad40e80a133cee1284eb901452dc8a361d2ed515c4b8': 1,
    '6be8753f38f697f73c8d8a87249113f03975e393ecf7b60c80af16b617ba86d3': 1,
    '6cf15d7304cca98555d7393e7b4a82989749df0608fbafd642a267e69d3eb636': 1,
    '6ea12cf725e25827b3df790d1dc6633949c5208482ddc06225b4807ace2e9be2': 1,
    '6fa2331ae8392bc480a198b4ee9151087d3c23f4ea63163b94900c3c9e7bc9bd': 1,
    '7005050b1ce35815846de42290328f8b671e769e025fd8fd227b2d84332ee00b': 1,
    '7208edf6edb5ae9369fa6be48e1551c149873df9c112b90a38031ec524b6089b': 1,
    '72153d7cd38d5770357fb72606966cd3c9b0ca9e8f0b8e1c39138333bc3b74ae': 1,
    '7554313dc97750031f7319b7fcf2ecc356e4d417bc8b22598689e39939ceb7d5': 1,
    '76c5756934405aefb526e92a7523458e53eef2a5d8935badf4c0fb726b3830f2': 1,
    '77c854fd41d7bf769da775d0aaca68ff31f4c6468032f06998936cad65250632': 1,
    '796a83255ea9db9c8b031f73499901189500735cd37cdf1ec80ade39503ab6dc': 1,
    '7aa2ff1b62c7a332c1fe1f217cb2015d7568d15e9044e448c4374a45a00aceb6': 1,
    '7ef3ad08e6b37e493f3f03c3cac36747e58996293ed578918c7c93475fc65904': 1,
    '805ba2f455fb183d8de23984fa6fcdf1f80596bd258c286e80c8be6c447dc215': 1,
    '809407b7cfee13d190b23b42512353b71176366901129e5d3d3a48e3f1ec24f2': 1,
    '81f328dbaab4f695977629cd3d18d244eda0cff1045eb4f1786b1b9cba551750': 1,
    '83af8076558b2811f496ac28136f5574bfd9ebb733482ec652e39bd328212c29': 1,
    '88d64910db4ed3d6dab81c7d8a260b0974d97dfde1e976be9c41a870cf0bfc93': 1,
    '8e463adc181ee015b718c002551bb472cb60b94f1292c34af0cdae7b7701f303': 1,
    '8fa9bc1972d228a082dd74f0f58031f634f474abdb96aa3604e812c74b7c0481': 1,
    '8ffbe23eb3f496cc1423e8c3179abc59d83463c5cefce513e236d0c9991dc104': 1,
    '95658ae8412bc1b56c9e805e084b6615ba62cff26767795b05822ba483e84bad': 1,
    '97d773d94d99126c950dda084706fff8238a6c29660ba6da93219a99448114f5': 1,
    '9a2785a9e100ca52a558c8b07635d409ad66885ad0c733118ae4f54e08aa0f31': 1,
    '9a55faa83779df9c78f289f59e674127d0db3fedd664cfa1c938db8f5f6cfc20': 1,
    '9bcb6eaaa234ea04a253066cef7139f67b410729ab955e37484242e65c0460e3': 1,
    a1aed06f44f429be7808bb7eb1f622f66803859856d7cd4c56a4a09126841133: 1,
    a1fab5397a2dbfb54e51aee97f7cdb6ed6b08bdbafe236ec13ebc2a98362c8a1: 1,
    a4e631251b6b0898d5d557ab9737dd15806e14250e802a728b1caecfe0720b71: 1,
    a769903cecb9bda561be440fdb54a617d156ec6c6032d15840c5fdd29ee13695: 1,
    a81f2c5e1c3d8b73d139819d9fd20b25d3d3a3c19af24036196eb298c774526d: 1,
    aba5128c8e15a18d150ce3d26e53d88c5a6e6d36ebf52f614b5c10958616f5ee: 1,
    b0fbceb814e6fca9682fbbeb1e45ac22b33d35cbfbcdd55a624a3fcb02cac1a8: 1,
    b665a4566b43b3adb691729e44c4dfdab1b106d56d72cb2d1e7966ab2341a6a7: 1,
    b9aacbe9d9d2ff14489f7751815b48595e6600622665a325f39d963bb7b8546c: 1,
    bb1fd7532fa49a096da84b56e7b915446598b8e5681fbadc1dfa286dc65e566c: 1,
    bcce9be025a67e816b3ee2420834224433eeec5926d5575e9b72bb7ea6ebdf6f: 1,
    c24444f2c226e69d3920f9e07d905bf5904459a6ea0a8dd5a9316bd41dc57627: 1,
    c2b45dba3b5ff3a5b335e5f76563f382edb1c045155a3a5bcee2bc8c398acdec: 1,
    c5d437dd6f8dc713602ce109f27f297a5b1e5cda6b05f1097edae7a96353e6ae: 1,
    c70cdad150ecd2f33637c313d8a27cd43cf143e6aad68b6bee6d4b1d16c3295f: 1,
    c7d6be26eecbdcf601169d40588d8612b2b43d5a65b653f610e4dfe10d6015fc: 1,
    cce1e038444fff56f8069b3c330387bf3bf1c29b62f9f3753b58194fe0d56d4b: 1,
    cdba3c1c43c8c927d5b7f1da401bfe94f4d6355c1bd677ce90fb14518bd8a435: 1,
    d0ff64e3f1bd9eb5617a1b2fc3181e47a1d20d76fbc65f091d42041c7db3b920: 1,
    d231d6c6874f866e87a85f0e947ad676d511c6e47aba51aa3b2630d8f70f3a51: 1,
    d5dd23333afbd532470049c3e180a0cba469af5e89dd13ac235fc732b4b1e896: 1,
    d648690abb6241cf388bc9a2cb92804c9dc4fabd5b1865e30aee58ba9161667c: 1,
    d67f586c6c6ab3865879e36d480e75a156474863f322647a5ce1f1e58a7b80e4: 1,
    d6c8df291faf99f966810634bc24b7ef4952f6c992b97b7dd87239f62529365f: 1,
    d6d191dc60be9a7177e86577ee7e49935df671b888f57e14aa93806a975d2bc4: 1,
    d7427c3482a5f35982a9182c4f5e1b95d353e09aa4aea4ae7dcf0d9983578363: 1,
    d808980e869272a588e742f03e2249546a38f5ff0ea96855e54d78c6a3fff6a7: 1,
    da673704d3202c0ec49afd2344843e71bee7a1fa3a578d834758882a7e16bc5b: 1,
    da8b391ce9266a7142ba610b894a034a99f4de6e0e824afe594010a3f3765ce6: 1,
    db3d081a88e8c2b25d5c46600b7ef79fdd894f6484e4cc2fb62ddd26a49d75ca: 1,
    dc6cab9fde2925dfbb63e067e6ea24e7b5669e148872353782fbbe1fcafe8008: 1,
    dd1be916e00d070529528e7746906194405279ca2f22974e4ae6dc4a589765cf: 1,
    de5ccbb13ff792411cbc9487706459cd877645b81d6333382e5c27b7b878161d: 1,
    e0c49fb50b1d7cde84c0b7e6cfaf3b457963cdab50fc017158e3859cfa5c3485: 1,
    e3aa47bce25b361a7e98a14f4d1191457915f641e6773ba14f308627d646e396: 1,
    e5a4dba51859b03b827fba36b0441d107cd395e6a1cd8f2bd8e2a31176537b1c: 1,
    e68c9a84fde0015b8cf9b46eeea7264bf90c1ee4d006be4803455774b092f99b: 1,
    ec8e5d018458dc3cb1afd708e58de234d100e695ff03c71cdf03f01acc4629b8: 1,
    f0220c9e13c0f688674c074f08edafe7daf70c5b997074d3320f64a899746aac: 1,
    f0940c2a67cbc8bfbd052181c649f5e43d4e0e2df6530c441653052200c05932: 1,
    f13055751da50cf30643d3c1194d98d9a2ac5ed439593746588a5f5b8fec5f31: 1,
    f1deeb8b1ed44377feecb4ea9e96800f544da7ddbfd9a6901ba7df768c3f6ddd: 1,
    f4bafeb2c718e75cbe36af880d593c55cbccc99d33380b75703fbe6ffc87ba9c: 1,
    f4d981e724c19c54e5e7dca00cf8ed5c9ba2b9a470eb462c994484731ae45142: 1,
    f7ce7acaadab8e79792e64c504ca3c96e63e739260bd2ad81ce36fd31f6d8c2f: 1,
    fb11d9698a289c45a265ed9ed1588d005abfaf683d2039fe4e68315638fdba4c: 1,
    fb70c4e1df243d30677d59919a93955af4f4235bbf8a2068c4d292bf22651f2d: 1,
    fca82ff989d82f85e99d9e82e0a3e1e2c9d9de0bf8222f886b19b2ad6d4a2155: 1,
    fcf9613a4b083d8383ea9b15f9268aed9df1b6b47b18900bf56a62db0916f441: 1,
    ff143dc016bcde8d805a45aa685f2ddf0fe3d38e35e12cfc14eb930d7ca27ab4: 1,
    fff7ff5bd6c2daedc933327a1dd7aab8042f58977465ae14ab2b3bc35469dec5: 1,
  };
  // SHA256([consumer path, exact trimmed command line]) -> original count.
  const recordedCommands = {
    '49de3bd9e4579f34ea6562b8cdbf45b714ef3993a8e824953566bec9292d845f': 2,
    '6fdc18990474a443759b58cdbe1bf47574528b029a46df5215f3ed6eb32fe2df': 1,
    f2b92a391063e3103d755f364fff208a7e0f9c126cc445eed48da3930183206b: 1,
  };
  const digest = (value) => createHash('sha256').update(value).digest('hex');
  const identity = (value) => digest(JSON.stringify(value));
  const counts = new Map();
  const consume = (allowed, key, context) => {
    const count = (counts.get(key) || 0) + 1;
    assert.ok(Object.hasOwn(allowed, key) && count <= allowed[key], context);
    counts.set(key, count);
  };
  const names = new Set(
    retired.map((path) => posix.basename(path).toLowerCase().replace(/\.md$/u, ''))
  );
  const pinnedGit =
    /https:\/\/github\.com\/dunay2\/dvt\/(?:blob|tree)\/[a-f0-9]{40}\/[^\s)\]<>"`]+/gu;
  const hasRetiredName = (text) => {
    const withoutProvenance = text.replace(pinnedGit, '');
    return [...withoutProvenance.toLowerCase().matchAll(/[\w.-]+/gu)].some(([token]) =>
      names.has(token.replace(/\.md$/u, ''))
    );
  };
  const paths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      encoding: 'utf8',
    }
  )
    .split('\0')
    .filter(Boolean);
  for (const path of paths) {
    assert.equal(hasRetiredName(posix.basename(path)), false, `Retired journal relocated: ${path}`);
  }
  for (const path of paths) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs' || !existsSync(path)) continue;
    const bytes = readFileSync(path);
    assert.equal(
      retiredContentHashes.has(digest(bytes)),
      false,
      `Retired content relocated: ${path}`
    );
    if (bytes.includes(0)) continue;
    let text = bytes.toString('utf8');
    if (!hasRetiredName(text)) continue;
    text = text.replace(/```feature-mechanization\s*\r?\n([\s\S]*?)\r?\n```/gu, (fence, raw) => {
      const [record] = extractFeatureMechanizationManifests(fence, path);
      assert.ok(record?.manifest && !record.parseError, `Invalid manifest in ${path}`);
      const manifest = record.manifest;
      let remaining = raw;
      const visit = (value, keys = []) => {
        if (typeof value === 'string' && hasRetiredName(value)) {
          const allowedRole =
            (keys.length === 2 && keys[0] === 'allowedImplementationSurfaces') ||
            (keys.length === 4 && keys[0] === 'redGreenCycles' && keys[2] === 'patchSurfaces');
          assert.ok(allowedRole, `Retired journal used as authority: ${path} ${keys.join('.')}`);
          consume(
            historicalFields,
            identity([path, manifest.featureId, keys, value]),
            `New or moved historical field in ${path} ${keys.join('.')}`
          );
          remaining = remaining.replace(value, '');
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => visit(item, [...keys, String(index)]));
        } else if (value && typeof value === 'object') {
          for (const [key, item] of Object.entries(value)) {
            assert.equal(hasRetiredName(key), false, `Retired name in manifest key: ${path}`);
            visit(item, [...keys, key]);
          }
        }
      };
      visit(manifest);
      // Comments, duplicated scalars, aliases and other text do not inherit field exemptions.
      assert.equal(hasRetiredName(remaining), false, `New raw manifest reference in ${path}`);
      return '';
    });
    text = text
      .split('\n')
      .map((line) => {
        if (!hasRetiredName(line)) return line;
        const key = identity([path, line.trim()]);
        if (Object.hasOwn(recordedCommands, key)) {
          consume(recordedCommands, key, `Duplicated recorded command in ${path}`);
          return '';
        }
        return line;
      })
      .join('\n');
    assert.equal(hasRetiredName(text), false, `Live reference to retired journal in ${path}`);
  }
});
