import { execFile } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT_CONFIG_PATTERNS = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];

function readWorkflowScopePolicy() {
  const policyPath = new URL('./policy/workflow-scope.json', import.meta.url);
  const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
  const requiredKeys = [
    'any_code',
    'docs_changed',
    'docs_structure_changed',
    'lane_yaml_changed',
    'generated_status_relevant',
    'generated_capability_relevant',
    'workspace_global',
    'workspace_api',
    'workspace_web',
    'workspace_contracts',
    'workspace_engine',
    'workspace_adapter_postgres',
    'workspace_adapter_temporal',
    'workspace_cli',
  ];

  for (const key of requiredKeys) {
    if (!Array.isArray(policy[key])) {
      throw new TypeError(`Invalid workflow scope policy: ${key} must be an array of patterns`);
    }
  }

  return policy;
}

function readAdapterPostgresPolicy() {
  const policyPath = new URL('./policy/adapter-postgres-relevance.json', import.meta.url);
  const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

  if (!Array.isArray(policy.adapter_postgres_relevant)) {
    throw new TypeError(
      'Invalid adapter-postgres policy: adapter_postgres_relevant must be an array of patterns'
    );
  }

  return policy;
}

const WORKFLOW_SCOPE_POLICY = readWorkflowScopePolicy();
const ADAPTER_POSTGRES_POLICY = readAdapterPostgresPolicy();
export const ADAPTER_POSTGRES_RELEVANT_PATTERNS = ADAPTER_POSTGRES_POLICY.adapter_postgres_relevant;

export const WORKFLOW_SCOPE_PATTERNS = {
  any_code: WORKFLOW_SCOPE_POLICY.any_code,
  docs_changed: WORKFLOW_SCOPE_POLICY.docs_changed,
  docs_structure_changed: WORKFLOW_SCOPE_POLICY.docs_structure_changed,
  lane_yaml_changed: WORKFLOW_SCOPE_POLICY.lane_yaml_changed,
  generated_status_relevant: WORKFLOW_SCOPE_POLICY.generated_status_relevant,
  generated_capability_relevant: WORKFLOW_SCOPE_POLICY.generated_capability_relevant,
};

export const WORKSPACE_ENTRIES = [
  { key: 'api', name: 'api', pkg: 'dvt-api', patterns: WORKFLOW_SCOPE_POLICY.workspace_api },
  { key: 'web', name: 'web', pkg: '@dvt/web', patterns: WORKFLOW_SCOPE_POLICY.workspace_web },
  {
    key: 'contracts',
    name: 'contracts',
    pkg: '@dvt/contracts',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_contracts,
  },
  {
    key: 'engine',
    name: 'engine',
    pkg: '@dvt/engine',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_engine,
  },
  {
    key: 'adapter_postgres',
    name: 'adapter-postgres',
    pkg: '@dvt/adapter-postgres',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_adapter_postgres,
  },
  {
    key: 'adapter_temporal',
    name: 'adapter-temporal',
    pkg: '@dvt/adapter-temporal',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_adapter_temporal,
  },
  { key: 'cli', name: 'cli', pkg: '@dvt/cli', patterns: WORKFLOW_SCOPE_POLICY.workspace_cli },
];

export const CI_GLOBAL_PATTERNS = WORKFLOW_SCOPE_POLICY.workspace_global;

export const TEST_SCOPE_PATTERNS = {
  engine: ['packages/@dvt/engine/**'],
  contracts: ['packages/@dvt/contracts/**'],
  adapter_postgres: ['packages/@dvt/adapter-postgres/**'],
  adapter_temporal: ['packages/@dvt/adapter-temporal/**'],
  cli: ['packages/@dvt/cli/**'],
  root_config: [
    ...ROOT_CONFIG_PATTERNS,
    'vitest.config.ts',
    'tsconfig*.json',
    '.github/workflows/test.yml',
  ],
};

export const CONTRACT_SCOPE_PATTERNS = {
  contracts_relevant: [
    'packages/@dvt/contracts/**',
    'packages/@dvt/engine/test/contracts/**',
    'docs/architecture/engine/contracts/**',
    'docs/adr/**',
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
    'packages/@dvt/adapter-postgres/**',
    'packages/@dvt/engine/**',
    'packages/@dvt/contracts/**',
    ...ROOT_CONFIG_PATTERNS,
    '.github/workflows/pr-quality-gate.yml',
    '.github/workflows/test.yml',
  ],
  adapter_postgres_changed: ADAPTER_POSTGRES_RELEVANT_PATTERNS,
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
