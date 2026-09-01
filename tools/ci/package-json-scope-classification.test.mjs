import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKSPACE_ENTRIES,
  classifyPackageJsonChange,
  computeTestPackageMatrix,
  computeWorkflowModeScopeOutputs,
  computeWorkspaceMatrix,
} from './scope-config.mjs';

function classifyLintStagedMetadataChange() {
  return classifyPackageJsonChange(
    {
      scripts: {},
      'lint-staged': {
        'apps/**/*.{ts,tsx}': ['eslint --fix'],
      },
    },
    {
      scripts: {},
      'lint-staged': {
        'apps/**/*.{ts,tsx}': ['eslint --fix --config tools/ci/eslint-precommit.config.cjs'],
      },
    }
  );
}

test('lint-staged metadata stays in CI validation without runtime fan-out', () => {
  const classification = classifyLintStagedMetadataChange();

  assert.equal(classification.nonScriptChange, true);
  assert.equal(classification.developerWorkflowMetadataOnly, true);
  assert.equal(classification.dependencySensitive, false);
  assert.equal(classification.rootBuildSensitive, false);
  assert.equal(classification.ciToolingSensitive, true);

  const context = { packageJsonChange: classification };
  assert.deepEqual(computeWorkspaceMatrix(['package.json'], context).include, []);
  assert.deepEqual(computeTestPackageMatrix(['package.json'], context).include, []);

  const testScope = computeWorkflowModeScopeOutputs('test', ['package.json'], context);
  assert.equal(testScope.root_build_sensitive, false);

  const workflowScope = computeWorkflowModeScopeOutputs('workflow', ['package.json'], context);
  assert.equal(workflowScope.changed_file_validation_relevant, true);
  assert.equal(workflowScope.ci_tool_executable_contracts_relevant, true);
});

test('package json governance db alias stays out of runtime workspace scope', () => {
  const previousPackage = { scripts: {} };
  const nextPackage = {
    scripts: {
      'governance:db:query': 'node scripts/planning-db-query.cjs',
    },
  };

  const classification = classifyPackageJsonChange(previousPackage, nextPackage);

  assert.equal(classification.packageScriptsOnly, true);
  assert.equal(classification.governanceToolingOnly, true);
  assert.equal(classification.rootBuildSensitive, false);
  assert.equal(classification.temporalCapabilitySensitive, false);
  assert.equal(classification.postgresCapabilitySensitive, false);
  assert.equal(classification.contractCapabilitySensitive, false);

  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: classification,
  });
  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
});

test('package json runtime script change keeps root-build fan-out', () => {
  const previousPackage = { scripts: { build: 'turbo run build' } };
  const nextPackage = { scripts: { build: 'turbo run build --force' } };

  const classification = classifyPackageJsonChange(previousPackage, nextPackage);

  assert.equal(classification.rootBuildSensitive, true);
  assert.equal(classification.packageScriptsOnly, true);

  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: classification,
  });
  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});

test('package json non-script metadata changes remain root-build sensitive', () => {
  const previousPackage = { version: '5.21.0', scripts: {} };
  const nextPackage = { version: '5.22.0', scripts: {} };

  const classification = classifyPackageJsonChange(previousPackage, nextPackage);

  assert.equal(classification.nonScriptChange, true);
  assert.equal(classification.rootBuildSensitive, true);
});

test('package json without semantic context still fails closed for workspace matrix', () => {
  const matrix = computeWorkspaceMatrix(['package.json']);

  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});

test('package json read failure class fails closed for workspace matrix', () => {
  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: {
      failClosed: true,
      rootBuildSensitive: true,
      dependencySensitive: true,
      lifecycleSensitive: true,
      ciToolingSensitive: true,
    },
  });

  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});
