import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const CI_TOOL_TEST_MODES = Object.freeze(['all', 'static', 'executable']);

export const EXECUTABLE_CI_TOOL_TESTS = Object.freeze([
  'tools/ci/adapter-postgres-import-alias-regression.test.mjs',
  'tools/ci/arc-policy-state-store.test.mjs',
  'tools/ci/architecture-dependency-guard.test.mjs',
  'tools/ci/docs-changed-governance-policy.test.mjs',
  'tools/ci/docs-frontmatter-bom.test.mjs',
  'tools/ci/docs-manifest-contract.test.mjs',
  'tools/ci/planning-truth-sync.test.mjs',
]);

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

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

export function assertCiToolTestPartition(tests = discoverCiToolTests()) {
  const allTests = new Set(tests);
  const missingExecutableTests = EXECUTABLE_CI_TOOL_TESTS.filter(
    (filePath) => !allTests.has(filePath)
  );

  if (missingExecutableTests.length > 0) {
    throw new Error(
      `Executable CI tool test partition references missing files: ${missingExecutableTests.join(
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

export function runCiToolTests(mode = 'all', options = {}) {
  const root = options.repoRootPath ?? repoRoot;
  const tests = buildCiToolTestList(mode, { ...options, repoRootPath: root });

  if (tests.length === 0) {
    console.log(`[ci-tool-tests] No ${mode} tests selected.`);
    return 0;
  }

  console.log(`[ci-tool-tests] Running ${tests.length} ${mode} test file(s).`);
  const result = spawnSync(process.execPath, ['--test', ...tests], {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 0;
}

export function parseCiToolTestMode(argv = process.argv.slice(2)) {
  const mode = argv[0] ?? 'all';
  if (!CI_TOOL_TEST_MODES.includes(mode)) {
    throw new TypeError(`Unsupported CI tool test mode: ${mode}`);
  }

  return mode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCiToolTests(parseCiToolTestMode());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
