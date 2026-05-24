/**
 * Owned concern: validate that documentation usability improvements are
 * governed by a canonical consultation component instead of scattered navigation prose.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const requiredFiles = [
  'docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-canon-plan-20260524.md',
  'docs/architecture/components/ci-governance/documentation-usability-canon-component.md',
  'docs/architecture/components/ci-governance/documentation-usability-canon-user-stories.md',
  'docs/planning/domains/documentation-governance.md',
  'docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-change-plan-20260308.md',
  'buzon/20260524-codex-fowler-documentation-usability-canon.md',
];

const requiredRails = [
  'ClassifyDocumentationEntryPoint',
  'QueryDocumentationConsultationPath',
  'ValidateDocumentationUsefulness',
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

test('documentation usability canonization preserves consultation semantics and usefulness rails', () => {
  for (const path of requiredFiles) {
    assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
  }

  for (const path of requiredFiles) {
    for (const rail of requiredRails) {
      assertContains(path, rail);
    }
  }

  assertContains(
    'docs/planning/domains/documentation-governance.md',
    'Documentation Usability Canon Plan 2026-05-24'
  );
  assertContains('docs/planning/domains/documentation-governance.md', 'GD-MAND-DOC-USABILITY');

  const componentGuide = readRepoFile(
    'docs/architecture/components/ci-governance/documentation-usability-canon-component.md'
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
    'docs/architecture/components/ci-governance/documentation-usability-canon-user-stories.md'
  );
  for (const persona of [
    'New contributor',
    'Documentation maintainer',
    'Architecture reviewer',
    'Governance operator',
  ]) {
    assert.match(userStories, new RegExp(escapeRegExp(persona)));
  }

  const analysis = readRepoFile('buzon/20260524-codex-fowler-documentation-usability-canon.md');
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
