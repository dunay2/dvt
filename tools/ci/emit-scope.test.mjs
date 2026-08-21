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

const PLANNING_DB_WITH_CI_CONTRACT_FIXTURE = [
  'scripts/planning-db-export.cjs',
  'scripts/planning-db-export.test.cjs',
  'scripts/planning-db-operate-tests/feature-mechanization.test.cjs',
  'scripts/planning-db-operate-tests/governed-source-refresh.test.cjs',
  'scripts/planning-db-operate.cjs',
  'scripts/planning-db-operate.test.cjs',
  'scripts/planning-db-schema.test.cjs',
  'scripts/planning-db/commands/governed-source-refresh-command.cjs',
  'scripts/planning-db/governed-source-refresh-write-rail.cjs',
  'tools/ci/sync-docs-status-policy.test.mjs',
  'tools/planning-db/schema.sql',
  'tools/planning-db/state/db-governance-surfaces.json',
];

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
  assert.equal(scope.security_analysis_relevant, false);
});

test('emit-scope workflow mode preserves non-package matches mixed with scripts-only package json', () => {
  const scope = computeWorkflowModeScopeOutputs(
    'workflow',
    ['package.json', 'apps/api/src/server.ts'],
    scriptsOnlyContext
  );

  assert.equal(scope.changed_file_validation_relevant, true);
  assert.equal(scope.any_code, true);
  assert.equal(scope.security_analysis_relevant, true);
});

