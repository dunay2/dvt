import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKSPACE_ENTRIES,
  classifyPackageJsonChange,
  computeWorkspaceMatrix,
} from './scope-config.mjs';

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
