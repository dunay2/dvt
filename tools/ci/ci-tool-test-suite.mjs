import { spawnSync } from 'node:child_process';
import { builtinModules } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const CI_TOOL_TEST_MODES = Object.freeze(['all', 'static', 'executable']);

export const EXECUTABLE_CI_TOOL_TESTS = Object.freeze([
  'tools/ci/adapter-postgres-import-alias-regression.test.mjs',
  'tools/ci/arc-policy-state-store.test.mjs',
  'tools/ci/architecture-dependency-guard.test.mjs',
  'tools/ci/contracts-package-governance.test.mjs',
  'tools/ci/docs-changed-governance-policy.test.mjs',
  'tools/ci/docs-frontmatter-bom.test.mjs',
  'tools/ci/docs-manifest-contract.test.mjs',
  'tools/ci/generated-docs-single-writer-policy.test.mjs',
  'tools/ci/github-collaboration-governance.test.mjs',
  'tools/ci/sync-docs-status-policy.test.mjs',
  'tools/ci/workflow-pattern-parity.test.mjs',
]);

const NODE_BUILTIN_SPECIFIERS = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

const MODULE_SPECIFIER_PATTERNS = [
  /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gu,
  /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/gu,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
];

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function isRelativeOrAbsoluteSpecifier(specifier) {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

function isPackageSpecifier(specifier) {
  return (
    !specifier.startsWith('node:') &&
    !NODE_BUILTIN_SPECIFIERS.has(specifier) &&
    !isRelativeOrAbsoluteSpecifier(specifier)
  );
}

function extractModuleSpecifiers(source) {
  const specifiers = [];
  for (const pattern of MODULE_SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function resolveRelativeModulePath(fromFilePath, specifier, root) {
  if (!isRelativeOrAbsoluteSpecifier(specifier)) {
    return null;
  }

  const fromDir = path.dirname(path.resolve(root, fromFilePath));
  const basePath = specifier.startsWith('/')
    ? path.resolve(root, `.${specifier}`)
    : path.resolve(fromDir, specifier);
  const candidates = path.extname(basePath)
    ? [basePath]
    : [
        `${basePath}.mjs`,
        `${basePath}.cjs`,
        `${basePath}.js`,
        path.join(basePath, 'index.mjs'),
        path.join(basePath, 'index.cjs'),
        path.join(basePath, 'index.js'),
      ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const relativePath = normalizePath(path.relative(root, candidate));
    if (!relativePath.startsWith('..')) {
      return relativePath;
    }
  }

  return null;
}

function collectPackageSpecifiers(filePath, options = {}) {
  const root = options.repoRootPath ?? repoRoot;
  const visited = options.visited ?? new Set();
  const normalizedFilePath = normalizePath(filePath);

  if (visited.has(normalizedFilePath)) {
    return [];
  }
  visited.add(normalizedFilePath);

  const absolutePath = path.resolve(root, normalizedFilePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  const source = readFileSync(absolutePath, 'utf8');
  const packageSpecifiers = [];
  for (const specifier of extractModuleSpecifiers(source)) {
    if (isPackageSpecifier(specifier)) {
      packageSpecifiers.push(specifier);
      continue;
    }

    const relativeModulePath = resolveRelativeModulePath(normalizedFilePath, specifier, root);
    if (!relativeModulePath) {
      continue;
    }

    packageSpecifiers.push(
      ...collectPackageSpecifiers(relativeModulePath, {
        repoRootPath: root,
        visited,
      })
    );
  }

  return [...new Set(packageSpecifiers)].sort((left, right) => left.localeCompare(right));
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
