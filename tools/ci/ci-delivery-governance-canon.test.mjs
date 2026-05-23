/**
 * Owned concern: semantic guard for the CI delivery governance canon and its
 * absorbed mandatory proposal state.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('CI delivery canon records absorbed workflow gates and local component semantics', () => {
  const componentDoc = readFileSync(
    'docs/architecture/components/ci-governance/ci-delivery-governance-component.md',
    'utf8'
  );
  const userStoriesDoc = readFileSync(
    'docs/architecture/components/ci-governance/ci-delivery-governance-user-stories.md',
    'utf8'
  );
  const analysisDoc = readFileSync(
    'buzon/20260523-codex-fowler-ci-delivery-governance-canon.md',
    'utf8'
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
  assert.match(analysisDoc, /Fowler/);
  assert.match(analysisDoc, /Mature-system comparison/);
  assert.match(analysisDoc, /Anti-patterns/);
});

test('mandatory CI delivery proposal declares the current canon instead of stale open work', () => {
  const plan = readFileSync(
    'docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md',
    'utf8'
  );

  assert.match(plan, /2026-05-23 Canonical Absorption Status/);
  assert.match(plan, /CDG-W4-1.*Absorbed/s);
  assert.match(plan, /CI-Delivery-Governance-Canon/);
  assert.match(plan, /ValidateCiDeliveryGovernanceCanon/);
  assert.match(plan, /Repository delivery governance/);
  assert.match(plan, /allowedImplementationSurfaces/);
  assert.match(
    plan,
    /docs\/architecture\/components\/ci-governance\/ci-delivery-governance-component\.md/
  );
  assert.match(plan, /tools\/ci\/ci-delivery-governance-canon\.test\.mjs/);
});
