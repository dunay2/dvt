/**
 * Owned concern: validate that governance startup routing is owned by a
 * semantic startup-card component instead of scattered orientation prose.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-component.md',
  'docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md',
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md',
  'buzon/20260524-codex-fowler-governance-startup-card-canon.md',
];

const requiredRails = [
  'ClassifyGovernanceStartupRoute',
  'QueryGovernanceStartupRoute',
  'ValidateGovernanceStartupBaseline',
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

test('governance startup card canonization preserves routing semantics and baseline rails', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

  for (const path of requiredFiles) {
    for (const rail of requiredRails) {
      assertContains(path, rail);
    }
  }

  const inventory = readRepoFile('docs/planning/status/governance-document-rule-inventory.md');
  for (const route of ['code', 'docs', 'planning', 'contracts', 'ci', 'cross-cutting']) {
    assert.match(inventory, new RegExp(`\\| \`${escapeRegExp(route)}\``));
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

  const analysis = readRepoFile('buzon/20260524-codex-fowler-governance-startup-card-canon.md');
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
