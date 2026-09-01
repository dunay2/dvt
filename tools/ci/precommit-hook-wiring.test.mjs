import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readPackageJson() {
  return JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
}

function readWebPackageJson() {
  return JSON.parse(readFileSync(path.join(repoRoot, 'apps', 'web', 'package.json'), 'utf8'));
}

function readPreCommitHook() {
  return readFileSync(path.join(repoRoot, '.husky', 'pre-commit'), 'utf8');
}

test('pre-commit hook wiring avoids pnpm commit lifecycle duplication', () => {
  const packageJson = readPackageJson();
  const preCommitHook = readPreCommitHook();

  assert.equal(
    Object.hasOwn(packageJson.scripts, 'precommit'),
    false,
    'Do not define a root "precommit" script: pnpm commit runs it as a lifecycle script before the Git hook.'
  );
  assert.equal(packageJson.scripts['hooks:precommit'], 'lint-staged && pnpm precommit:determinism');
  assert.match(preCommitHook, /pnpm run hooks:precommit/);
  assert.doesNotMatch(preCommitHook, /pnpm run precommit(?:\s|$)/);
});

test('pre-commit lint stays untyped while the canonical ESLint gate stays type-aware', async () => {
  const packageJson = readPackageJson();
  const eslintCommands = Object.values(packageJson['lint-staged'])
    .flat()
    .filter((command) => command.startsWith('eslint '));

  assert.ok(eslintCommands.length > 0, 'Expected lint-staged to invoke ESLint.');
  assert.ok(
    eslintCommands.every(
      (command) => command === 'eslint --fix --config tools/ci/eslint-precommit.config.cjs'
    ),
    `Expected every staged ESLint command to use the fast config, received: ${eslintCommands.join(', ')}`
  );

  const stagedLint = new ESLint({
    overrideConfigFile: path.join(repoRoot, 'tools', 'ci', 'eslint-precommit.config.cjs'),
  });
  const canonicalLint = new ESLint();
  const stagedConfig = await stagedLint.calculateConfigForFile(
    path.join(repoRoot, 'apps', 'web', 'src', 'app', 'AppProviders.tsx')
  );
  const canonicalConfig = await canonicalLint.calculateConfigForFile(
    path.join(repoRoot, 'apps', 'web', 'src', 'app', 'AppProviders.tsx')
  );
  const canonicalEngineConfig = await canonicalLint.calculateConfigForFile(
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'WorkflowEngine.ts')
  );
  const canonicalCypressConfig = await canonicalLint.calculateConfigForFile(
    path.join(repoRoot, 'apps', 'web', 'cypress', 'support', 'workspaceSession.ts')
  );
  const canonicalWebScriptConfig = await canonicalLint.calculateConfigForFile(
    path.join(repoRoot, 'apps', 'web', 'scripts', 'run-vitest-changed-suites.ts')
  );
  const canonicalViteConfig = await canonicalLint.calculateConfigForFile(
    path.join(repoRoot, 'apps', 'web', 'vite.config.ts')
  );
  const stagedEngineConfig = await stagedLint.calculateConfigForFile(
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'WorkflowEngine.ts')
  );
  const stagedTemporalWorkflowConfig = await stagedLint.calculateConfigForFile(
    path.join(
      repoRoot,
      'packages',
      '@dvt',
      'adapter-temporal',
      'src',
      'workflows',
      'RunPlanWorkflow.ts'
    )
  );

  assert.equal(stagedConfig.languageOptions.parserOptions.project, false);
  assert.equal(stagedConfig.rules['@typescript-eslint/no-floating-promises'][0], 0);
  assert.equal(stagedConfig.rules['@typescript-eslint/no-misused-promises'][0], 0);
  assert.equal(stagedConfig.rules['@typescript-eslint/await-thenable'][0], 0);
  assert.equal(stagedConfig.rules['import/no-unresolved'][0], 0);
  assert.equal(stagedConfig.rules['import/no-cycle'][0], 0);
  assert.deepEqual(Object.keys(stagedConfig.settings['import/resolver']), ['node']);
  assert.equal(stagedEngineConfig.rules['no-restricted-imports'][0], 2);
  assert.equal(stagedEngineConfig.rules['no-restricted-syntax'][0], 2);
  assert.equal(stagedEngineConfig.rules['no-restricted-properties'][0], 2);
  assert.equal(stagedTemporalWorkflowConfig.rules['no-restricted-globals'][0], 2);
  assert.equal(stagedTemporalWorkflowConfig.rules['no-restricted-imports'][0], 2);

  assert.deepEqual(canonicalConfig.languageOptions.parserOptions.project, [
    './apps/web/tsconfig.eslint.json',
  ]);
  assert.deepEqual(canonicalCypressConfig.languageOptions.parserOptions.project, [
    './apps/web/tsconfig.eslint.json',
  ]);
  assert.deepEqual(canonicalWebScriptConfig.languageOptions.parserOptions.project, [
    './apps/web/tsconfig.eslint.json',
  ]);
  assert.deepEqual(canonicalViteConfig.languageOptions.parserOptions.project, [
    './apps/web/tsconfig.eslint.json',
  ]);
  assert.deepEqual(canonicalEngineConfig.languageOptions.parserOptions.project, [
    './tsconfig.eslint.json',
  ]);
  assert.equal(canonicalConfig.rules['@typescript-eslint/no-floating-promises'][0], 2);
  assert.equal(canonicalConfig.rules['@typescript-eslint/no-misused-promises'][0], 2);
  assert.equal(canonicalConfig.rules['@typescript-eslint/await-thenable'][0], 2);
  assert.equal(canonicalConfig.rules['import/no-unresolved'][0], 2);
  assert.equal(canonicalConfig.rules['import/no-cycle'][0], 2);
  assert.ok(Object.hasOwn(canonicalConfig.settings['import/resolver'], 'typescript'));
});

test('web workspace lint is fast while strict lint remains available', () => {
  const webPackageJson = readWebPackageJson();

  assert.match(webPackageJson.scripts.lint, /pnpm --dir \.\.\/\.\. exec node/u);
  assert.match(webPackageJson.scripts.lint, /--config tools\/ci\/eslint-precommit\.config\.cjs/u);
  assert.match(
    webPackageJson.scripts.lint,
    /--cache --cache-location node_modules\/\.cache\/eslint\/web-fast/u
  );
  assert.doesNotMatch(webPackageJson.scripts['lint:strict'], /eslint-precommit\.config\.cjs/u);
  assert.match(webPackageJson.scripts['lint:strict'], /eslint\.js/u);
});

test('determinism lint uses the fast syntax profile without package builds', () => {
  const determinismLint = readPackageJson().scripts['lint:determinism'];

  assert.match(determinismLint, /--config tools\/ci\/eslint-precommit\.config\.cjs/u);
  assert.match(
    determinismLint,
    /--cache --cache-location node_modules\/\.cache\/eslint\/determinism/u
  );
  assert.doesNotMatch(determinismLint, /pnpm --filter/u);
  assert.doesNotMatch(determinismLint, / build/u);
});
