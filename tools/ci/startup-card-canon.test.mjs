/**
 * Owned concern: validate that governance startup routing is owned by a
 * semantic startup-card component instead of scattered orientation prose.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
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

const planningAuthorityFiles = [
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-component.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md',
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md',
];

const planningDomainEntrypoints = [
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/domains/api-and-admission.md',
  'docs/planning/domains/execution-runtime.md',
  'docs/planning/domains/planner-and-contracts.md',
  'docs/planning/domains/event-lifecycle-and-retention.md',
];

const planningRoadmapEntrypoints = ['docs/planning/roadmap/roadmap-by-domain.md'];
const historicalEvidencePathPattern = /^docs\/planning\/(?:archive|closeouts)\//u;

const baseActivePlanningEntrypoints = [
  'CLAUDE.md',
  'README.md',
  'docs/index.md',
  'docs/concepts/index.md',
  'docs/concepts/glossary.md',
  'docs/concepts/system-map.md',
  'docs/guides/ai-work-protocol.md',
  'docs/guides/pr-preflight-and-ci-triage.md',
  'docs/architecture/reference-architecture.md',
  'docs/architecture/system/index.md',
  'docs/architecture/domain-map.md',
  'docs/architecture/atlas/index.md',
  'docs/architecture/atlas/README.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-component.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md',
  'docs/architecture/components/engine/roadmap/engine-phases.md',
  'docs/planning/status/governance-document-rule-inventory.md',
  'docs/planning/status/documentation-information-architecture-current-vs-target-20260407.md',
  'docs/planning/state/index.md',
  'docs/planning/roadmap/index.md',
  'docs/planning/roadmap/roadmap-by-domain.md',
  'docs/planning/roadmap/diagrams/planning-domain-map.md',
  'docs/planning/roadmap/diagrams/execution-runtime-architecture-delta.md',
  'docs/planning/roadmap/diagrams/execution-tracking-flow.md',
  'docs/planning/roadmap/diagrams/gap-execution-dependency-graph.md',
  'docs/planning/roadmap/diagrams/gap-execution-parallel-lanes.md',
  'docs/planning/domains/index.md',
  ...planningDomainEntrypoints,
  'docs/planning/gaps/index.md',
  'docs/planning/proposals/mandatory/frontend-and-ux/index.md',
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md',
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md',
  'docs/planning/proposals/mandatory/runtime-and-contracts/mw-c1-to-tf-c2-runtime-vertical-sequence-analysis-20260409.md',
  'scripts/sync-docs.cjs',
];

const retiredPlanningSurfaces = [
  {
    path: 'docs/planning/state/planning-control-tower.md',
    pathPattern: /planning-control-tower\.md/i,
    namePattern: /Planning Control Tower/i,
  },
  {
    path: 'docs/planning/state/planning-dashboard.md',
    pathPattern: /planning-dashboard\.md/i,
    namePattern: /Planning Dashboard/i,
  },
  {
    path: 'docs/planning/state/domain-status-board.md',
    pathPattern: /domain-status-board\.md/i,
    namePattern: /Domain Status Board/i,
  },
  {
    path: 'docs/planning/state/gap-execution-route.md',
    pathPattern: /gap-execution-route\.md/i,
    namePattern: /Legacy Gap Program Route/i,
  },
  {
    path: 'docs/planning/state/gap-execution-status.md',
    pathPattern: /gap-execution-status\.md/i,
    namePattern: /Legacy Gap Program Status/i,
  },
  {
    path: 'docs/planning/state/inventory-and-coverage.md',
    pathPattern: /inventory-and-coverage\.md/i,
    namePattern: /Planning Inventory And Coverage/i,
  },
  {
    path: 'docs/planning/gaps/runtime-architecture-gap-register-20260331.md',
    pathPattern: /runtime-architecture-gap-register-20260331\.md/i,
    namePattern: /a^/,
  },
];

const explicitRetirementLanguage =
  /\b(?:retired|obsolete|removed|deleted|former|historical|history|replaced|superseded|deprecated|archived)\b/i;
const negatedRetirementLanguage =
  /\b(?:not|never)\s+(?:retired|obsolete|removed|deleted|historical|replaced|superseded|deprecated|archived)\b/i;
const explicitNonAuthorityLanguage =
  /(?:\bno\b[^.]{0,240}\bis\s+(?:an?\s+|the\s+)?(?:task\s+)?authority\b|\b(?:is|are)\s+(?:not\s+(?:an?\s+|the\s+)?(?:task\s+)?authority|not\s+authoritative|no\s+longer\s+authoritative)\b)/i;
const explicitActiveAuthorityLanguage =
  /\b(?:remains?|continues?\s+to\s+be|still\s+(?:is\s+)?)\s+(?:active|current|authoritative|the\s+(?:task\s+)?authority)\b/i;

const forbiddenTaskAuthorityPatterns = [
  /Planning DB owns task lifecycle/i,
  /task lifecycle writes? in\s+Planning DB/i,
  /planning tasks? routed to Planning DB/i,
  /Planning DB \+ generated workboard/i,
  /docs:workboard:generate/i,
  /planning-control-tower\.md/i,
];

function hasExplicitRetirementOrNonAuthorityAssertion(statement) {
  if (
    negatedRetirementLanguage.test(statement) ||
    explicitActiveAuthorityLanguage.test(statement)
  ) {
    return false;
  }
  return explicitRetirementLanguage.test(statement) || explicitNonAuthorityLanguage.test(statement);
}

function markdownBlockKind(line) {
  const trimmed = line.trim();
  if (trimmed === '') return 'blank';
  if (/^(?:```|~~~)/u.test(trimmed)) return 'fence';
  if (/^#{1,6}\s/u.test(trimmed)) return 'heading';
  if (/^(?:[-+*]|\d+[.)])\s+/u.test(trimmed)) return 'list-item';
  if (/^\|/u.test(trimmed)) return 'table-row';
  if (/^>/u.test(trimmed)) return 'quote';
  if (/^(?:-{3,}|\*{3,}|_{3,})$/u.test(trimmed)) return 'thematic-break';
  return 'paragraph';
}

function collectMarkdownBlock(lines, lineIndex) {
  const currentKind = markdownBlockKind(lines[lineIndex]);
  if (!['paragraph', 'list-item'].includes(currentKind)) {
    return lines[lineIndex].trim();
  }

  let start = lineIndex;
  if (currentKind === 'paragraph') {
    while (start > 0) {
      const previousKind = markdownBlockKind(lines[start - 1]);
      if (previousKind === 'paragraph') {
        start -= 1;
        continue;
      }
      if (previousKind === 'list-item') {
        start -= 1;
      }
      break;
    }
  }

  let end = lineIndex;
  while (end + 1 < lines.length && markdownBlockKind(lines[end + 1]) === 'paragraph') {
    end += 1;
  }

  return lines
    .slice(start, end + 1)
    .map((line) => line.trim())
    .join(' ');
}

function activePlanningSectionLines(content) {
  const lines = content.split(/\r?\n/u);
  const sectionStart = lines.findIndex((line) =>
    /^## Active (?:Planning Inputs|Proposal Set)\s*$/u.test(line)
  );
  if (sectionStart === -1) return [];

  const section = [];
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    if (/^##\s+/u.test(lines[index])) break;
    section.push(lines[index]);
  }
  return section;
}

function currentRoadmapSourceLines(content) {
  const lines = content.split(/\r?\n/u);
  const currentSources = [];
  let collecting = false;

  for (const line of lines) {
    if (/\bCurrent sources:\s*/u.test(line)) {
      collecting = true;
    }
    if (collecting && /\bNear-term target:\s*/u.test(line)) {
      collecting = false;
      continue;
    }
    if (collecting) currentSources.push(line);
  }

  return currentSources;
}

