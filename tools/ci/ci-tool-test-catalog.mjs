/**
 * Owned concern: query the canonical CI tool test corpus and its static/executable partition.
 * @baseline CI-SCOPE-OPTIMIZATION-20260508: one catalog owns test selection.
 * @decision Separate selection queries from CLI execution and timing observations.
 * @consequence Synchronous consumers reuse the same corpus without executing tests.
 * @version 1.0.0
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPackageSpecifiers, normalizePath } from './ci-tool-test-dependencies.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const CI_TOOL_TEST_MODES = Object.freeze(['all', 'static', 'executable']);

export const TOOLING_CRYPTO_CONTRACT = Object.freeze({
  testPath: 'tools/ci/architecture-dependency-guard.test.mjs',
  namePattern: 'tooling crypto mechanics',
  sourcePaths: Object.freeze([
    'scripts',
    'tools',
    'packages/@dvt/cli',
    'packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts',
  ]),
});

export function isToolingCryptoContractInput(filePath) {
  const file = normalizePath(filePath).replace(/^\.\//u, '');
  return (
    file === 'package.json' ||
    file === 'packages/@dvt/cli/package.json' ||
    (/\.[cm]?[jt]sx?$/u.test(file) &&
      TOOLING_CRYPTO_CONTRACT.sourcePaths.some(
        (root) => file === root || file.startsWith(root + '/')
      ))
  );
}

export const EXECUTABLE_CI_TOOL_TESTS = Object.freeze([
  'tools/ci/adapter-postgres-import-alias-regression.test.mjs',
  'tools/ci/api-eslint-project.test.mjs',
  'tools/ci/arc-policy-state-store.test.mjs',
  TOOLING_CRYPTO_CONTRACT.testPath,
  'tools/ci/contracts-package-governance.test.mjs',
  'tools/ci/docs-changed-governance-policy.test.mjs',
  'tools/ci/docs-disposition-canon.test.mjs',
  'tools/ci/docs-frontmatter-policy.test.mjs',
  'tools/ci/docs-index-links.test.mjs',
  'tools/ci/docs-manifest-contract.test.mjs',
  'tools/ci/docs-tool-typecheck.test.mjs',
  'tools/ci/engine-coverage.test.mjs',
  'tools/ci/feature-mechanization-workflow.test.mjs',
  'tools/ci/generated-docs-single-writer-policy.test.mjs',
  'tools/ci/github-collaboration-governance.test.mjs',
  'tools/ci/hosted-ci-tool-ownership.test.mjs',
  'tools/ci/package-test-matrix.test.mjs',
  'tools/ci/pr-quality-workflow-contract.test.mjs',
  'tools/ci/precommit-hook-wiring.test.mjs',
  'tools/ci/risk-document-colocation.test.mjs',
  'tools/ci/run-web-cypress-native.test.mjs',
  'tools/ci/setup-native-browser.test.mjs',
  'tools/ci/state-store-role-binding-architecture.test.mjs',
  'tools/ci/sync-docs-status-policy.test.mjs',
  'tools/ci/test-suite-outcome.test.mjs',
  'tools/ci/web-canvas-nightly.test.mjs',
  'tools/ci/web-network-diagnostics.test.mjs',
  'tools/ci/workflow-pattern-parity.test.mjs',
]);

function* walkFiles(rootDir) {
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(absolutePath);
      continue;
    }

    yield absolutePath;
  }
}

export function discoverCiToolTests(options = {}) {
  const root = options.repoRootPath ?? repoRoot;
  const ciRoot = path.join(root, 'tools', 'ci');

  return [...walkFiles(ciRoot)]
    .map((absolutePath) => normalizePath(path.relative(root, absolutePath)))
    .filter((filePath) => filePath.endsWith('.test.mjs'))
    .sort((left, right) => left.localeCompare(right));
}

export function findPackageBackedCiToolTests(options = {}) {
  const tests = options.tests ?? discoverCiToolTests(options);
  return tests
    .filter(
      (filePath) =>
        collectPackageSpecifiers(filePath, { repoRootPath: options.repoRootPath }).length > 0
    )
    .sort((left, right) => left.localeCompare(right));
}

export function assertCiToolTestPartition(tests = discoverCiToolTests(), options = {}) {
  const executableTests = options.executableTests ?? EXECUTABLE_CI_TOOL_TESTS;
  const allTests = new Set(tests);
  const missingExecutableTests = executableTests.filter((filePath) => !allTests.has(filePath));

  if (missingExecutableTests.length > 0) {
    throw new Error(
      `Executable CI tool test partition references missing files: ${missingExecutableTests.join(
        ', '
      )}`
    );
  }

  const executableTestSet = new Set(executableTests);
  const packageBackedStaticTests = findPackageBackedCiToolTests({
    repoRootPath: options.repoRootPath,
    tests,
  }).filter((filePath) => !executableTestSet.has(filePath));

  if (packageBackedStaticTests.length > 0) {
    throw new Error(
      `Package-backed CI tool tests must run in the executable partition: ${packageBackedStaticTests.join(
        ', '
      )}`
    );
  }
}

export function buildCiToolTestList(mode = 'all', options = {}) {
  if (!CI_TOOL_TEST_MODES.includes(mode)) {
    throw new TypeError(`Unsupported CI tool test mode: ${mode}`);
  }

  const tests = options.tests ?? discoverCiToolTests(options);
  assertCiToolTestPartition(tests);

  if (mode === 'all') {
    return tests;
  }

  const executableTests = new Set(EXECUTABLE_CI_TOOL_TESTS);
  return tests.filter((filePath) =>
    mode === 'executable' ? executableTests.has(filePath) : !executableTests.has(filePath)
  );
}
