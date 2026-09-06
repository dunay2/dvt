import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const packageJsonPath = 'packages/@dvt/contracts/package.json';
const tsconfigPath = 'packages/@dvt/contracts/tsconfig.json';
const vitestConfigPath = 'packages/@dvt/contracts/vitest.config.ts';
const rootEntrypointPath = 'packages/@dvt/contracts/index.ts';
const runtimeEntrypointPath = 'packages/@dvt/contracts/src/index.ts';
const schemaEntrypointPath = 'packages/@dvt/contracts/src/schemas.ts';
const workflowsEntrypointPath = 'packages/@dvt/contracts/src/workflows.ts';
const validationSuitePath = 'packages/@dvt/contracts/test/validation.test.ts';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('contracts package publishes only governed compiled package entrypoints', () => {
  const packageJson = readJson(packageJsonPath);

  assert.equal(packageJson.name, '@dvt/contracts');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.main, 'dist/index.js');
  assert.equal(packageJson.types, 'dist/index.d.ts');
  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
      default: './dist/index.js',
    },
    './substrait': {
      types: './dist/substrait.d.ts',
      import: './dist/substrait.js',
      default: './dist/substrait.js',
    },
  });

  assert.equal(packageJson.scripts.build, 'tsc -b tsconfig.json');
  assert.equal(packageJson.scripts.typecheck, 'tsc -b tsconfig.json --noEmit');
  assert.equal(packageJson.scripts.test, 'vitest run --passWithNoTests');
  assert.equal(
    packageJson.scripts['schema:verify'],
    'vitest run --passWithNoTests test/schema-sync.test.ts'
  );
});

test('contracts package config limits build inputs to source contracts', () => {
  const tsconfig = readJson(tsconfigPath);
  const vitestConfig = readFileSync(vitestConfigPath, 'utf8');

  assert.equal(tsconfig.extends, '../../../tsconfig.package-bundler.base.json');
  assert.equal(tsconfig.compilerOptions.rootDir, 'src');
  assert.equal(tsconfig.compilerOptions.outDir, 'dist');
  assert.deepEqual(tsconfig.include, ['src/**/*']);
  assert.deepEqual(tsconfig.exclude, ['node_modules', 'dist', 'test']);

  assert.match(vitestConfig, /include:\s*\['test\/\*\*\/\*\.test\.ts'\]/u);
  assert.match(vitestConfig, /exclude:\s*\['node_modules\/\*\*', 'dist\/\*\*'\]/u);
});

test('contracts entrypoints delegate to canonical source barrels', () => {
  assert.ok(existsSync(rootEntrypointPath));
  assert.ok(existsSync(runtimeEntrypointPath));
  assert.ok(existsSync(schemaEntrypointPath));
  assert.ok(existsSync(workflowsEntrypointPath));

  const rootEntrypoint = readFileSync(rootEntrypointPath, 'utf8');
  const runtimeEntrypoint = readFileSync(runtimeEntrypointPath, 'utf8');

  assert.match(rootEntrypoint, /export \* from '\.\/src\/index';/u);
  assert.match(runtimeEntrypoint, /contracts\/engine\/StartRunBoundary\.v1\.js/u);
  assert.match(runtimeEntrypoint, /contracts\/planner\/ExecutionPlan\.v1\.js/u);
  assert.match(runtimeEntrypoint, /step-registry\/StepTypeRegistry\.js/u);
});

test('contracts test suite keeps validation and boundary coverage wired', () => {
  const validationSuite = readFileSync(validationSuitePath, 'utf8');

  for (const suite of [
    'registerValidationExecutionContextSuite',
    'registerValidationExecutionPlanSuite',
    'registerValidationExecutionSelectionSuite',
    'registerValidationPlanCompileSuite',
    'registerValidationPlanRecordsSuite',
    'registerValidationPlannerGraphSuite',
    'registerValidationPreviewSuite',
    'registerValidationRunLifecycleSuite',
    'registerValidationSignalAndErrorSuite',
    'registerValidationWorkspaceGraphDraftSuite',
  ]) {
    assert.match(validationSuite, new RegExp(`${suite}\\(\\)`, 'u'));
  }

  for (const testPath of [
    'packages/@dvt/contracts/test/step-artifact-ref.contract.test.ts',
    'packages/@dvt/contracts/test/errors.test.ts',
    'packages/@dvt/contracts/test/planner.contract.test.ts',
    'packages/@dvt/contracts/test/schema-sync.test.ts',
    'packages/@dvt/contracts/test/step-registry.test.ts',
    'packages/@dvt/contracts/test/start-run-boundary.contract.test.ts',
  ]) {
    assert.ok(existsSync(testPath), `${testPath} must remain present`);
  }
});