test('emit-scope workflow mode routes dependency-sensitive package json to security analysis', () => {
  const scope = computeWorkflowModeScopeOutputs('workflow', ['package.json'], {
    packageJsonChange: {
      packageScriptsOnly: false,
      rootBuildSensitive: true,
      dependencySensitive: true,
      lifecycleSensitive: false,
      ciToolingSensitive: false,
      governanceToolingOnly: false,
    },
  });

  assert.equal(scope.any_code, true);
  assert.equal(scope.security_analysis_relevant, true);
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

test('emit-scope keeps Planning DB changes with a CI contract test out of product lanes', () => {
  const testScope = computeWorkflowModeScopeOutputs('test', PLANNING_DB_WITH_CI_CONTRACT_FIXTURE);
  const qualityScope = computeWorkflowModeScopeOutputs(
    'pr-quality',
    PLANNING_DB_WITH_CI_CONTRACT_FIXTURE
  );

  assert.equal(testScope.root_build_sensitive, false);
  assert.equal(testScope.web, false);
  assert.equal(testScope.adapter_temporal, false);
  assert.equal(testScope.postgres_capability_changed, false);
  assert.equal(testScope.determinism_relevant, false);
  assert.equal(testScope.coverage_relevant, false);
  assert.equal(qualityScope.temporal_changed, false);
  assert.equal(qualityScope.temporal_transformation_changed, false);
  assert.equal(qualityScope.temporal_postgres_changed, false);
});

test('emit-scope fails closed for an unclassified executable', () => {
  const changedFiles = ['scripts/unclassified-runtime.cjs'];
  const testScope = computeWorkflowModeScopeOutputs('test', changedFiles);
  const qualityScope = computeWorkflowModeScopeOutputs('pr-quality', changedFiles);

  assert.equal(testScope.root_build_sensitive, true);
  assert.equal(qualityScope.temporal_changed, true);
  assert.equal(qualityScope.temporal_transformation_changed, true);
  assert.equal(qualityScope.temporal_postgres_changed, true);
});

test('emit-scope fails closed for an uncatalogued CI configuration', () => {
  const changedFiles = ['tools/ci/policy/unknown-policy.json'];
  const testScope = computeWorkflowModeScopeOutputs('test', changedFiles);
  const qualityScope = computeWorkflowModeScopeOutputs('pr-quality', changedFiles);

  assert.equal(testScope.root_build_sensitive, true);
  assert.equal(qualityScope.temporal_changed, true);
  assert.equal(qualityScope.temporal_transformation_changed, true);
  assert.equal(qualityScope.temporal_postgres_changed, true);
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

test('emit-scope workflow mode exposes prepush-equivalent governance routing', () => {
  const webScope = computeWorkflowModeScopeOutputs('workflow', [
    'apps/web/src/app/AppProviders.tsx',
  ]);

  assert.equal(webScope.security_analysis_relevant, true);
  assert.equal(webScope.governance_global_relevant, false);
  assert.equal(webScope.traceability_adr0_relevant, false);
  assert.equal(webScope.feature_mechanization_relevant, true);
  assert.equal(webScope.code_validation_relevant, true);

  const docsScope = computeWorkflowModeScopeOutputs('workflow', [
    'docs/guides/testing-and-ci-capabilities.md',
  ]);

  assert.equal(docsScope.governance_global_relevant, true);
  assert.equal(docsScope.traceability_adr0_relevant, false);
  assert.equal(docsScope.feature_mechanization_relevant, false);
  assert.equal(docsScope.code_validation_relevant, false);
});

test('emit-scope workflow mode routes executable CI tool contracts only for install-backed surfaces', () => {
  const executableScope = computeWorkflowModeScopeOutputs('workflow', [
    'tools/ci/docs-changed-governance-policy.test.mjs',
  ]);

  assert.equal(executableScope.ci_tool_executable_contracts_relevant, true);

  const staticScope = computeWorkflowModeScopeOutputs('workflow', [
    'tools/ci/workflow-pattern-parity.test.mjs',
  ]);

  assert.equal(staticScope.changed_file_validation_relevant, true);
  assert.equal(staticScope.ci_tool_executable_contracts_relevant, false);

  const packageScriptScope = computeWorkflowModeScopeOutputs('workflow', ['package.json'], {
    packageJsonChange: {
      packageScriptsOnly: true,
      rootBuildSensitive: false,
      dependencySensitive: false,
      lifecycleSensitive: false,
      ciToolingSensitive: true,
      governanceToolingOnly: false,
    },
  });

  assert.equal(packageScriptScope.ci_tool_executable_contracts_relevant, true);
});

test('emit-scope workflow mode keeps product evidence out of CI self-test authority', () => {
  const scope = computeWorkflowModeScopeOutputs('workflow', [
    'apps/web/src/app/views/canvas/canvasColumnLineageProjection.ts',
    'docs/.manifest.json',
    'docs/evidence/ED-20991231-web-feature-proof.md',
  ]);

  assert.equal(scope.changed_file_validation_relevant, false);
  assert.equal(scope.ci_tool_executable_contracts_relevant, false);
  assert.equal(scope.docs_changed, true);
  assert.equal(scope.any_code, true);
});

test('emit-scope workflow mode routes traceability only for ADRs and governed source', () => {
  const adrScope = computeWorkflowModeScopeOutputs('workflow', [
    'docs/adr/ADR-0056-web-ui-authority-is-server-projected.md',
  ]);

  assert.equal(adrScope.governance_global_relevant, true);
  assert.equal(adrScope.traceability_adr0_relevant, true);
  assert.equal(adrScope.code_validation_relevant, false);

  const engineScope = computeWorkflowModeScopeOutputs('workflow', [
    'packages/@dvt/engine/src/WorkflowEngine.ts',
  ]);

  assert.equal(engineScope.governance_global_relevant, false);
  assert.equal(engineScope.traceability_adr0_relevant, true);
  assert.equal(engineScope.feature_mechanization_relevant, true);
  assert.equal(engineScope.code_validation_relevant, true);
});

test('parseScopeMode accepts known modes and rejects missing or unknown mode', () => {
  assert.equal(parseScopeMode(['--mode', 'workflow']), 'workflow');
  assert.throws(() => parseScopeMode([]), /MODE_REQUIRED/);
  assert.throws(() => parseScopeMode(['--mode', 'unknown']), /UNSUPPORTED_MODE/);
});
