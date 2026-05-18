/**
 * @ownedConcern Protect semantic GitHub Actions test-scope outputs for CI workflow consumers.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPackageJsonChange,
  computeWorkflowModeScopeOutputs,
  parseScopeMode,
} from './scope-config.mjs';

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

function packageJsonScriptChange(scriptName, previousCommand, nextCommand) {
  return classifyPackageJsonChange(
    { scripts: { [scriptName]: previousCommand } },
    { scripts: { [scriptName]: nextCommand } }
  );
}

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
  assert.equal(scope.hash_compare_relevant, false);
  assert.equal(scope.contract_capability_changed, false);
});

test('emit-scope contracts mode routes contract tooling package aliases to contracts', () => {
  const contractToolingContext = {
    packageJsonChange: {
      ...scriptsOnlyContext.packageJsonChange,
      contractCapabilitySensitive: true,
    },
  };
  const scope = computeWorkflowModeScopeOutputs(
    'contracts',
    ['package.json'],
    contractToolingContext
  );

  assert.equal(scope.contracts_relevant, true);
  assert.equal(scope.contract_capability_changed, true);
});

test('emit-scope contracts mode routes lint:determinism script changes to determinism scan', () => {
  const scope = computeWorkflowModeScopeOutputs('contracts', ['package.json'], {
    packageJsonChange: packageJsonScriptChange(
      'lint:determinism',
      'pnpm --filter @dvt/engine lint',
      'pnpm --filter @dvt/engine lint --max-warnings 0'
    ),
  });

  assert.equal(scope.contracts_relevant, false);
  assert.equal(scope.determinism_relevant, true);
  assert.equal(scope.hash_compare_relevant, false);
});

test('emit-scope contracts mode marks hash-compare scope from golden/contract files', () => {
  const scope = computeWorkflowModeScopeOutputs('contracts', [
    'packages/@dvt/engine/test/contracts/fixtures/basic.plan.json',
  ]);

  assert.equal(scope.hash_compare_relevant, true);
});

test('emit-scope test mode keeps scripts-only package json out of runtime capability lanes', () => {
  const scope = computeWorkflowModeScopeOutputs('test', ['package.json'], scriptsOnlyContext);

  assert.equal(scope.any_test, false);
  assert.equal(scope.root_config, false);
  assert.equal(scope.root_build_sensitive, false);
  assert.equal(scope.determinism_relevant, false);
  assert.equal(scope.coverage_relevant, false);
  assert.equal(scope.postgres_capability_changed, false);
});

test('emit-scope test mode routes test:determinism script changes to determinism job', () => {
  const scope = computeWorkflowModeScopeOutputs('test', ['package.json'], {
    packageJsonChange: packageJsonScriptChange(
      'test:determinism',
      'pnpm --filter @dvt/engine test --testNamePattern determinism',
      'pnpm --filter @dvt/engine test --testNamePattern deterministic'
    ),
  });

  assert.equal(scope.root_build_sensitive, false);
  assert.equal(scope.determinism_relevant, true);
});

test('emit-scope test mode routes test:replay script changes to determinism job', () => {
  const scope = computeWorkflowModeScopeOutputs('test', ['package.json'], {
    packageJsonChange: packageJsonScriptChange(
      'test:replay',
      'pnpm --filter @dvt/engine test --testNamePattern replay',
      'pnpm --filter @dvt/engine test --testNamePattern replay-consistency'
    ),
  });

  assert.equal(scope.root_build_sensitive, false);
  assert.equal(scope.determinism_relevant, true);
});

test('emit-scope test mode marks engine changes coverage relevant', () => {
  const scope = computeWorkflowModeScopeOutputs('test', [
    'packages/@dvt/engine/src/WorkflowEngine.ts',
  ]);

  assert.equal(scope.engine, true);
  assert.equal(scope.coverage_relevant, true);
});

test('emit-scope test mode marks engine package config coverage relevant', () => {
  const scope = computeWorkflowModeScopeOutputs('test', ['packages/@dvt/engine/vitest.config.ts']);

  assert.equal(scope.engine, true);
  assert.equal(scope.coverage_relevant, true);
});

test('emit-scope test mode routes governed web test docs to web frontend tests', () => {
  const scope = computeWorkflowModeScopeOutputs('test', [
    'docs/architecture/components/web/frontend-test-governance-component.md',
    'buzon/20260518-f14-fowler-frontend-test-governance-analysis.md',
  ]);

  assert.equal(scope.any_test, true);
  assert.equal(scope.web, true);
  assert.equal(scope.root_build_sensitive, false);
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
  assert.equal(scope.postgres_capability_changed, true);
});

test('parseScopeMode accepts known modes and rejects missing or unknown mode', () => {
  assert.equal(parseScopeMode(['--mode', 'workflow']), 'workflow');
  assert.throws(() => parseScopeMode([]), /MODE_REQUIRED/);
  assert.throws(() => parseScopeMode(['--mode', 'unknown']), /UNSUPPORTED_MODE/);
});
