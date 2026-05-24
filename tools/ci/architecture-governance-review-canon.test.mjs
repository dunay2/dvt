/**
 * Owned concern: validate that the active architecture/governance review is
 * canonized into dispositioned product, architecture, risk, and planning work
 * instead of remaining an advisory review outside the governed task rails.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md',
  'docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md',
  'docs/architecture/components/ci-governance/architecture-governance-review-canon-component.md',
  'docs/architecture/components/ci-governance/architecture-governance-review-canon-user-stories.md',
  'docs/architecture/components/ci-governance/index.md',
  'buzon/20260524-codex-fowler-architecture-governance-review-canon.md',
];

const dispositionRows = [
  'RunStatus state machine validation',
  'Admin route RBAC',
  'TenantId branded type',
  'StepKind JSON Schema validation',
  'IRunEnrichmentService extraction',
  'Distributed consistency model',
  'Temporal saturation backpressure',
  'State-store circuit breaker',
  'Incremental snapshot projection',
  'Cost attribution model',
  'Tenant-configurable retention',
  'Zero-downtime schema rollback',
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

test('architecture governance review canonization has semantic disposition coverage', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

  const plan = readRepoFile(
    'docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md'
  );
  for (const rail of [
    'ClassifyArchitectureGovernanceReviewFinding',
    'RecordArchitectureGovernanceReviewDisposition',
    'ValidateArchitectureGovernanceReviewTraceability',
  ]) {
    assert.match(plan, new RegExp(escapeRegExp(rail)), `plan must define rail ${rail}`);
  }
  for (const row of dispositionRows) {
    assert.match(plan, new RegExp(escapeRegExp(row)), `plan must disposition ${row}`);
  }
  assert.match(plan, /status: (Closed|Open|Queued|Risk-accepted|Follow-up)/);

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/architecture-governance-review-canon-component.md'
  );
  for (const requiredHeading of [
    '## Public API',
    '## Invariants',
    '## Transitions',
    '## Consumers',
    '## Command And Query Rail',
    '## Semantic Fitness Function',
    '## Diagrams',
  ]) {
    assert.match(componentGuide, new RegExp(escapeRegExp(requiredHeading)));
  }
  assert.match(componentGuide, /ArchitectureGovernanceReviewCanon/);
  assert.match(componentGuide, /GD-REV-ARCH-GOV-CANON/);

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/architecture-governance-review-canon-user-stories.md'
  );
  for (const scenario of [
    'Architecture steward maps a blocker to an existing task',
    'Product planner distinguishes product value from platform hygiene',
    'Reviewer verifies drift is intentional',
    'Agent continues from the planning DB',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(scenario)));
  }

  const analysis = readRepoFile(
    'buzon/20260524-codex-fowler-architecture-governance-review-canon.md'
  );
  for (const section of [
    '## Fowler Analysis',
    '## Mature-System Comparison',
    '## Improved Patterns',
    '## Antipatterns',
    '## Component Grouping',
    '## Future Lessons',
    '## Repetition And Drift',
    '## Applied Pattern',
    '## Opportunities',
  ]) {
    assert.match(analysis, new RegExp(escapeRegExp(section)));
  }

  assertContains(
    'docs/planning/domains/documentation-governance.md',
    'Architecture Governance Review Canon Plan 2026-05-24'
  );
  assertContains(
    'docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md',
    '2026-05-24 Canonical disposition'
  );
  assertContains(
    'docs/architecture/components/ci-governance/index.md',
    'Architecture Governance Review Canon Component'
  );
});
