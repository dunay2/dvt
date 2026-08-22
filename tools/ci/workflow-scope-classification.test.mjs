import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  TEST_SCOPE_PATTERNS,
  WORKFLOW_SCOPE_PATTERNS,
  WORKSPACE_ENTRIES,
  computeBooleanScope,
  computeWorkflowModeScopeOutputs,
  computeWorkspaceMatrix,
  matchesAnyPattern,
} from './scope-config.mjs';

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }

    if (entry.name === 'package.json') {
      yield fullPath.replaceAll('\\', '/');
    }
  }
}

function collectWorkspacePackages() {
  return [...walk('apps'), ...walk('packages')]
    .map((file) => ({
      file,
      pkg: JSON.parse(readFileSync(file, 'utf8')),
    }))
    .filter(({ pkg }) => typeof pkg.name === 'string');
}

test('classifies docs-only pull request scope', () => {
  const scope = computeBooleanScope(['docs/guides/example.md'], WORKFLOW_SCOPE_PATTERNS);
  assert.equal(scope.docs_changed, true);
  assert.equal(scope.any_code, false);
  assert.equal(scope.security_analysis_relevant, false);
});

test('classifies Repository Map binding and lifecycle inputs as generated-status relevant', () => {
  for (const file of [
    'docs/planning/status/system-governance-unit-index.units.yaml',
    'docs/contracts/index.md',
    'buzon/20260807-example.md',
    'scripts/planning-db-import.cjs',
    'README.md',
    'src/index.ts',
    'test/root.test.ts',
    'integrations/example/README.md',
    'integrations/example/package.json',
    'integrations/example/src/index.ts',
    'integrations/example/test/example.test.ts',
    '.github/workflows/docs-deploy.yml',
    '.github/requirements/zensical.in',
    '.github/requirements/zensical.lock',
  ]) {
    const scope = computeBooleanScope([file], WORKFLOW_SCOPE_PATTERNS);
    assert.equal(scope.generated_status_relevant, true, file);
  }
});

test('keeps mailbox analysis out of security analysis scope', () => {
  const scope = computeWorkflowModeScopeOutputs('workflow', [
    'buzon/20260531-db-first-architecture-generated-docs-fowler-analysis.md',
  ]);

  assert.equal(scope.any_code, false);
  assert.equal(scope.docs_changed, false);
  assert.equal(scope.security_analysis_relevant, false);
});

test('classifies structural code changes as generated-status relevant', () => {
  const scope = computeBooleanScope(
    ['packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts'],
    WORKFLOW_SCOPE_PATTERNS
  );
  assert.equal(scope.any_code, true);
  assert.equal(scope.generated_status_relevant, true);
  assert.equal(scope.generated_capability_relevant, true);
});

test('classifies governance script changes as docs-relevant but not code scope', () => {
  const scope = computeBooleanScope(
    ['scripts/check-markdown-locations.cjs'],
    WORKFLOW_SCOPE_PATTERNS
  );
  assert.equal(scope.docs_changed, true);
  assert.equal(scope.any_code, false);
  assert.equal(scope.changed_file_validation_relevant, true);
});

test('classifies app/package structural changes as code and generated-status relevant', () => {
  const scope = computeBooleanScope(['apps/web/src/main.tsx'], WORKFLOW_SCOPE_PATTERNS);
  assert.equal(scope.any_code, true);
  assert.equal(scope.generated_status_relevant, true);
  assert.equal(scope.generated_capability_relevant, true);
  assert.equal(scope.security_analysis_relevant, true);
});

test('classifies turbo root-build surfaces for test-suite root config routing', () => {
  const turboScope = computeBooleanScope(['turbo.json'], TEST_SCOPE_PATTERNS);
  assert.equal(turboScope.any_test, true);
  assert.equal(turboScope.root_config, true);

  const helperScope = computeBooleanScope(
    ['scripts/skip-prebuild-if-orchestrated.cjs'],
    TEST_SCOPE_PATTERNS
  );
  assert.equal(helperScope.any_test, true);
  assert.equal(helperScope.root_config, true);
});

test('classifies turbo root-build surfaces for workflow scope and workspace matrix routing', () => {
  const scope = computeBooleanScope(['turbo.json'], WORKFLOW_SCOPE_PATTERNS);
  assert.equal(scope.any_code, true);

  const matrix = computeWorkspaceMatrix(['turbo.json']);
  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});

test('workflow policy changes stay on CI contracts without runtime fan-out', () => {
  for (const file of ['.github/workflows/ci.yml', '.github/workflows/test.yml']) {
    const workflowScope = computeWorkflowModeScopeOutputs('workflow', [file]);
    const matrix = computeWorkspaceMatrix([file]);

    assert.equal(workflowScope.any_code, true);
    assert.equal(workflowScope.changed_file_validation_relevant, true);
    assert.equal(workflowScope.security_analysis_relevant, true);
    assert.equal(workflowScope.code_validation_relevant, false);
    assert.equal(matrix.anyChanged, false);
    assert.deepEqual(matrix.include, []);
  }

  const testScope = computeWorkflowModeScopeOutputs('test', ['.github/workflows/test.yml']);

  assert.equal(testScope.any_test, false);
  assert.equal(testScope.root_config, false);
  assert.equal(testScope.root_build_sensitive, false);
  assert.equal(testScope.postgres_capability_changed, false);
  assert.equal(testScope.determinism_relevant, false);
  assert.equal(testScope.coverage_relevant, false);
});

