/**
 * @ownedConcern Compute repository CI scope read models from governed path policies and command semantics.
 */
import { execFile } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import {
  classifyPackageScriptCommand,
  isGovernanceToolingCommand,
} from './repository-command-catalog.mjs';
import { classifyRepositoryFileScope } from './repository-change-scope.mjs';

const execFileAsync = promisify(execFile);

const ROOT_CONFIG_PATTERNS = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
];

const SHARED_CI_ACTION_PATTERNS = ['.github/actions/setup-node-pnpm/**'];

const CI_SCOPE_FETCH_ACTION_PATTERNS = ['.github/actions/fetch-scope-base/**'];

function readWorkflowScopePolicy() {
  const policyPath = new URL('./policy/workflow-scope.json', import.meta.url);
  const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
  const requiredKeys = [
    'any_code',
    'docs_changed',
    'docs_structure_changed',
    'generated_status_relevant',
    'generated_capability_relevant',
    'changed_file_validation_relevant',
    'security_analysis_relevant',
    'ci_tool_executable_contracts_relevant',
    'workspace_global',
    'workspace_api',
    'workspace_lineage_worker',
    'workspace_outbox_worker',
    'workspace_projector_worker',
    'workspace_temporal_worker',
    'workspace_temporal_dbt_plugin',
    'workspace_temporal_http_json_plugin',
    'workspace_temporal_object_file_postgres_plugin',
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
const ENGINE_WORKSPACE_PATTERNS = WORKFLOW_SCOPE_POLICY.workspace_engine;
export const ADAPTER_POSTGRES_RELEVANT_PATTERNS = ADAPTER_POSTGRES_POLICY.adapter_postgres_relevant;

export const WORKFLOW_SCOPE_PATTERNS = {
  any_code: WORKFLOW_SCOPE_POLICY.any_code,
  docs_changed: WORKFLOW_SCOPE_POLICY.docs_changed,
  docs_structure_changed: WORKFLOW_SCOPE_POLICY.docs_structure_changed,
  generated_status_relevant: WORKFLOW_SCOPE_POLICY.generated_status_relevant,
  generated_capability_relevant: WORKFLOW_SCOPE_POLICY.generated_capability_relevant,
  changed_file_validation_relevant: WORKFLOW_SCOPE_POLICY.changed_file_validation_relevant,
  security_analysis_relevant: WORKFLOW_SCOPE_POLICY.security_analysis_relevant,
  ci_tool_executable_contracts_relevant:
    WORKFLOW_SCOPE_POLICY.ci_tool_executable_contracts_relevant,
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
  {
    key: 'temporal_dbt_plugin',
    name: 'temporal-dbt-plugin',
    pkg: '@dvt/temporal-dbt-plugin',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_temporal_dbt_plugin,
  },
  {
    key: 'temporal_http_json_plugin',
    name: 'temporal-http-json-plugin',
    pkg: '@dvt/temporal-http-json-plugin',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_temporal_http_json_plugin,
  },
  {
    key: 'temporal_object_file_postgres_plugin',
    name: 'temporal-object-file-postgres-plugin',
    pkg: '@dvt/temporal-object-file-postgres-plugin',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_temporal_object_file_postgres_plugin,
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
    patterns: ENGINE_WORKSPACE_PATTERNS,
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
  {
    key: 'cli',
    name: 'cli',
    pkg: '@dvt/cli',
    patterns: WORKFLOW_SCOPE_POLICY.workspace_cli,
  },
];

export const CI_GLOBAL_PATTERNS = WORKFLOW_SCOPE_POLICY.workspace_global;

const TEST_ROOT_BUILD_PATTERNS = [
  ...ROOT_CONFIG_PATTERNS,
  'vitest.config.ts',
  'tsconfig*.json',
  ...SHARED_CI_ACTION_PATTERNS,
  '.github/scripts/**',
  'scripts/skip-pretest-if-ci.cjs',
  'scripts/skip-prebuild-if-orchestrated.cjs',
  'scripts/build-workspace-runtime-deps.cjs',
];

const TEST_DETERMINISM_PATTERNS = [
  ...ENGINE_WORKSPACE_PATTERNS,
  'packages/@dvt/contracts/**',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
];

const TEST_COVERAGE_PATTERNS = [
  ...ENGINE_WORKSPACE_PATTERNS,
  'packages/@dvt/contracts/**',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'vitest.config.ts',
  'tsconfig*.json',
];

const WEB_FRONTEND_TEST_GOVERNANCE_PATTERNS = [
  'docs/architecture/components/web/frontend-test-governance-*.md',
  'docs/architecture/components/web/index.md',
  'buzon/20260518-f14-fowler-frontend-test-governance-analysis.md',
];

const PR_QUALITY_ROOT_BUILD_PATTERNS = [
  ...ROOT_CONFIG_PATTERNS,
  'vitest.config.ts',
  'tsconfig*.json',
  ...SHARED_CI_ACTION_PATTERNS,
  '.github/scripts/**',
  'scripts/build-workspace-runtime-deps.cjs',
];

const PR_QUALITY_CI_TOOLING_PATTERNS = [
  'tools/ci/**',
  ...CI_SCOPE_FETCH_ACTION_PATTERNS,
  ...SHARED_CI_ACTION_PATTERNS,
  '.github/scripts/**',
  '.github/workflows/**',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
];

const PR_QUALITY_GOVERNANCE_TOOLING_PATTERNS = [
  'docs/planning/**',
  'docs/guides/**',
  'scripts/planning-*.cjs',
  'scripts/governance-*.cjs',
  'tools/docs/**',
  'package.json',
];

export const TEST_SCOPE_PATTERNS = {
  any_test: [
    'apps/**',
    'packages/**',
    ...SHARED_CI_ACTION_PATTERNS,
    '.github/scripts/**',
    'tools/ci/**',
    'scripts/skip-pretest-if-ci.cjs',
    'scripts/skip-prebuild-if-orchestrated.cjs',
    'scripts/build-workspace-runtime-deps.cjs',
    ...WEB_FRONTEND_TEST_GOVERNANCE_PATTERNS,
    ...ROOT_CONFIG_PATTERNS,
    'vitest.config.ts',
    'tsconfig*.json',
  ],
  engine: ENGINE_WORKSPACE_PATTERNS,
  contracts: ['packages/@dvt/contracts/**'],
  adapter_temporal: ['packages/@dvt/adapter-temporal/**'],
  cli: ['packages/@dvt/cli/**'],
  api: ['apps/api/**'],
  lineage_worker: ['apps/lineage-worker/**'],
  outbox_worker: ['apps/outbox-worker/**'],
  projector_worker: ['apps/projector-worker/**'],
  temporal_worker: ['apps/temporal-worker/**'],
  temporal_dbt_plugin: ['packages/@dvt/temporal-dbt-plugin/**'],
  temporal_http_json_plugin: WORKFLOW_SCOPE_POLICY.workspace_temporal_http_json_plugin,
  temporal_object_file_postgres_plugin:
    WORKFLOW_SCOPE_POLICY.workspace_temporal_object_file_postgres_plugin,
  web: ['apps/web/**', ...WEB_FRONTEND_TEST_GOVERNANCE_PATTERNS],
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
  root_config: TEST_ROOT_BUILD_PATTERNS,
  root_build_sensitive: TEST_ROOT_BUILD_PATTERNS,
  postgres_capability_changed: ADAPTER_POSTGRES_RELEVANT_PATTERNS,
  determinism_relevant: TEST_DETERMINISM_PATTERNS,
  coverage_relevant: TEST_COVERAGE_PATTERNS,
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
  hash_compare_relevant: [
    'packages/@dvt/engine/test/contracts/**',
    'docs/architecture/engine/contracts/**',
    '.golden/**',
    'scripts/compare-hashes.cjs',
    'scripts/db-migrate.cjs',
    '.github/workflows/contracts.yml',
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
    ...ROOT_CONFIG_PATTERNS,
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
    ...ROOT_CONFIG_PATTERNS,
  ],
  temporal_postgres_changed: [
    'apps/temporal-worker/**',
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
    'packages/@dvt/temporal-object-file-postgres-plugin/**',
    'scripts/build-workspace-runtime-deps.cjs',
    ...ROOT_CONFIG_PATTERNS,
  ],
  adapter_postgres_changed: ADAPTER_POSTGRES_RELEVANT_PATTERNS,
  root_build_sensitive: PR_QUALITY_ROOT_BUILD_PATTERNS,
  ci_tooling_changed: PR_QUALITY_CI_TOOLING_PATTERNS,
  governance_tooling_changed: PR_QUALITY_GOVERNANCE_TOOLING_PATTERNS,
  postgres_capability_changed: ADAPTER_POSTGRES_RELEVANT_PATTERNS,
};

export const SCOPE_MODES = {
  contracts: CONTRACT_SCOPE_PATTERNS,
  'pr-quality': PR_QUALITY_SCOPE_PATTERNS,
  test: TEST_SCOPE_PATTERNS,
  workflow: WORKFLOW_SCOPE_PATTERNS,
};

const EXCLUDED_TEST_PACKAGE_NAMES = new Set([
  '@dvt/adapter-postgres',
  '@dvt/adapter-temporal',
  '@dvt/web',
]);

export const TEST_PACKAGE_ENTRIES = WORKSPACE_ENTRIES.filter(
  ({ pkg }) => !EXCLUDED_TEST_PACKAGE_NAMES.has(pkg)
).map(({ key, name, pkg }) => ({
  key,
  name,
  pkg,
  command: `pnpm --filter ${pkg} ${pkg === 'dvt-api' ? 'test:ci' : 'test'}`,
}));

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

function stripScripts(packageJson) {
  const rest = { ...(packageJson ?? {}) };
  delete rest.scripts;
  return rest;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function isRuntimeFanoutCommand(commandClass) {
  return (
    commandClass.runtimeFanout === true ||
    commandClass.domain === 'runtime-capability' ||
    commandClass.domain === 'unknown'
  );
}

function isLifecycleScript(name) {
  return /^(pre|post)?(install|pack|publish|version)$/u.test(name) || name === 'prepare';
}

function isDeterminismJobScript(name) {
  return name === 'lint:determinism' || name === 'test:determinism' || name === 'test:replay';
}

export function classifyPackageJsonChange(previousPackageJson, nextPackageJson) {
  const previousScripts = previousPackageJson?.scripts ?? {};
  const nextScripts = nextPackageJson?.scripts ?? {};
  const changedScriptNames = [
    ...new Set([...Object.keys(previousScripts), ...Object.keys(nextScripts)]),
  ]
    .filter((name) => previousScripts[name] !== nextScripts[name])
    .sort((left, right) => left.localeCompare(right));
  const commandClasses = changedScriptNames.map((name) =>
    classifyPackageScriptCommand(name, nextScripts[name] ?? previousScripts[name] ?? '')
  );
  const nonScriptChange =
    stableJson(stripScripts(previousPackageJson)) !== stableJson(stripScripts(nextPackageJson));
  const dependencySensitive = nonScriptChange;
  const lifecycleSensitive = changedScriptNames.some(isLifecycleScript);
  const rootBuildSensitive =
    nonScriptChange ||
    lifecycleSensitive ||
    commandClasses.some((commandClass) => isRuntimeFanoutCommand(commandClass));
  const governanceToolingOnly =
    !rootBuildSensitive &&
    commandClasses.length > 0 &&
    commandClasses.every((commandClass) => isGovernanceToolingCommand(commandClass));

  return {
    changedScriptNames,
    commandClasses,
    nonScriptChange,
    packageScriptsOnly: changedScriptNames.length > 0 && !nonScriptChange,
    dependencySensitive,
    lifecycleSensitive,
    rootBuildSensitive,
    governanceToolingOnly,
    ciToolingSensitive: commandClasses.some((commandClass) =>
      ['ci-tooling', 'developer-workflow', 'test-tooling'].includes(commandClass.domain)
    ),
    determinismSensitive: changedScriptNames.some(isDeterminismJobScript),
    temporalCapabilitySensitive: commandClasses.some(
      (commandClass) => commandClass.domain === 'runtime-capability'
    ),
    postgresCapabilitySensitive: commandClasses.some(
      (commandClass) => commandClass.domain === 'runtime-capability'
    ),
    contractCapabilitySensitive: commandClasses.some(
      (commandClass) => commandClass.domain === 'contracts'
    ),
  };
}

function isSemanticallyNarrowPackageJson(scopeContext) {
  return scopeContext?.packageJsonChange?.rootBuildSensitive === false;
}

function buildFilesForPathPolicy(changedFiles, scopeContext) {
  const normalizedFiles = changedFiles.map(normalizePath);
  return isSemanticallyNarrowPackageJson(scopeContext)
    ? normalizedFiles.filter((path) => path !== 'package.json')
    : normalizedFiles;
}

function computeRepositoryValidationScope(changedFiles, scopeContext = {}) {
  const fileScopes = buildFilesForPathPolicy(changedFiles, scopeContext).map((path) =>
    classifyRepositoryFileScope(path)
  );

  return {
    planning_db_inventory_relevant: fileScopes.some((scope) => scope.planningDbInventoryRelevant),
    governance_global_relevant: fileScopes.some((scope) => scope.governanceGlobalRelevant),
    feature_mechanization_relevant: fileScopes.some((scope) => scope.featureMechanizationRelevant),
    traceability_adr0_relevant: fileScopes.some((scope) => scope.traceabilityRelevant),
    code_validation_relevant: fileScopes.some((scope) => scope.codeValidationRelevant),
    runtimeWorkspaceFanout: fileScopes.some((scope) => scope.runtimeWorkspaceFanout),
  };
}

export function computeBooleanScope(changedFiles, scopePatterns, scopeContext = {}) {
  const normalizedFiles = buildFilesForPathPolicy(changedFiles, scopeContext);
  const scope = Object.fromEntries(
    Object.entries(scopePatterns).map(([key, patterns]) => [
      key,
      normalizedFiles.some((path) => matchesAnyPattern(path, patterns)),
    ])
  );

  if (changedFiles.map(normalizePath).includes('package.json')) {
    if ('changed_file_validation_relevant' in scope) {
      scope.changed_file_validation_relevant = true;
    }
  }

  return scope;
}

export function computeWorkflowModeScopeOutputs(mode, changedFiles, scopeContext = {}) {
  const scopePatterns = SCOPE_MODES[mode];
  if (!scopePatterns) {
    throw new TypeError(`UNSUPPORTED_MODE: ${mode ?? 'undefined'}`);
  }

  const scope = computeBooleanScope(changedFiles, scopePatterns, scopeContext);
  const { runtimeWorkspaceFanout, ...repositoryValidationScope } = computeRepositoryValidationScope(
    changedFiles,
    scopeContext
  );
  const packageJsonChange = scopeContext.packageJsonChange;

  if (mode === 'contracts') {
    return {
      ...scope,
      contracts_relevant: Boolean(
        scope.contracts_relevant || packageJsonChange?.contractCapabilitySensitive
      ),
      determinism_relevant: Boolean(
        scope.determinism_relevant || packageJsonChange?.determinismSensitive
      ),
      contract_capability_changed: Boolean(
        scope.contracts_relevant ||
        scope.determinism_relevant ||
        scope.golden_relevant ||
        packageJsonChange?.contractCapabilitySensitive
      ),
      hash_compare_relevant: Boolean(scope.hash_compare_relevant),
    };
  }

  if (mode === 'pr-quality') {
    return {
      ...scope,
      ...repositoryValidationScope,
      temporal_changed: Boolean(scope.temporal_changed || runtimeWorkspaceFanout),
      temporal_transformation_changed: Boolean(
        scope.temporal_transformation_changed || runtimeWorkspaceFanout
      ),
      temporal_postgres_changed: Boolean(scope.temporal_postgres_changed || runtimeWorkspaceFanout),
      root_build_sensitive: Boolean(
        scope.root_build_sensitive ||
        runtimeWorkspaceFanout ||
        packageJsonChange?.rootBuildSensitive
      ),
      ci_tooling_changed: Boolean(
        scope.ci_tooling_changed || packageJsonChange?.ciToolingSensitive
      ),
      governance_tooling_changed: Boolean(
        scope.governance_tooling_changed || packageJsonChange?.governanceToolingOnly
      ),
      temporal_capability_changed: Boolean(
        scope.temporal_changed ||
        scope.temporal_transformation_changed ||
        scope.temporal_postgres_changed ||
        runtimeWorkspaceFanout ||
        packageJsonChange?.temporalCapabilitySensitive
      ),
      postgres_capability_changed: Boolean(
        scope.postgres_capability_changed ||
        scope.adapter_postgres_changed ||
        scope.temporal_postgres_changed ||
        runtimeWorkspaceFanout ||
        packageJsonChange?.postgresCapabilitySensitive
      ),
    };
  }

  if (mode === 'test') {
    return {
      ...scope,
      root_build_sensitive: Boolean(
        scope.root_build_sensitive ||
        scope.root_config ||
        runtimeWorkspaceFanout ||
        packageJsonChange?.rootBuildSensitive
      ),
      postgres_capability_changed: Boolean(
        scope.postgres_capability_changed || packageJsonChange?.postgresCapabilitySensitive
      ),
      determinism_relevant: Boolean(
        scope.determinism_relevant ||
        packageJsonChange?.determinismSensitive ||
        packageJsonChange?.rootBuildSensitive
      ),
      coverage_relevant: Boolean(scope.coverage_relevant || packageJsonChange?.rootBuildSensitive),
    };
  }

  return {
    ...scope,
    ...repositoryValidationScope,
    security_analysis_relevant: Boolean(
      scope.security_analysis_relevant ||
      packageJsonChange?.dependencySensitive ||
      packageJsonChange?.lifecycleSensitive ||
      packageJsonChange?.rootBuildSensitive ||
      packageJsonChange?.ciToolingSensitive
    ),
    ci_tool_executable_contracts_relevant: Boolean(
      scope.ci_tool_executable_contracts_relevant ||
      packageJsonChange?.dependencySensitive ||
      packageJsonChange?.ciToolingSensitive ||
      packageJsonChange?.governanceToolingOnly
    ),
  };
}

export function parseScopeMode(argv) {
  const modeFlagIndex = argv.indexOf('--mode');
  if (modeFlagIndex === -1) {
    throw new TypeError('MODE_REQUIRED');
  }

  const mode = argv[modeFlagIndex + 1];
  if (!mode || !(mode in SCOPE_MODES)) {
    throw new TypeError(`UNSUPPORTED_MODE: ${mode ?? 'undefined'}`);
  }

  return mode;
}

export function computeWorkspaceMatrix(changedFiles, options = {}) {
  const normalizedFiles = changedFiles.map(normalizePath);
  const packageJsonChanged = normalizedFiles.includes('package.json');
  const packageJsonRootSensitive =
    packageJsonChanged &&
    (!options.packageJsonChange || options.packageJsonChange.rootBuildSensitive === true);
  const filesForPathPolicy = normalizedFiles.filter((path) => path !== 'package.json');
  const fileScopes = filesForPathPolicy.map((path) => classifyRepositoryFileScope(path));
  const nonCommandFiles = fileScopes
    .filter((scope) => !scope.repositoryCommandFile)
    .map((scope) => scope.path);
  const runtimeFanoutScriptChanged = fileScopes.some((scope) => scope.runtimeWorkspaceFanout);
  const globalChanged =
    packageJsonRootSensitive ||
    runtimeFanoutScriptChanged ||
    nonCommandFiles.some((path) => matchesAnyPattern(path, CI_GLOBAL_PATTERNS));
  const include = globalChanged
    ? WORKSPACE_ENTRIES.map(({ name, pkg }) => ({ name, pkg }))
    : WORKSPACE_ENTRIES.filter(({ patterns }) =>
        filesForPathPolicy.some((path) => matchesAnyPattern(path, patterns))
      ).map(({ name, pkg }) => ({ name, pkg }));

  return {
    anyChanged: include.length > 0,
    include,
  };
}

export function computeTestPackageMatrix(changedFiles, options = {}) {
  const scope = computeWorkflowModeScopeOutputs('test', changedFiles, options);
  const include = scope.root_build_sensitive
    ? TEST_PACKAGE_ENTRIES
    : TEST_PACKAGE_ENTRIES.filter(
        ({ key }) => scope[key] || (key === 'planner' && scope.contracts)
      );

  return {
    anyTests: include.length > 0,
    include,
  };
}

export async function readJsonAtGitRef(ref, filePath) {
  const { stdout } = await execFileAsync('git', ['show', `${ref}:${filePath}`], {
    encoding: 'utf8',
  });
  return JSON.parse(stdout);
}

function failClosedPackageJsonChange(error) {
  return {
    changedScriptNames: [],
    commandClasses: [],
    nonScriptChange: true,
    packageScriptsOnly: false,
    dependencySensitive: true,
    lifecycleSensitive: true,
    rootBuildSensitive: true,
    governanceToolingOnly: false,
    ciToolingSensitive: true,
    temporalCapabilitySensitive: true,
    postgresCapabilitySensitive: true,
    contractCapabilitySensitive: true,
    failClosed: true,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function readRootPackageJsonChange(baseRef, headRef, options = {}) {
  const readJsonAtRef = options.readJsonAtRef ?? readJsonAtGitRef;
  try {
    const [previousPackageJson, nextPackageJson] = await Promise.all([
      readJsonAtRef(baseRef, 'package.json'),
      readJsonAtRef(headRef, 'package.json'),
    ]);
    return classifyPackageJsonChange(previousPackageJson, nextPackageJson);
  } catch (error) {
    return failClosedPackageJsonChange(error);
  }
}

export async function buildChangedScopeContext(changedFiles, options = {}) {
  const normalizedFiles = changedFiles.map(normalizePath);
  if (!normalizedFiles.includes('package.json')) {
    return {};
  }

  const baseRef = options.baseRef;
  const headRef = options.headRef;
  if (!baseRef || !headRef) {
    return {
      packageJsonChange: failClosedPackageJsonChange('BASE_AND_HEAD_REQUIRED'),
    };
  }

  return {
    packageJsonChange: await readRootPackageJsonChange(baseRef, headRef, options),
  };
}

export async function getChangedFiles(baseRef, headRef) {
  if (!baseRef || !headRef) {
    throw new TypeError('BASE_AND_HEAD_REQUIRED');
  }

  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMRD', baseRef, headRef],
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
