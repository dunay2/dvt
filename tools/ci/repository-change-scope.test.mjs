import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyRepositoryChangedScope,
  classifyRepositoryFileScope,
} from './repository-change-scope.mjs';

test('classifies root CI policy config as code validation without workspace fan-out', () => {
  const fileScope = classifyRepositoryFileScope('.dependency-cruiser.cjs');

  assert.equal(fileScope.rootCiPolicyInput, true);
  assert.equal(fileScope.codeValidationRelevant, true);
  assert.equal(fileScope.runtimeWorkspaceFanout, false);
  assert.equal(fileScope.governanceGlobalRelevant, false);
});

test('classifies repository command files through the command catalog', () => {
  const planning = classifyRepositoryFileScope('scripts/planning-db-query.cjs');
  const runtimeCapability = classifyRepositoryFileScope('scripts/db-migrate.cjs');
  const ciTooling = classifyRepositoryFileScope('tools/ci/emit-scope.mjs');
  const docsTooling = classifyRepositoryFileScope('tools/docs/check-filenames.ts');

  assert.equal(planning.commandClass.domain, 'planning-db');
  assert.equal(planning.planningDbInventoryRelevant, true);
  assert.equal(planning.governanceGlobalRelevant, true);
  assert.equal(planning.codeValidationRelevant, true);

  assert.equal(runtimeCapability.commandClass.domain, 'runtime-capability');
  assert.equal(runtimeCapability.codeValidationRelevant, true);
  assert.equal(runtimeCapability.runtimeWorkspaceFanout, true);

  assert.equal(ciTooling.commandClass.domain, 'ci-tooling');
  assert.equal(ciTooling.codeValidationRelevant, true);
  assert.equal(ciTooling.governanceGlobalRelevant, false);

  assert.equal(docsTooling.commandClass.domain, 'docs-governance');
  assert.equal(docsTooling.governanceGlobalRelevant, true);
  assert.equal(docsTooling.codeValidationRelevant, false);
});

test('classifies runtime, docs, and traceability surfaces for prepush consumers', () => {
  const webSource = classifyRepositoryFileScope('apps/web/src/main.tsx');
  const adr = classifyRepositoryFileScope(
    'docs/adr/ADR-0056-web-ui-authority-is-server-projected.md'
  );
  const engineSource = classifyRepositoryFileScope('packages/@dvt/engine/src/WorkflowEngine.ts');

  assert.equal(webSource.featureMechanizationRelevant, true);
  assert.equal(webSource.codeValidationRelevant, true);
  assert.equal(webSource.traceabilityRelevant, false);

  assert.equal(adr.governanceGlobalRelevant, true);
  assert.equal(adr.traceabilityRelevant, true);
  assert.equal(adr.codeValidationRelevant, false);

  assert.equal(engineSource.featureMechanizationRelevant, true);
  assert.equal(engineSource.codeValidationRelevant, true);
  assert.equal(engineSource.traceabilityRelevant, true);
});

test('aggregates changed-file scope booleans for local and remote consumers', () => {
  const scope = classifyRepositoryChangedScope([
    '.dependency-cruiser.cjs',
    'scripts/planning-db-query.cjs',
    'docs/adr/ADR-0056-web-ui-authority-is-server-projected.md',
  ]);

  assert.deepEqual(scope, {
    hasChangedFiles: true,
    needsPlanningDbInventory: true,
    needsGovernanceGlobal: true,
    needsFeatureMechanization: true,
    needsTraceabilityAdr0: true,
    needsCodeValidation: true,
    runtimeWorkspaceFanout: false,
    changedFileValidationRelevant: true,
  });
});
