import { execFile } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT_CONFIG_PATTERNS = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];

export const WORKSPACE_ENTRIES = [
  { key: 'api', name: 'api', pkg: 'dvt-api', patterns: ['apps/api/**'] },
  { key: 'web', name: 'web', pkg: '@dvt/web', patterns: ['apps/web/**'] },
  { key: 'contracts', name: 'contracts', pkg: '@dvt/contracts', patterns: ['packages/@dvt/contracts/**'] },
  { key: 'engine', name: 'engine', pkg: '@dvt/engine', patterns: ['packages/@dvt/engine/**'] },
  {
    key: 'adapter_postgres',
    name: 'adapter-postgres',
    pkg: '@dvt/adapter-postgres',
    patterns: ['packages/@dvt/adapter-postgres/**'],
  },
  {
    key: 'adapter_temporal',
    name: 'adapter-temporal',
    pkg: '@dvt/adapter-temporal',
    patterns: ['packages/@dvt/adapter-temporal/**'],
  },
  { key: 'cli', name: 'cli', pkg: '@dvt/cli', patterns: ['packages/@dvt/cli/**'] },
];

export const CI_GLOBAL_PATTERNS = [
  '.github/workflows/**',
  ...ROOT_CONFIG_PATTERNS,
  'tsconfig*.json',
  'eslint.config.cjs',
  'commitlint.config.cjs',
  '.prettierrc.json',
  'scripts/**',
  'packages/@dvt/traceability-service/**',
  'traceability.config.json',
  'docs/adr/**',
];

export const TEST_SCOPE_PATTERNS = {
  engine: ['packages/@dvt/engine/**'],
  contracts: ['packages/@dvt/contracts/**'],
  adapter_postgres: ['packages/@dvt/adapter-postgres/**'],
  adapter_temporal: ['packages/@dvt/adapter-temporal/**'],
  cli: ['packages/@dvt/cli/**'],
  root_config: [...ROOT_CONFIG_PATTERNS, 'vitest.config.ts', 'tsconfig*.json', '.github/workflows/test.yml'],
};

export const CONTRACT_SCOPE_PATTERNS = {
  contracts_relevant: [
    'packages/@dvt/contracts/**',
    'packages/@dvt/engine/test/contracts/**',
    'docs/architecture/engine/contracts/**',
    'docs/decisions/**',
    '.golden/**',
    'scripts/compare-hashes.cjs',
    'scripts/db-migrate.cjs',
    'scripts/neo4j/**',
    'scripts/validate-contracts.cjs',
    '.github/workflows/contracts.yml',
    ...ROOT_CONFIG_PATTERNS,
  ],
  determinism_relevant: [
    'packages/@dvt/engine/**',
    'packages/@dvt/contracts/**',
    '.github/workflows/contracts.yml',
    ...ROOT_CONFIG_PATTERNS,
  ],
  golden_relevant: [
    'packages/@dvt/engine/test/contracts/**',
    'docs/architecture/engine/contracts/**',
    '.golden/**',
    'scripts/compare-hashes.cjs',
    'scripts/db-migrate.cjs',
    '.github/workflows/contracts.yml',
    'package.json',
    'pnpm-lock.yaml',
  ],
};

export const PR_QUALITY_SCOPE_PATTERNS = {
  temporal_changed: [
    'packages/@dvt/adapter-temporal/**',
    'packages/@dvt/engine/**',
    'packages/@dvt/contracts/**',
    ...ROOT_CONFIG_PATTERNS,
    '.github/workflows/pr-quality-gate.yml',
    '.github/workflows/test.yml',
  ],
};

function normalizePath(path) {
  return path.replaceAll('\\', '/');
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}

function globToRegExp(pattern) {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];

    if (current === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (current === '*') {
      source += '[^/]*';
      continue;
    }

    source += escapeRegexCharacter(current);
  }

  source += '$';
  return new RegExp(source);
}

function matchesPattern(path, pattern) {
  return globToRegExp(pattern).test(normalizePath(path));
}

export function matchesAnyPattern(path, patterns) {
  return patterns.some((pattern) => matchesPattern(path, pattern));
}

export function computeBooleanScope(changedFiles, scopePatterns) {
  const normalizedFiles = changedFiles.map(normalizePath);
  return Object.fromEntries(
    Object.entries(scopePatterns).map(([key, patterns]) => [
      key,
      normalizedFiles.some((path) => matchesAnyPattern(path, patterns)),
    ])
  );
}

export function computeWorkspaceMatrix(changedFiles) {
  const normalizedFiles = changedFiles.map(normalizePath);
  const globalChanged = normalizedFiles.some((path) => matchesAnyPattern(path, CI_GLOBAL_PATTERNS));
  const include = globalChanged
    ? WORKSPACE_ENTRIES.map(({ name, pkg }) => ({ name, pkg }))
    : WORKSPACE_ENTRIES.filter(({ patterns }) =>
        normalizedFiles.some((path) => matchesAnyPattern(path, patterns))
      ).map(({ name, pkg }) => ({ name, pkg }));

  return {
    anyChanged: include.length > 0,
    include,
  };
}

export async function getChangedFiles(baseRef, headRef) {
  if (!baseRef || !headRef) {
    throw new TypeError('BASE_AND_HEAD_REQUIRED');
  }

  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMR', baseRef, headRef],
    { encoding: 'utf8' }
  );

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(normalizePath);
}

export function setGitHubOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  const serialized = String(value);

  if (!outputPath) {
    process.stdout.write(`${name}=${serialized}\n`);
    return;
  }

  appendFileSync(outputPath, `${name}=${serialized}\n`, 'utf8');
}

export function isPullRequestEvent(eventName) {
  return eventName === 'pull_request';
}
