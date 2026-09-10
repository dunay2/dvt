/**
 * Owned concern: validate that governance startup routing is owned by a
 * semantic startup-card component instead of scattered orientation prose.
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
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-component.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md',
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md',
];

const requiredRails = [
  'ClassifyGovernanceStartupRoute',
  'QueryGovernanceStartupRoute',
  'ValidateGovernanceStartupBaseline',
];

const requiredRouteBaselines = [
  {
    route: 'code',
    baseline: 'touched-package validation + `pnpm verify:prepush`',
  },
  {
    route: 'docs',
    baseline: '`pnpm docs:sync` when structure changes + `pnpm verify:prepush`',
  },
  {
    route: 'planning',
    baseline: 'issue/PR evidence + `pnpm verify:prepush`',
  },
  {
    route: 'contracts',
    baseline: 'contract/package validation + `pnpm verify:prepush`',
  },
  {
    route: 'ci',
    baseline: 'relevant CI/tool validation + `pnpm verify:prepush`',
  },
  {
    route: 'cross-cutting',
    baseline: 'per-slice validation + `pnpm verify:prepush`',
  },
];

const activePlanningEntrypoints = [
  'CLAUDE.md',
  'README.md',
  'docs/index.md',
  'docs/concepts/index.md',
  'docs/concepts/glossary.md',
  'docs/concepts/system-map.md',
  'docs/guides/ai-work-protocol.md',
  'docs/architecture/reference-architecture.md',
  'docs/architecture/system/index.md',
  'docs/architecture/domain-map.md',
  'docs/architecture/atlas/index.md',
  'docs/architecture/atlas/README.md',
  'docs/architecture/components/engine/roadmap/engine-phases.md',
  'docs/planning/status/governance-document-rule-inventory.md',
  'docs/planning/status/documentation-information-architecture-current-vs-target-20260407.md',
  'docs/planning/state/index.md',
  'docs/planning/state/gap-execution-route.md',
  'docs/planning/state/gap-execution-status.md',
  'docs/planning/state/inventory-and-coverage.md',
  'docs/planning/roadmap/index.md',
  'docs/planning/roadmap/roadmap-by-domain.md',
  'docs/planning/roadmap/diagrams/planning-domain-map.md',
  'docs/planning/roadmap/diagrams/execution-runtime-architecture-delta.md',
  'docs/planning/domains/index.md',
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/gaps/index.md',
  'docs/planning/gaps/runtime-architecture-gap-register-20260331.md',
  'docs/planning/proposals/mandatory/frontend-and-ux/index.md',
  'scripts/sync-docs.cjs',
];

const retiredPlanningSurfaces = [
  {
    path: 'docs/planning/state/planning-control-tower.md',
    linkPattern: /planning-control-tower\.md/i,
    namePattern: /Planning Control Tower/i,
  },
  {
    path: 'docs/planning/state/planning-dashboard.md',
    linkPattern: /planning-dashboard\.md/i,
    namePattern: /Planning Dashboard/i,
  },
  {
    path: 'docs/planning/state/domain-status-board.md',
    linkPattern: /domain-status-board\.md/i,
    namePattern: /Domain Status Board/i,
  },
];

test('governance startup card canonization preserves routing semantics and baseline rails', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md'
  );

  for (const path of requiredFiles) {
    for (const rail of requiredRails) {
      assertContains(path, rail);
    }
  }

  const inventory = readRepoFile('docs/planning/status/governance-document-rule-inventory.md');
  const startupCardRows = inventory.split(/\r?\n/);
  for (const { route, baseline } of requiredRouteBaselines) {
    const routeRow = startupCardRows.find((line) => line.startsWith(`| \`${route}\``));
    assert.ok(routeRow, `startup card must define the ${route} route`);
    assert.match(
      routeRow,
      new RegExp(escapeRegExp(baseline)),
      `${route} route must preserve baseline ${baseline}`
    );
  }

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/governance-startup-card-canon-component.md'
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

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md'
  );
  for (const persona of [
    'Bounded-task contributor',
    'Cross-cutting implementer',
    'Planning operator',
    'PR reviewer',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }
});

test('active planning entrypoints do not reintroduce retired planning surfaces', () => {
  for (const retired of retiredPlanningSurfaces) {
    assert.throws(
      () => readRepoFile(retired.path),
      /ENOENT/,
      `${retired.path} must stay deleted`
    );
  }

  for (const path of activePlanningEntrypoints) {
    const content = readRepoFile(path);
    for (const retired of retiredPlanningSurfaces) {
      assert.doesNotMatch(
        content,
        retired.linkPattern,
        `${path} must not link ${retired.path}`
      );
      assert.doesNotMatch(
        content,
        retired.namePattern,
        `${path} must not present ${retired.path} as an active surface`
      );
    }
  }
});
