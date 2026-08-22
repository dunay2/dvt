import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const packageJsonPath = 'packages/@dvt/planner/package.json';
const tsconfigPath = 'packages/@dvt/planner/tsconfig.json';
const vitestConfigPath = 'packages/@dvt/planner/vitest.config.ts';
const rootEntrypointPath = 'packages/@dvt/planner/src/index.ts';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('planner package publishes one compiled planner entrypoint and explicit contract aliases', () => {
  const packageJson = readJson(packageJsonPath);

  assert.equal(packageJson.name, '@dvt/planner');
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
    './contracts/planner/*': {
      types: './dist/contracts/planner/*.d.ts',
      import: './dist/contracts/planner/*.js',
      default: './dist/contracts/planner/*.js',
    },
  });

  assert.equal(packageJson.scripts.build, 'tsc -p tsconfig.json');
  assert.equal(packageJson.scripts.typecheck, 'tsc -p tsconfig.json --noEmit');
  assert.equal(packageJson.scripts.test, 'vitest run');
  assert.equal(packageJson.scripts['test:slow'], 'vitest run -c vitest.config.ts --dir test/slow');
});

test('planner contract authority has no obsolete satellite workspace', () => {
  for (const obsoletePackageSurface of [
    'packages/@dvt/planner-contracts/package.json',
    'packages/@dvt/planner-contracts/index.ts',
    'packages/@dvt/planner-contracts/tsconfig.json',
  ]) {
    assert.equal(existsSync(obsoletePackageSurface), false);
  }

  const canonicalContract = readFileSync(
    'packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts',
    'utf8'
  );
  assert.match(canonicalContract, /export interface PlannerInputEnvelopeV1/u);

  for (const configPath of ['tools/ci/scope-config.mjs', 'tools/ci/validate-policy.js']) {
    const configSource = readFileSync(configPath, 'utf8');
    assert.doesNotMatch(configSource, /planner[_-]contracts|@dvt\/planner-contracts/u);
  }

  const workflowScopePolicy = readJson('tools/ci/policy/workflow-scope.json');
  assert.equal(Object.hasOwn(workflowScopePolicy, 'workspace_planner_contracts'), false);

  for (const currentArchitecturePath of [
    'docs/architecture/diagrams/implementation-architecture-diagrams.md',
    'docs/architecture/domain-shared.md',
    'docs/architecture/typescript-package-classification.md',
    'docs/architecture/atlas/engineering/engineering-playbook.md',
  ]) {
    const architectureSource = readFileSync(currentArchitecturePath, 'utf8');
    assert.doesNotMatch(architectureSource, /planner-contracts|plancontracts/u);
  }
});

test('planner package build config keeps examples, docs and tests out of compiled source', () => {
  const tsconfig = readJson(tsconfigPath);
  const vitestConfig = readFileSync(vitestConfigPath, 'utf8');

  assert.equal(tsconfig.extends, '../../../tsconfig.package-bundler.base.json');
  assert.equal(tsconfig.compilerOptions.rootDir, 'src');
  assert.equal(tsconfig.compilerOptions.outDir, 'dist');
  assert.deepEqual(tsconfig.include, ['src/**/*.ts']);
  assert.deepEqual(tsconfig.exclude, ['dist', 'node_modules', 'test', 'examples', 'docs']);

  assert.match(vitestConfig, /environment:\s*'node'/u);
  assert.match(vitestConfig, /include:\s*\['test\/\*\*\/\*\.test\.ts'\]/u);
  assert.match(vitestConfig, /exclude:\s*\['\*\*\/node_modules\/\*\*', 'dist\/\*\*'\]/u);
});

test('planner public barrel keeps domain internals private and exports planner-owned ports type-only', () => {
  const rootEntrypoint = readFileSync(rootEntrypointPath, 'utf8');

  assert.match(rootEntrypoint, /export \{ PlannerFacade, type PlannerFacadeOptions \}/u);
  assert.doesNotMatch(rootEntrypoint, /export \{ Planner[,}]/u);
  assert.doesNotMatch(rootEntrypoint, /from '\.\/domain\/Planner\.js'/u);

  for (const exportedType of [
    'ICustomPolicyNamespaceRegistry',
    'IExecutionBindingVerifier',
    'IPlanExecutabilityValidator',
    'PlanExecutabilityValidationInput',
  ]) {
    assert.match(rootEntrypoint, new RegExp(`export type \\{ ${exportedType} \\}`, 'u'));
  }

  assert.match(rootEntrypoint, /DO NOT add new contract re-exports here/u);
  assert.match(rootEntrypoint, /DO NOT add new artifact exports here/u);
});

test('planner local docs and examples remain explicit package-owned surfaces', () => {
  for (const filePath of [
    'packages/@dvt/planner/docs/README.md',
    'packages/@dvt/planner/docs/grimorio.md',
    'packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md',
    'packages/@dvt/planner/examples/dbt-workflow.ts',
    'packages/@dvt/planner/examples/generic-pipeline.ts',
  ]) {
    assert.ok(existsSync(filePath), `${filePath} must remain present`);
  }

  for (const examplePath of [
    'packages/@dvt/planner/examples/dbt-workflow.ts',
    'packages/@dvt/planner/examples/generic-pipeline.ts',
  ]) {
    const exampleSource = readFileSync(examplePath, 'utf8');

    assert.match(exampleSource, /from '\.\.\/src\/domain\/Planner\.js'/u);
    assert.doesNotMatch(exampleSource, /from ['"]@dvt\/engine/u);
    assert.doesNotMatch(exampleSource, /from ['"]@dvt\/adapter-/u);
  }
});
