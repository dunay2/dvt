/**
 * Owned concern: validate that the architecture documentation reconciliation
 * proposal is canonized into governed documentation work instead of remaining
 * an orphan mandatory proposal.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-canon-plan-20260523.md',
  'docs/architecture/components/ci-governance/architecture-doc-reconciliation-canon-component.md',
  'docs/architecture/components/ci-governance/architecture-doc-reconciliation-canon-user-stories.md',
  'docs/architecture/components/ci-governance/index.md',
  'buzon/20260523-codex-fowler-architecture-doc-reconciliation-canon.md',
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

test('architecture documentation reconciliation canonization has semantic ownership', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

  assertContains(
    'docs/planning/domains/documentation-governance.md',
    'Architecture Documentation Reconciliation Canon Plan 2026-05-23'
  );
  assertContains('docs/planning/domains/documentation-governance.md', 'GD-MAND-ARCH-DOC-RECON');
  assertContains(
    'docs/planning/domains/documentation-governance.md',
    'No architecture documentation reconciliation proposal remains an orphan execution queue'
  );

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/architecture-doc-reconciliation-canon-component.md'
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
  assert.match(componentGuide, /RecordArchitectureDocumentationReconciliationCanon/);
  assert.match(componentGuide, /ClassifyArchitectureDocumentationDisposition/);

  const userStories = readRepoFile(
    'docs/architecture/components/ci-governance/architecture-doc-reconciliation-canon-user-stories.md'
  );
  for (const persona of [
    'Architecture reader',
    'Documentation maintainer',
    'Planning steward',
    'Architecture reviewer',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }

  const analysis = readRepoFile(
    'buzon/20260523-codex-fowler-architecture-doc-reconciliation-canon.md'
  );
  for (const section of [
    '## Fowler Analysis',
    '## Mature-System Comparison',
    '## Antipatterns',
    '## Drift',
    '## Applied Pattern',
  ]) {
    assert.match(analysis, new RegExp(escapeRegExp(section)));
  }

  assertContains(
    'docs/architecture/components/ci-governance/index.md',
    'Architecture Documentation Reconciliation Canon Component'
  );
});