function collectLocalMarkdownLinks(
  entrypointPath,
  lines,
  documents,
  { mandatoryPlansOnly = false } = {}
) {
  const markdownLinkPattern = /\[[^\]]+\]\(([^)#]+\.md)(?:#[^)]*)?\)/gu;

  for (const line of lines) {
    markdownLinkPattern.lastIndex = 0;
    for (const match of line.matchAll(markdownLinkPattern)) {
      const target = match[1];
      if (/^[a-z]+:/iu.test(target)) continue;
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(entrypointPath), target)
      );
      if (!resolved.startsWith('docs/')) continue;
      if (mandatoryPlansOnly && !resolved.startsWith('docs/planning/proposals/mandatory/')) {
        continue;
      }

      readRepoFile(resolved);
      documents.add(resolved);
    }
  }
}

function collectLinkedActivePlanningPlans(domainPaths) {
  const plans = new Set();
  for (const domainPath of domainPaths) {
    collectLocalMarkdownLinks(
      domainPath,
      activePlanningSectionLines(readRepoFile(domainPath)),
      plans,
      { mandatoryPlansOnly: true }
    );
  }
  return [...plans].sort((left, right) => left.localeCompare(right));
}

function collectLinkedCurrentRoadmapDocuments(roadmapPaths) {
  const documents = new Set();
  for (const roadmapPath of roadmapPaths) {
    collectLocalMarkdownLinks(
      roadmapPath,
      currentRoadmapSourceLines(readRepoFile(roadmapPath)),
      documents
    );
  }
  return [...documents].sort((left, right) => left.localeCompare(right));
}

