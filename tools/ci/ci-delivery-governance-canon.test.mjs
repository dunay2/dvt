/**
 * Owned concern: semantic guard for the CI delivery governance canon and its
 * absorbed mandatory proposal state.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { assertFilesExist, assertTextContains, readRepoFile } from './canonization-guard.mjs';

test('CI delivery canon records absorbed workflow gates and local component semantics', () => {
  assertFilesExist([
    'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
    'docs/architecture/components/ci-governance/ci-delivery-governance-user-stories.md',
    'docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md',
  ]);
  const componentDoc = readRepoFile(
    'docs/architecture/components/ci-governance/ci-delivery-governance-component.md'
  );
  const userStoriesDoc = readRepoFile(
    'docs/architecture/components/ci-governance/ci-delivery-governance-user-stories.md'
  );

  for (const requiredSection of [
    '## Public API',
    '## Invariants',
    '## Transitions',
    '## Consumers',
  ]) {
    assert.match(componentDoc, new RegExp(requiredSection.replaceAll(' ', '\\s+')));
  }

  assert.match(componentDoc, /CI-tool contract lane/);
  assert.match(componentDoc, /pnpm test:ci-tools/);
  assert.match(componentDoc, /workflow-pattern-parity\.test\.mjs/);
  assert.match(componentDoc, /```mermaid/);
  assert.match(componentDoc, /ValidateCiDeliveryGovernanceCanon/);

  assert.match(userStoriesDoc, /US-CDG-001/);
  assert.match(userStoriesDoc, /US-CDG-005/);
});

test('mandatory CI delivery proposal declares the current canon instead of stale open work', () => {
  const planPath =
    'docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md';
  const plan = readRepoFile(planPath);

  for (const token of [
    '## 2026-05-23 Canonical Absorption Status',
    'feature-mechanization',
    'allowedImplementationSurfaces',
    'architectureGuards',
    'completionGate',
  ]) {
    assertTextContains(planPath, plan, token);
  }

  assert.match(plan, /CDG-W4-1.*Absorbed/s);
  assert.match(plan, /CI-Delivery-Governance-Canon/);
  assert.match(plan, /ValidateCiDeliveryGovernanceCanon/);
  assert.match(plan, /Repository delivery governance/);
  assert.match(
    plan,
    /docs\/architecture\/components\/ci-governance\/ci-delivery-governance-component\.md/
  );
  assert.match(plan, /tools\/ci\/ci-delivery-governance-canon\.test\.mjs/);
});