test('classifies dependency-cruiser config as CI policy validation without workspace fan-out', () => {
  const scope = computeBooleanScope(['.dependency-cruiser.cjs'], WORKFLOW_SCOPE_PATTERNS);
  const matrix = computeWorkspaceMatrix(['.dependency-cruiser.cjs']);

  assert.equal(scope.any_code, true);
  assert.equal(scope.changed_file_validation_relevant, true);
  assert.equal(scope.security_analysis_relevant, true);
  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
});

test('planning db script path keeps workspace matrix empty while validation stays enabled', () => {
  const matrix = computeWorkspaceMatrix(['scripts/planning-db-query.cjs']);
  const scope = computeBooleanScope(['scripts/planning-db-query.cjs'], WORKFLOW_SCOPE_PATTERNS);

  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
  assert.equal(scope.changed_file_validation_relevant, true);
});

test('docs and ci helper script paths keep workspace matrix empty while validation stays enabled', () => {
  for (const file of [
    'tools/docs/check-filenames.ts',
    'tools/ci/emit-scope.mjs',
    '.github/scripts/generate_pr_manifest.sh',
  ]) {
    assert.deepEqual(computeWorkspaceMatrix([file]).include, []);
    assert.equal(
      computeBooleanScope([file], WORKFLOW_SCOPE_PATTERNS).changed_file_validation_relevant,
      true
    );
  }
});

test('sync docs source routes executable CI contracts without workspace fan-out', () => {
  const file = 'scripts/sync-docs.cjs';
  const scope = computeBooleanScope([file], WORKFLOW_SCOPE_PATTERNS);
  const matrix = computeWorkspaceMatrix([file]);

  assert.equal(scope.changed_file_validation_relevant, true);
  assert.equal(scope.ci_tool_executable_contracts_relevant, true);
  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
});

test('classifies executable CI tool contracts separately from static CI policy tests', () => {
  const executableScope = computeBooleanScope(
    ['tools/ci/docs-manifest-contract.test.mjs'],
    WORKFLOW_SCOPE_PATTERNS
  );
  const staticScope = computeBooleanScope(
    ['tools/ci/workflow-pattern-parity.test.mjs'],
    WORKFLOW_SCOPE_PATTERNS
  );

  assert.equal(executableScope.changed_file_validation_relevant, true);
  assert.equal(executableScope.ci_tool_executable_contracts_relevant, true);
  assert.equal(staticScope.changed_file_validation_relevant, true);
  assert.equal(staticScope.ci_tool_executable_contracts_relevant, false);

  const syncDocsScope = computeBooleanScope(
    ['tools/ci/sync-docs-status-policy.test.mjs'],
    WORKFLOW_SCOPE_PATTERNS
  );

  assert.equal(syncDocsScope.changed_file_validation_relevant, true);
  assert.equal(syncDocsScope.ci_tool_executable_contracts_relevant, true);
});

test('governed evidence and its manifest do not change CI executable contracts', () => {
  const scope = computeBooleanScope(
    ['docs/.manifest.json', 'docs/evidence/ED-20991231-web-feature-proof.md'],
    WORKFLOW_SCOPE_PATTERNS
  );

  assert.equal(scope.docs_changed, true);
  assert.equal(scope.ci_tool_executable_contracts_relevant, false);
});

test('workspace matrix covers every workspace with a build or typecheck script', () => {
  const ciWorkspacePackages = new Set(WORKSPACE_ENTRIES.map(({ pkg }) => pkg));
  const missing = collectWorkspacePackages()
    .filter(({ pkg }) => pkg.scripts?.build || pkg.scripts?.typecheck)
    .filter(({ pkg }) => !ciWorkspacePackages.has(pkg.name))
    .map(({ pkg, file }) => `${pkg.name} (${file})`);

  assert.deepEqual(missing, []);
});

test('test scope covers every workspace test script except adapter-postgres dedicated lane', () => {
  const missing = collectWorkspacePackages()
    .filter(({ pkg }) => pkg.scripts?.test)
    .filter(({ pkg }) => pkg.name !== '@dvt/adapter-postgres')
    .filter(
      ({ file }) =>
        !Object.entries(TEST_SCOPE_PATTERNS).some(([key, patterns]) => {
          if (key === 'any_test' || key === 'root_config') {
            return false;
          }

          return matchesAnyPattern(file, patterns);
        })
    )
    .map(({ pkg, file }) => `${pkg.name} (${file})`);

  assert.deepEqual(missing, []);
});