const linkedActivePlanningPlans = collectLinkedActivePlanningPlans(planningDomainEntrypoints);
const linkedCurrentRoadmapDocuments = collectLinkedCurrentRoadmapDocuments(
  planningRoadmapEntrypoints
);
const linkedCurrentRoadmapRoutingDocuments = linkedCurrentRoadmapDocuments.filter(
  (pathname) => !historicalEvidencePathPattern.test(pathname)
);
const activePlanningEntrypoints = [
  ...new Set([
    ...baseActivePlanningEntrypoints,
    ...linkedActivePlanningPlans,
    ...linkedCurrentRoadmapRoutingDocuments,
  ]),
];

function assertNoActiveRetiredReference(pathname, statement, retired) {
  if (retired.pathPattern.test(statement)) {
    assert.fail(`${pathname} must not link retired path ${retired.path}: ${statement.trim()}`);
  }

  const referencesRetiredName = retired.namePattern.test(statement);
  if (!referencesRetiredName || hasExplicitRetirementOrNonAuthorityAssertion(statement)) return;

  assert.fail(`${pathname} must not present retired surface ${retired.path}: ${statement.trim()}`);
}

test('governance startup card canonization preserves routing semantics and baseline rails', () => {
  assertFilesExist(requiredFiles);
  assertCanonPlan(
    'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md'
  );

  for (const pathname of requiredFiles) {
    for (const rail of requiredRails) {
      assertContains(pathname, rail);
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

test('planning startup artifacts preserve GitHub task authority', () => {
  for (const pathname of planningAuthorityFiles) {
    const content = readRepoFile(pathname);
    assert.match(content, /GitHub Issues/i, `${pathname} must name GitHub Issues task authority`);
    assert.match(
      content,
      /Planning DB/i,
      `${pathname} must preserve Planning DB architecture scope`
    );
    for (const forbidden of forbiddenTaskAuthorityPatterns) {
      assert.doesNotMatch(
        content,
        forbidden,
        `${pathname} must not restore retired task authority`
      );
    }
  }

  assert.match(
    readRepoFile(
      'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md'
    ),
    /issue\/PR evidence \+ `pnpm verify:prepush`/,
    'planning route must preserve the GitHub issue/PR closeout baseline'
  );
});

test('active domain and roadmap routing expand the retired-surface guard', () => {
  assert.ok(
    linkedActivePlanningPlans.includes(
      'docs/planning/proposals/mandatory/runtime-and-contracts/tf-c3-production-plugin-host-composition-plan-20260414.md'
    ),
    'execution-runtime must expose TF-C3 to retired-surface validation'
  );
  assert.ok(
    linkedActivePlanningPlans.includes(
      'docs/planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-plan-20260402.md'
    ),
    'documentation governance active proposal routing must be scanned regardless of destination status'
  );
  assert.ok(
    linkedCurrentRoadmapDocuments.includes(
      'docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md'
    ),
    'roadmap current sources must resolve mandatory plans'
  );
  assert.ok(
    linkedCurrentRoadmapRoutingDocuments.includes(
      'docs/planning/reviews/architecture-and-governance/20260417-dvt-artifacts-review.md'
    ),
    'roadmap current reviews must be exposed to retired-surface validation'
  );
  assert.ok(
    linkedCurrentRoadmapDocuments.includes(
      'docs/planning/closeouts/20260414-tf-c3-production-plugin-host-composition-closeout.md'
    ),
    'roadmap historical closeout evidence must still resolve as a current source'
  );
  assert.ok(
    !linkedCurrentRoadmapRoutingDocuments.includes(
      'docs/planning/closeouts/20260414-tf-c3-production-plugin-host-composition-closeout.md'
    ),
    'historical closeout evidence must not be rewritten as current routing authority'
  );
  assert.ok(
    !linkedCurrentRoadmapDocuments.includes(
      'docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md'
    ),
    'closed internal-alpha evidence must not return to roadmap current sources'
  );
});

test('retirement wording never permits links, negated retirement, or Markdown block leakage', () => {
  const retiredDashboard = retiredPlanningSurfaces.find(
    ({ path: retiredPath }) => retiredPath === 'docs/planning/state/planning-dashboard.md'
  );
  assert.ok(retiredDashboard);

  assert.throws(
    () =>
      assertNoActiveRetiredReference(
        'fixture.md',
        '[retired Planning Dashboard](../state/planning-dashboard.md)',
        retiredDashboard
      ),
    /must not link retired path/
  );
  assert.doesNotThrow(() =>
    assertNoActiveRetiredReference(
      'fixture.md',
      'The Planning Dashboard is retired and no longer authoritative.',
      retiredDashboard
    )
  );
  assert.doesNotThrow(() =>
    assertNoActiveRetiredReference(
      'fixture.md',
      collectMarkdownBlock(
        [
          'No Planning Dashboard, local workboard, lane file, closeout file, or generated',
          'planning view is a task authority.',
        ],
        0
      ),
      retiredDashboard
    )
  );
  assert.doesNotThrow(() =>
    assertNoActiveRetiredReference(
      'fixture.md',
      collectMarkdownBlock(
        ['No retired planning view, including the', 'Planning Dashboard, is a task authority.'],
        1
      ),
      retiredDashboard
    )
  );
  assert.throws(
    () =>
      assertNoActiveRetiredReference(
        'fixture.md',
        collectMarkdownBlock(['- Planning Dashboard', '- Historical notes were archived.'], 0),
        retiredDashboard
      ),
    /must not present retired surface/
  );
  assert.throws(
    () =>
      assertNoActiveRetiredReference(
        'fixture.md',
        'The Planning Dashboard is not retired and remains the task authority.',
        retiredDashboard
      ),
    /must not present retired surface/
  );

  const retiredRuntimeGap = retiredPlanningSurfaces.find(
    ({ path: retiredPath }) =>
      retiredPath === 'docs/planning/gaps/runtime-architecture-gap-register-20260331.md'
  );
  assert.ok(retiredRuntimeGap);
  assert.throws(
    () =>
      assertNoActiveRetiredReference(
        'docs/planning/gaps/index.md',
        '[stale register](./runtime-architecture-gap-register-20260331.md)',
        retiredRuntimeGap
      ),
    /must not link retired path/
  );
});

test('active planning entrypoints do not route through retired planning surfaces', () => {
  for (const retired of retiredPlanningSurfaces) {
    assert.throws(() => readRepoFile(retired.path), /ENOENT/, `${retired.path} must stay deleted`);
  }

  for (const pathname of activePlanningEntrypoints) {
    const lines = readRepoFile(pathname).split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      for (const retired of retiredPlanningSurfaces) {
        const statement = retired.namePattern.test(line)
          ? collectMarkdownBlock(lines, lineIndex)
          : line;
        assertNoActiveRetiredReference(pathname, statement, retired);
      }
    }
  }
});
