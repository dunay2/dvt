import assert from 'node:assert/strict';
import test from 'node:test';

import { computeWorkflowModeScopeOutputs, parseScopeMode } from './scope-config.mjs';

const scriptsOnlyContext = {
  packageJsonChange: {
    packageScriptsOnly: true,
    rootBuildSensitive: false,
    dependencySensitive: false,
    lifecycleSensitive: false,
    ciToolingSensitive: false,
    governanceToolingOnly: true,
    temporalCapabilitySensitive: false,
    postgresCapabilitySensitive: false,
    contractCapabilitySensitive: false,
  },
};

test('emit-scope workflow mode keeps changed-file validation for scripts-only package json', () => {
  const scope = computeWorkflowModeScopeOutputs('workflow', ['package.json'], scriptsOnlyContext);

  assert.equal(scope.changed_file_validation_relevant, true);
  assert.equal(scope.any_code, false);
});

test('emit-scope workflow mode preserves non-package matches mixed with scripts-only package json', () => {
  const scope = computeWorkflowModeScopeOutputs(
    'workflow',
    ['package.json', 'apps/api/src/server.ts'],
    scriptsOnlyContext
  );

  assert.equal(scope.changed_file_validation_relevant, true);
  assert.equal(scope.any_code, true);
});

test('emit-scope contracts mode keeps scripts-only package json out of contract lanes', () => {
  const scope = computeWorkflowModeScopeOutputs('contracts', ['package.json'], scriptsOnlyContext);

  assert.equal(scope.contracts_relevant, false);
  assert.equal(scope.determinism_relevant, false);
  assert.equal(scope.golden_relevant, false);
});

test('emit-scope test mode preserves workspace setup flags mixed with scripts-only package json', () => {
  const scope = computeWorkflowModeScopeOutputs(
    'test',
    ['package.json', 'packages/@dvt/engine/src/index.ts'],
    scriptsOnlyContext
  );

  assert.equal(scope.any_test, true);
  assert.equal(scope.engine, true);
});

test('emit-scope pr-quality mode preserves adapter flags mixed with scripts-only package json', () => {
  const scope = computeWorkflowModeScopeOutputs(
    'pr-quality',
    ['package.json', 'packages/@dvt/adapter-postgres/src/index.ts'],
    scriptsOnlyContext
  );

  assert.equal(scope.adapter_postgres_changed, true);
});

test('parseScopeMode accepts known modes and rejects missing or unknown mode', () => {
  assert.equal(parseScopeMode(['--mode', 'workflow']), 'workflow');
  assert.throws(() => parseScopeMode([]), /MODE_REQUIRED/);
  assert.throws(() => parseScopeMode(['--mode', 'unknown']), /UNSUPPORTED_MODE/);
});
