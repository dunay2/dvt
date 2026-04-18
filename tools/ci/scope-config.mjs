import { execFile } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ROOT_CONFIG_PATTERNS = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
];

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
    'workspace_lineage_worker',
    'workspace_outbox_worker',
    'workspace_projector_worker',
    'workspace_temporal_worker',
    'workspace_web',
    'workspace_artifacts',
    'workspace_crypto',
    'workspace_contracts',
    'workspace_delivery',
    'workspace_dsl',
    'workspace_engine',
    'workspace_observability',
    'workspace_observability_otel',
    'workspace_plan_interpreter',
    'workspace_plan_verifier',
    'workspace_planner',
    'workspace_planner_contracts',
    'workspace_run_domain',
    'workspace_state_store',
    'workspace_traceability_service',
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
  {
    key: 'lineage_worker',
    name: 'lineage-worker',
    pkg: 'dvt-lineage-worker',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_lineage_worker,
  },
  {
    key: 'outbox_worker',
    name: 'outbox-worker',
    pkg: 'dvt-outbox-worker',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_outbox_worker,
  },
  {
    key: 'projector_worker',
    name: 'projector-worker',
    pkg: 'dvt-projector-worker',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_projector_worker,
  },
  {
    key: 'temporal_worker',
    name: 'temporal-worker',
    pkg: 'dvt-temporal-worker',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_temporal_worker,
  },
  { key: 'web', name: 'web', pkg: '@dvt/web', patterns: WORKFLOW_SCOPE_POLICY.workspace_web },
  {
    key: 'artifacts',
    name: 'artifacts',
    pkg: '@dvt/artifacts',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_artifacts,
  },
  {
    key: 'crypto',
    name: 'crypto',
    pkg: '@dvt/crypto',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_crypto,
  },
  {
    key: 'contracts',
    name: 'contracts',
    pkg: '@dvt/contracts',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_contracts,
  },
  {
    key: 'delivery',
    name: 'delivery',
    pkg: '@dvt/delivery',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_delivery,
  },
  { key: 'dsl', name: 'dsl', pkg: '@dvt/dsl', patterns: WORKFLOW_SCOPE_POLICY.workspace_dsl },
  {
    key: 'engine',
    name: 'engine',
    pkg: '@dvt/engine',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_engine,
  },
  {
    key: 'observability',
    name: 'observability',
    pkg: '@dvt/observability',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_observability,
  },
  {
    key: 'observability_otel',
    name: 'observability-otel',
    pkg: '@dvt/observability-otel',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_observability_otel,
  },
  {
    key: 'plan_interpreter',
    name: 'plan-interpreter',
    pkg: '@dvt/plan-interpreter',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_plan_interpreter,
  },
  {
    key: 'plan_verifier',
    name: 'plan-verifier',
    pkg: '@dvt/plan-verifier',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_plan_verifier,
  },
  {
    key: 'planner',
    name: 'planner',
    pkg: '@dvt/planner',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_planner,
  },
  {
    key: 'planner_contracts',
    name: 'planner-contracts',
    pkg: '@dvt/planner-contracts',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_planner_contracts,
  },
  {
    key: 'run_domain',
    name: 'run-domain',
    pkg: '@dvt/run-domain',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_run_domain,
  },
  {
    key: 'state_store',
    name: 'state-store',
    pkg: '@dvt/state-store',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_state_store,
  },
  {
    key: 'traceability_service',
    name: 'traceability-service',
    pkg: '@dvt/traceability-service',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_traceability_service,
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
  any_test: [
    'apps/**',
    'packages/**',
    '.github/actions/setup-node-pnpm/**',
    '.github/scripts/**',
    '.github/workflows/test.yml',
    'tools/ci/**',
    'scripts/skip-pretest-if-ci.cjs',
    'scripts/skip-prebuild-if-orchestrated.cjs',
    'scripts/build-workspace-runtime-deps.cjs',
    ...ROOT_CONFIG_PATTERNS,
    'vitest.config.ts',
    'tsconfig*.json',
  ],
  engine: ['packages/@dvt/engine/**'],
  contracts: ['packages/@dvt/contracts/**'],
  adapter_temporal: ['packages/@dvt/adapter-temporal/**'],
  cli: ['packages/@dvt/cli/**'],
  api: ['apps/api/**'],
  lineage_worker: ['apps/lineage-worker/**'],
  outbox_worker: ['apps/outbox-worker/**'],
  projector_worker: ['apps/projector-worker/**'],
  temporal_worker: ['apps/temporal-worker/**'],
  web: ['apps/web/**'],
  artifacts: ['packages/@dvt/artifacts/**'],
  crypto: ['packages/@dvt/canonical/**'],
  delivery: ['packages/@dvt/delivery/**'],
  dsl: ['packages/@dvt/dsl/**'],
  observability: ['packages/@dvt/observability/**'],
  observability_otel: ['packages/@dvt/observability-otel/**'],
  plan_interpreter: ['packages/@dvt/plan-interpreter/**'],
  plan_verifier: ['packages/@dvt/plan-verifier/**'],
  planner: ['packages/@dvt/planner/**'],
  run_domain: ['packages/@dvt/run-domain/**'],
  state_store: ['packages/@dvt/state-store/**'],
  traceability_service: ['packages/@dvt/traceability-service/**'],
  root_config: [
    ...ROOT_CONFIG_PATTERNS,
    'vitest.config.ts',
    'tsconfig*.json',
    '.github/actions/setup-node-pnpm/**',
    '.github/scripts/**',
    '.github/workflows/test.yml',
    'tools/ci/**',
    'scripts/skip-pretest-if-ci.cjs',
    'scripts/skip-prebuild-if-orchestrated.cjs',
    'scripts/build-workspace-runtime-deps.cjs',
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
    'packages/@dvt/adapter-temporal/src/**',
    'packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts',
    'packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts',
    'packages/@dvt/adapter-temporal/test/helpers/**',
    'packages/@dvt/adapter-temporal/package.json',
    'packages/@dvt/engine/**',
    'packages/@dvt/contracts/**',
    'scripts/build-workspace-runtime-deps.cjs',
    'tools/ci/**',
    ...ROOT_CONFIG_PATTERNS,
    '.github/workflows/pr-quality-gate.yml',
    '.github/workflows/test.yml',
  ],
  temporal_transformation_changed: [
    'packages/@dvt/adapter-temporal/src/activities/**',
    'packages/@dvt/adapter-temporal/src/workflows/**',
    'packages/@dvt/adapter-temporal/src/index.ts',
    'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts',
    'packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts',
    'packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts',
    'packages/@dvt/adapter-temporal/test/helpers/**',
    'packages/@dvt/adapter-temporal/package.json',
    'packages/@dvt/engine/**',
    'packages/@dvt/contracts/**',
    'scripts/build-workspace-runtime-deps.cjs',
    'tools/ci/**',
    ...ROOT_CONFIG_PATTERNS,
    '.github/workflows/pr-quality-gate.yml',
    '.github/workflows/test.yml',
  ],
  temporal_postgres_changed: [
    'packages/@dvt/adapter-postgres/**',
    'packages/@dvt/adapter-temporal/src/activities/**',
    'packages/@dvt/adapter-temporal/src/workflows/**',
    'packages/@dvt/adapter-temporal/src/index.ts',
    'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts',
    'packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts',
    'packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts',
    'packages/@dvt/adapter-temporal/test/helpers/**',
    'packages/@dvt/adapter-temporal/package.json',
    'packages/@dvt/engine/**',
    'packages/@dvt/contracts/**',
    'scripts/build-workspace-runtime-deps.cjs',
    'tools/ci/**',
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
