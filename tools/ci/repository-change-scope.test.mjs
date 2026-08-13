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

test('classifies feature-mechanized CI composite actions without workspace fan-out', () => {
  const fetchScopeBase = classifyRepositoryFileScope('.github/actions/fetch-scope-base/action.yml');
  const preparePlanningDb = classifyRepositoryFileScope(
    '.github/actions/prepare-planning-db/action.yml'
  );
  const sharedSetup = classifyRepositoryFileScope('.github/actions/setup-node-pnpm/action.yml');

  for (const fileScope of [fetchScopeBase, preparePlanningDb, sharedSetup]) {
    assert.equal(fileScope.workflowPolicyInput, true);
    assert.equal(fileScope.changedFileValidationRelevant, true);
    assert.equal(fileScope.codeValidationRelevant, false);
    assert.equal(fileScope.runtimeWorkspaceFanout, false);
    assert.equal(fileScope.governanceGlobalRelevant, false);
  }

  assert.equal(fetchScopeBase.featureMechanizationRelevant, true);
  assert.equal(preparePlanningDb.featureMechanizationRelevant, true);
  assert.equal(sharedSetup.featureMechanizationRelevant, false);
});

test('classifies repository command files through the command catalog', () => {
  const planning = classifyRepositoryFileScope('scripts/planning-db-query.cjs');
  const runtimeCapability = classifyRepositoryFileScope('scripts/db-migrate.cjs');
  const ciTooling = classifyRepositoryFileScope('tools/ci/emit-scope.mjs');
  const ciToolingTest = classifyRepositoryFileScope('tools/ci/sync-docs-status-policy.test.mjs');
  const knownCiConfigurations = [
    'tools/ci/jsconfig.json',
    'tools/ci/policy/adapter-postgres-relevance.json',
    'tools/ci/policy/workflow-scope.json',
  ].map((filePath) => classifyRepositoryFileScope(filePath));
  const unknownCiConfiguration = classifyRepositoryFileScope('tools/ci/policy/unknown-policy.json');
  const docsTooling = classifyRepositoryFileScope('tools/docs/check-filenames.ts');
  const unknownExecutable = classifyRepositoryFileScope('scripts/unclassified-runtime.cjs');

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
  assert.equal(ciTooling.runtimeWorkspaceFanout, false);

  assert.equal(ciToolingTest.commandClass.domain, 'test-tooling');
  assert.equal(ciToolingTest.runtimeWorkspaceFanout, false);

  for (const knownCiConfiguration of knownCiConfigurations) {
    assert.equal(knownCiConfiguration.repositoryCommandFile, false);
    assert.equal(knownCiConfiguration.uncataloguedCiConfigurationInput, false);
    assert.equal(knownCiConfiguration.runtimeWorkspaceFanout, false);
  }

  assert.equal(unknownCiConfiguration.repositoryCommandFile, false);
  assert.equal(unknownCiConfiguration.uncataloguedCiConfigurationInput, true);
  assert.equal(unknownCiConfiguration.runtimeWorkspaceFanout, true);

  assert.equal(unknownExecutable.commandClass.domain, 'unknown');
  assert.equal(unknownExecutable.runtimeWorkspaceFanout, true);

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

test('routes feature-mechanized action-only changes through DB-backed mechanization checks', () => {
  const scope = classifyRepositoryChangedScope(['.github/actions/prepare-planning-db/action.yml']);

  assert.deepEqual(scope, {
    hasChangedFiles: true,
    needsPlanningDbInventory: false,
    needsGovernanceGlobal: false,
    needsFeatureMechanization: true,
    needsTraceabilityAdr0: false,
    needsCodeValidation: false,
    runtimeWorkspaceFanout: false,
    changedFileValidationRelevant: true,
  });
});
