#!/usr/bin/env node
/**
 * Owned concern: boot a live protected-runtime browser proof lane for selected closure.
 * @baseline GH-3594: outbox admission stays enforced against the disposable proof database.
 * @decision Validate the literal spec list before allocation and execute it in one owned runtime.
 * @consequence Outbox delivery, readiness and cleanup stay real; incomplete evidence rejects.
 * @version 1.0.0
 */
const { spawnSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const { mkdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');
const yaml = require('js-yaml');
const { spawnLiveProofProcess, terminateLiveProofProcess } = require('./live-proof-process.cjs');
const { validateCypressProofSpecs } = require('./run-selected-closure-cypress.cjs');
const {
  allocateDisposablePostgresDatabase,
  installDisposablePostgresInterruptCleanup,
} = require('./disposable-postgres-database.cjs');

const {
  buildCoordinatedTemporalWorkerEnv,
  buildLocalDbtArtifactEnv,
  ensureLocalWarehouseConnectionViaApi,
  prepareTemporalWorkerRuntimeDependencies,
  resolveDatabaseUrl,
  resolvePostgresCredentialBindings,
  seedLocalPostgresProofData,
  shouldBootstrapLocalPostgres,
  waitForUrlOrProcessExit,
} = require('./run-dev-stack.cjs');
const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  seedLocalProtectedRuntimeGrant,
  startLocalProtectedRuntimeAuth,
} = require('./run-dev-stack.auth.cjs');
const { allocateFreePort, buildTemporalApiEnv } = require('./run-dev-stack.temporal.cjs');

const PNPM_COMMAND = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const DEFAULT_API_PORT = 3300;
const DEFAULT_WEB_PORT = 4174;
const DEFAULT_READY_TIMEOUT_MS = 240_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const READINESS_RECEIPT_TIMEOUT_MS = 5_000;
const POSTGRES_BOOTSTRAP_SCRIPT = path.resolve(__dirname, 'run-local-postgres.cjs');
const WORKSPACE_RUNTIME_BUILD_SCRIPT = path.resolve(__dirname, 'build-workspace-runtime-deps.cjs');
const TEMPORAL_PACKAGE_ROOT = path.resolve(__dirname, '../packages/@dvt/adapter-temporal');
const DEFAULT_SPEC_RELATIVE_PATH =
  'apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts';
const CYPRESS_IMAGE = 'cypress/included:15.18.1';
const LOCAL_AUTH_HOST = '127.0.0.1';
const API_BIND_HOST = '0.0.0.0';
const WEB_BIND_HOST = '0.0.0.0';
const SELECTED_CLOSURE_LIVE_PROOF_ROOT = path.resolve(
  __dirname,
  '../.dvt/live-proofs/selected-closure'
);
const LIVE_PROOF_DBT_PROFILE = 'dvt_live_proof';
const GENERATED_CANVAS_DBT_PROFILE = 'default';
const LOCAL_TEMPORAL_TEST_SERVER_ROOT = path.resolve(__dirname, '../.dvt/temporal-test-server');

function allocateLiveProofSchema() {
  return `dvt_live_selected_closure_${Date.now()}_${process.pid}`;
}

function pipePrefixedOutput(stream, prefix) {
  const lineReader = readline.createInterface({ input: stream });
  lineReader.on('line', (line) => {
    console.log(`${prefix} ${line}`);
  });
  return lineReader;
}

function spawnProcess(name, args, envOverrides = {}) {
  const handle = spawnLiveProofProcess(name, PNPM_COMMAND, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...envOverrides },
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  const { child } = handle;

  return {
    ...handle,
    stdoutReader: pipePrefixedOutput(child.stdout, `[${name}]`),
    stderrReader: pipePrefixedOutput(child.stderr, `[${name}]`),
  };
}

function ensureLocalPostgresReady(shouldBootstrap) {
  if (!shouldBootstrap) {
    return;
  }

  const result = spawnSync(process.execPath, [POSTGRES_BOOTSTRAP_SCRIPT, 'up'], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Local Postgres bootstrap failed with exit code ${result.status}`);
  }
}

function resolveLiveProofDatabaseUrl(sourceEnv = process.env) {
  const options = { skipPostgres: false };
  return {
    databaseUrl: resolveDatabaseUrl(options, sourceEnv),
    shouldBootstrap: shouldBootstrapLocalPostgres(options, sourceEnv),
  };
}

async function loadTemporalTesting() {
  const temporalTestingEntry = require.resolve('@temporalio/testing', {
    paths: [TEMPORAL_PACKAGE_ROOT],
  });

  return import(pathToFileURL(temporalTestingEntry).href);
}

function resolveLiveProofTemporalTestServerPath(sourceEnv = process.env) {
  const configuredPath = readNonEmptyEnv(sourceEnv.DVT_TEMPORAL_TEST_SERVER_PATH);
  if (configuredPath !== undefined) {
    return configuredPath;
  }
  if (!existsSync(LOCAL_TEMPORAL_TEST_SERVER_ROOT)) {
    return undefined;
  }

  return readdirSync(LOCAL_TEMPORAL_TEST_SERVER_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^temporal-test-server.*\.exe$/u.test(entry.name))
    .map((entry) => path.join(LOCAL_TEMPORAL_TEST_SERVER_ROOT, entry.name))
    .sort()
    .at(-1);
}

function buildLiveProofTemporalTimeSkippingOptions(sourceEnv = process.env) {
  const executablePath = resolveLiveProofTemporalTestServerPath(sourceEnv);
  return executablePath === undefined
    ? undefined
    : {
        server: {
          executable: {
            type: 'existing-path',
            path: executablePath,
          },
        },
      };
}

async function closeReaders(processHandle) {
  processHandle.stdoutReader?.close();
  processHandle.stderrReader?.close();
}

function readNonEmptyEnv(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function discoverLiveProofDbtExecutable(sourceEnv = process.env) {
  const lookup = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['dbt'], {
    encoding: 'utf8',
    env: sourceEnv,
    windowsHide: true,
  });
  const commandPath = readNonEmptyEnv(lookup.stdout)?.split(/\r?\n/u)[0];
  if (lookup.status === 0 && commandPath !== undefined) return commandPath;

  const pythonCommand =
    readNonEmptyEnv(sourceEnv.PYTHON) ?? (process.platform === 'win32' ? 'python.exe' : 'python3');
  const userScripts = spawnSync(
    pythonCommand,
    [
      '-c',
      `import sysconfig; print(sysconfig.get_path('scripts', scheme='${process.platform === 'win32' ? 'nt_user' : 'posix_user'}'))`,
    ],
    { encoding: 'utf8', env: sourceEnv, windowsHide: true }
  );
  const scriptsDirectory = readNonEmptyEnv(userScripts.stdout);
  if (userScripts.status !== 0 || scriptsDirectory === undefined) return undefined;

  const candidate = path.join(scriptsDirectory, process.platform === 'win32' ? 'dbt.exe' : 'dbt');
  return existsSync(candidate) ? candidate : undefined;
}

function resolveLiveProofDbtExecutable(
  sourceEnv = process.env,
  discover = discoverLiveProofDbtExecutable
) {
  const analyzerExecutable = readNonEmptyEnv(sourceEnv.DVT_DBT_ANALYZER_BIN);
  const workerExecutable = readNonEmptyEnv(sourceEnv.DVT_DBT_BIN);
  if (
    analyzerExecutable !== undefined &&
    workerExecutable !== undefined &&
    analyzerExecutable !== workerExecutable
  ) {
    throw new Error(
      'Selected-closure live proof requires API and worker to use the same dbt executable.'
    );
  }

  const executable = analyzerExecutable ?? workerExecutable ?? discover(sourceEnv);
  if (executable === undefined) {
    throw new Error(
      'Selected-closure live proof requires a real dbt executable. Configure DVT_DBT_BIN or install dbt-postgres.'
    );
  }
  return executable;
}

function resolveLiveProofSpecPaths(argv = process.argv.slice(2)) {
  if (argv.length === 0) {
    return [`/repo/${DEFAULT_SPEC_RELATIVE_PATH}`];
  }

  if (argv.length !== 2 || argv[0] !== '--spec' || readNonEmptyEnv(argv[1]) === undefined) {
    throw new Error(
      'Usage: run-selected-closure-live-proof.cjs [--spec apps/web/cypress/e2e/<path>.cy.ts,...]'
    );
  }

  const relativeSpecPaths = argv[1].trim().replaceAll('\\', '/').split(',');
  if (relativeSpecPaths.some((spec) => !spec.startsWith('apps/web/cypress/e2e/'))) {
    throw new Error('Live proof spec must stay inside apps/web/cypress/e2e.');
  }
  validateCypressProofSpecs(relativeSpecPaths.map((spec) => spec.slice('apps/web/'.length)));
  return relativeSpecPaths.map((spec) => `/repo/${spec}`);
}

function buildLiveProofCypressJunctionMirror(repoRoot, deps = {}) {
  const platform = deps.platform ?? process.platform;
  if (platform !== 'win32') {
    return [];
  }

  const absoluteRepoRoot = path.win32.resolve(repoRoot);
  const driveMatch = /^([A-Za-z]):\\(.*)$/.exec(absoluteRepoRoot);
  if (driveMatch == null) {
    throw new Error('Cypress live proof requires a drive-qualified Windows repository path.');
  }

  const normalizedRepoRoot = absoluteRepoRoot.replaceAll('\\', '/');
  const junctionTargetRoot = `/mnt/host/${driveMatch[1].toLowerCase()}/${driveMatch[2].replaceAll('\\', '/')}`;
  return ['-v', `${normalizedRepoRoot}:${junctionTargetRoot}:ro`];
}

function buildLiveProofCypressDockerInvocation(
  args,
  repoRoot = path.resolve(__dirname, '..'),
  deps = {}
) {
  const normalizedRepoRoot = repoRoot.replaceAll('\\', '/');
  const junctionMirror = buildLiveProofCypressJunctionMirror(repoRoot, deps);

  return [
    'run',
    '--rm',
    '-t',
    '-v',
    `${normalizedRepoRoot}:/repo`,
    ...junctionMirror,
    '-w',
    '/repo/apps/web',
    '-e',
    'CYPRESS_baseUrl',
    '-e',
    'CYPRESS_apiBaseUrl',
    '-e',
    'CYPRESS_apiBearerToken',
    ...(args.restrictedApiBearerToken === undefined
      ? []
      : ['-e', 'CYPRESS_restrictedApiBearerToken']),
    '-e',
    'CYPRESS_workspaceTenantId',
    '-e',
    'CYPRESS_workspaceProjectId',
    '-e',
    'CYPRESS_workspaceEnvironmentId',
    ...(args.postgresTargetSchema === undefined ? [] : ['-e', 'CYPRESS_postgresTargetSchema']),
    ...(args.postgresDatabaseName === undefined ? [] : ['-e', 'CYPRESS_postgresDatabaseName']),
    CYPRESS_IMAGE,
    '--project',
    '/repo/apps/web',
    '--config-file',
    '/repo/apps/web/cypress.config.ts',
    '--browser',
    'chrome',
    '--spec',
    args.specPaths.join(','),
  ];
}

function buildLiveProofCypressNativeInvocation(args) {
  const specPrefix = '/repo/apps/web/';
  if (
    !Array.isArray(args.specPaths) ||
    args.specPaths.some((spec) => typeof spec !== 'string' || !spec.startsWith(specPrefix))
  ) {
    throw new Error('Native Cypress live proof requires a governed web spec path.');
  }
  const specs = validateCypressProofSpecs(
    args.specPaths.map((spec) => spec.slice(specPrefix.length))
  );

  return {
    command: process.execPath,
    args: [
      path.join(__dirname, 'run-selected-closure-cypress.cjs'),
      '--spec',
      specs.join(','),
      ...(args.headed ? ['--headed'] : []),
    ],
    env: {
      CYPRESS_baseUrl: `http://127.0.0.1:${args.webPort}`,
      CYPRESS_apiBaseUrl: `http://127.0.0.1:${args.apiPort}`,
      CYPRESS_apiBearerToken: args.apiBearerToken,
      ...(args.restrictedApiBearerToken === undefined
        ? {}
        : { CYPRESS_restrictedApiBearerToken: args.restrictedApiBearerToken }),
      CYPRESS_workspaceTenantId: args.workspaceScope.tenantId,
      CYPRESS_workspaceProjectId: args.workspaceScope.projectId,
      CYPRESS_workspaceEnvironmentId: args.workspaceScope.environmentId,
      ...(args.postgresTargetSchema === undefined
        ? {}
        : { CYPRESS_postgresTargetSchema: args.postgresTargetSchema }),
      ...(args.postgresDatabaseName === undefined
        ? {}
        : { CYPRESS_postgresDatabaseName: args.postgresDatabaseName }),
    },
  };
}

function resolveLiveProofCypressRuntime(sourceEnv = process.env) {
  const runtime = readNonEmptyEnv(sourceEnv.DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME) ?? 'docker';
  if (runtime !== 'docker' && runtime !== 'native') {
    throw new Error('DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME must be docker or native.');
  }
  return runtime;
}

function resolveLiveProofCypressHeaded(sourceEnv = process.env) {
  const headed = readNonEmptyEnv(sourceEnv.DVT_SELECTED_CLOSURE_CYPRESS_HEADED);
  if (headed === undefined || headed === 'false') return false;
  if (headed !== 'true') {
    throw new Error('DVT_SELECTED_CLOSURE_CYPRESS_HEADED must be true or false.');
  }
  return true;
}

function resolveLiveProofTemporalWorkerRuntime(sourceEnv = process.env) {
  const runtime =
    readNonEmptyEnv(sourceEnv.DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME) ?? 'available';
  if (runtime !== 'available' && runtime !== 'unavailable') {
    throw new Error(
      'DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME must be available or unavailable.'
    );
  }
  return runtime;
}

function resolveLiveProofWorkspaceFilesRoot(liveProofSchema, sourceEnv = process.env) {
  return (
    readNonEmptyEnv(sourceEnv.DVT_WORKSPACE_FILES_ROOT) ??
    path.join(SELECTED_CLOSURE_LIVE_PROOF_ROOT, liveProofSchema, 'workspace-files')
  );
}

function resolveLiveProofDbtAnalyzerProfilesDirectory(liveProofSchema, sourceEnv = process.env) {
  return (
    readNonEmptyEnv(sourceEnv.DVT_DBT_ANALYZER_PROFILES_DIR) ??
    path.join(SELECTED_CLOSURE_LIVE_PROOF_ROOT, liveProofSchema, 'server-dbt-profiles')
  );
}

async function prepareLiveProofDbtAnalyzerProfile(apiEnv) {
  const profilesDirectory = readNonEmptyEnv(apiEnv.DVT_DBT_ANALYZER_PROFILES_DIR);
  const databaseUrl = readNonEmptyEnv(apiEnv.DATABASE_URL);
  const schema = readNonEmptyEnv(apiEnv.DVT_PG_SCHEMA);
  if (profilesDirectory === undefined || databaseUrl === undefined || schema === undefined) {
    throw new Error(
      'Selected-closure live proof requires analyzer profiles, DATABASE_URL, and DVT_PG_SCHEMA.'
    );
  }

  const parsedDatabaseUrl = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('Selected-closure dbt analysis requires a PostgreSQL proof database URL.');
  }
  const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.replace(/^\//, ''));
  if (!parsedDatabaseUrl.hostname || !parsedDatabaseUrl.username || !databaseName) {
    throw new Error('Selected-closure dbt analysis received an incomplete proof database URL.');
  }

  const createProfile = () => ({
    target: 'analysis',
    outputs: {
      analysis: {
        type: 'postgres',
        host: parsedDatabaseUrl.hostname,
        port: Number(parsedDatabaseUrl.port || '5432'),
        user: decodeURIComponent(parsedDatabaseUrl.username),
        password: decodeURIComponent(parsedDatabaseUrl.password),
        dbname: databaseName,
        schema,
        threads: 1,
      },
    },
  });
  const profile = {
    [GENERATED_CANVAS_DBT_PROFILE]: createProfile(),
    [LIVE_PROOF_DBT_PROFILE]: createProfile(),
  };

  await mkdir(profilesDirectory, { recursive: true });
  await writeFile(path.join(profilesDirectory, 'profiles.yml'), yaml.dump(profile), {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function buildLiveProofTemporalOptions() {
  return {
    host: LOCAL_AUTH_HOST,
    apiPort: DEFAULT_API_PORT,
    skipPostgres: false,
  };
}

function buildLiveProofTemporalEnvOverrides(sourceEnv, temporalWorkerAdminPort) {
  return {
    ...sourceEnv,
    ...(temporalWorkerAdminPort === undefined
      ? {}
      : { DVT_TEMPORAL_ADMIN_PORT: String(temporalWorkerAdminPort) }),
  };
}

function buildLiveProofApiEnv({
  databaseUrl,
  dbtExecutable = 'dbt',
  liveProofSchema,
  temporalWorkerAdminPort,
  temporalAddress,
  temporalNamespace,
  oidcEnv = {},
  sourceEnv = process.env,
}) {
  const profilesDirectory = resolveLiveProofDbtAnalyzerProfilesDirectory(
    liveProofSchema,
    sourceEnv
  );
  const temporalSourceEnv = {
    ...buildLiveProofTemporalEnvOverrides(sourceEnv, temporalWorkerAdminPort),
    DVT_START_RUN_BACKPRESSURE_MODE:
      readNonEmptyEnv(sourceEnv.DVT_START_RUN_BACKPRESSURE_MODE) ?? 'enforce',
    DVT_TEMPORAL_DBT_ENABLED: readNonEmptyEnv(sourceEnv.DVT_TEMPORAL_DBT_ENABLED) ?? 'true',
    DVT_TEMPORAL_DVT_POSTGRES_ENABLED:
      readNonEmptyEnv(sourceEnv.DVT_TEMPORAL_DVT_POSTGRES_ENABLED) ?? 'true',
    DVT_DBT_ANALYZER_BIN: dbtExecutable,
    DVT_DBT_BIN: dbtExecutable,
    DVT_DBT_EXECUTION_ADAPTER: 'postgres',
    DVT_DBT_EXECUTION_TARGET_NAME: 'analysis',
    DVT_DBT_EXECUTION_CONNECTION_ID: 'local-postgres-proof',
    DVT_DBT_EXECUTION_CREDENTIAL_REF: 'env:DBT_PROFILES_DIR',
    DBT_PROFILES_DIR: profilesDirectory,
  };
  const artifactEnv = buildLocalDbtArtifactEnv({
    ...temporalSourceEnv,
    DVT_WORKSPACE_FILES_ROOT: resolveLiveProofWorkspaceFilesRoot(
      liveProofSchema,
      temporalSourceEnv
    ),
  });
  const temporalEnv = buildTemporalApiEnv(buildLiveProofTemporalOptions(), {
    ...temporalSourceEnv,
    TEMPORAL_ADDRESS: temporalAddress,
    TEMPORAL_NAMESPACE: temporalNamespace,
    TEMPORAL_TASK_QUEUE: readNonEmptyEnv(temporalSourceEnv.TEMPORAL_TASK_QUEUE) ?? 'dvt-temporal',
  });

  return {
    ...temporalSourceEnv,
    HOST: API_BIND_HOST,
    PORT: String(DEFAULT_API_PORT),
    DATABASE_URL: databaseUrl,
    DVT_OUTBOX_SHARD_COUNT: '1',
    DVT_POSTGRES_CREDENTIAL_BINDINGS: resolvePostgresCredentialBindings(databaseUrl, sourceEnv),
    DVT_PG_SCHEMA: liveProofSchema,
    DVT_DBT_ANALYZER_PROFILES_DIR: profilesDirectory,
    DVT_READYZ_ENABLED: 'true',
    DVT_VERSION_ENABLED: 'true',
    DVT_DB_READY_ENABLED: 'true',
    ...temporalEnv,
    ...artifactEnv,
    ...oidcEnv,
  };
}

function buildLiveProofOutboxWorkerEnv(apiEnv, adminPort) {
  return {
    ...apiEnv,
    SERVICE_NAME: 'dvt-outbox-worker-live-proof',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
    DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'false',
    DVT_OUTBOX_SHARD_COUNT: '1',
    DVT_OUTBOX_OWNED_SHARD_IDS: '0',
    DVT_OUTBOX_ADMIN_HOST: LOCAL_AUTH_HOST,
    DVT_OUTBOX_ADMIN_PORT: String(adminPort),
    DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY: path.join(
      SELECTED_CLOSURE_LIVE_PROOF_ROOT,
      apiEnv.DVT_PG_SCHEMA,
      'outbox-archive'
    ),
  };
}

function prepareLiveProofOutboxWorkerDependencies({ spawnCommand = spawnSync } = {}) {
  console.log('[selected-closure-live] Building outbox worker runtime workspace dependencies');
  const result = spawnCommand(
    process.execPath,
    [WORKSPACE_RUNTIME_BUILD_SCRIPT, 'dvt-outbox-worker'],
    { stdio: 'inherit', env: process.env, windowsHide: true }
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal != null) {
    throw new Error(
      `Outbox worker runtime dependency build failed: exit ${result.status}, signal ${result.signal}`
    );
  }
}

async function startLiveProofOutboxWorker(apiEnv, processHandles, deps = {}) {
  const port = await (deps.allocateFreePort ?? allocateFreePort)(LOCAL_AUTH_HOST);
  const env = buildLiveProofOutboxWorkerEnv(apiEnv, port);
  const handle = (deps.spawnProcess ?? spawnProcess)(
    'outbox-live-proof',
    ['--filter', 'dvt-outbox-worker', 'dev'],
    env
  );
  processHandles.push(handle);
  const readyzUrl = `http://${LOCAL_AUTH_HOST}:${port}/readyz`;
  await (deps.waitForUrlOrProcessExit ?? waitForUrlOrProcessExit)(
    readyzUrl,
    (response) => response.statusCode === 200,
    DEFAULT_READY_TIMEOUT_MS,
    DEFAULT_POLL_INTERVAL_MS,
    'Outbox worker readyz',
    handle
  );
  const response = await (deps.fetch ?? fetch)(readyzUrl, {
    signal: AbortSignal.timeout(READINESS_RECEIPT_TIMEOUT_MS),
  });
  const readiness = response.status === 200 ? await response.json() : null;
  if (
    readiness?.ready !== true ||
    readiness?.owner !== true ||
    readiness?.tickFresh !== true ||
    readiness?.service !== env.SERVICE_NAME
  ) {
    throw new Error('Outbox worker did not report active, fresh readiness.');
  }
}

function buildLiveProofTemporalWorkerEnv(apiEnv, sourceEnv = process.env) {
  const workerEnv = buildCoordinatedTemporalWorkerEnv(
    buildLiveProofTemporalOptions(),
    apiEnv,
    sourceEnv
  );
  const workspaceFilesRoot = readNonEmptyEnv(apiEnv.DVT_WORKSPACE_FILES_ROOT);
  const dbtProfilesDirectory = readNonEmptyEnv(apiEnv.DBT_PROFILES_DIR);
  const dbtExecutable = readNonEmptyEnv(apiEnv.DVT_DBT_BIN);

  return {
    ...workerEnv,
    ...(workspaceFilesRoot === undefined ? {} : { DVT_WORKSPACE_FILES_ROOT: workspaceFilesRoot }),
    ...(dbtProfilesDirectory === undefined ? {} : { DBT_PROFILES_DIR: dbtProfilesDirectory }),
    ...(dbtExecutable === undefined ? {} : { DVT_DBT_BIN: dbtExecutable }),
  };
}

async function seedSelectedClosureLocalWarehouseProof(
  apiEnv,
  deps = {
    seedLocalPostgresProofData,
    log: console.log,
  }
) {
  const databaseUrl = readNonEmptyEnv(apiEnv.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error('Selected-closure live proof requires DATABASE_URL before source seeding.');
  }

  deps.log('[selected-closure-live] Seeding local Postgres proof source data');
  await deps.seedLocalPostgresProofData(databaseUrl);
}

async function runCypress(args, runtime, processHandles, deps = {}) {
  const nativeInvocation = buildLiveProofCypressNativeInvocation(args);
  const childEnv = {
    ...process.env,
    ...nativeInvocation.env,
    ...(runtime === 'docker'
      ? {
          CYPRESS_baseUrl: `http://host.docker.internal:${args.webPort}`,
          CYPRESS_apiBaseUrl: `http://host.docker.internal:${args.apiPort}`,
        }
      : {}),
  };
  delete childEnv.ELECTRON_RUN_AS_NODE;
  const handle = (deps.spawnLiveProofProcess ?? spawnLiveProofProcess)(
    'cypress-live-proof',
    runtime === 'native' ? nativeInvocation.command : 'docker',
    runtime === 'native' ? nativeInvocation.args : buildLiveProofCypressDockerInvocation(args),
    {
      stdio: 'inherit',
      env: childEnv,
      shell: false,
      windowsHide: true,
    }
  );
  processHandles.push(handle);
  const { code, signal } = await handle.completion;
  if (signal != null || code !== 0) {
    throw new Error(`Cypress live selected-closure proof failed: exit ${code}, signal ${signal}`);
  }
}

async function main() {
  const specPaths = resolveLiveProofSpecPaths();
  const dbtExecutable = resolveLiveProofDbtExecutable();
  const cypressRuntime = resolveLiveProofCypressRuntime();
  const cypressHeaded = resolveLiveProofCypressHeaded();
  const temporalWorkerRuntime = resolveLiveProofTemporalWorkerRuntime();
  if (cypressHeaded && cypressRuntime !== 'native') {
    throw new Error('Headed Chrome requires DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME=native.');
  }
  const { databaseUrl: adminDatabaseUrl, shouldBootstrap } = resolveLiveProofDatabaseUrl();
  ensureLocalPostgresReady(shouldBootstrap);
  const lease = await allocateDisposablePostgresDatabase(adminDatabaseUrl, 'selected_closure');
  const databaseUrl = lease.url;
  let temporalEnv;
  let localProtectedRuntimeAuth;
  const liveProofSchema = allocateLiveProofSchema();
  const processHandles = [];
  let shutdownPromise;

  async function shutdown() {
    shutdownPromise ??= (async () => {
      const processes = await Promise.allSettled(
        processHandles.map(async (handle) => {
          try {
            await terminateLiveProofProcess(handle);
          } finally {
            await closeReaders(handle);
          }
        })
      );
      const resources = await Promise.allSettled([
        Promise.resolve().then(() => localProtectedRuntimeAuth?.close()),
        Promise.resolve().then(() => temporalEnv?.teardown()),
      ]);
      const failures = [...processes, ...resources].filter(
        (result) => result.status === 'rejected'
      );
      if (failures.length)
        throw new AggregateError(
          failures.map((result) => result.reason),
          'Live proof shutdown failed'
        );
    })();
    return shutdownPromise;
  }
  const removeInterruptCleanup = installDisposablePostgresInterruptCleanup(lease, shutdown);

  try {
    const { TestWorkflowEnvironment } = await loadTemporalTesting();
    const timeSkippingOptions = buildLiveProofTemporalTimeSkippingOptions();
    temporalEnv = timeSkippingOptions
      ? await TestWorkflowEnvironment.createTimeSkipping(timeSkippingOptions)
      : await TestWorkflowEnvironment.createTimeSkipping();
    localProtectedRuntimeAuth = await startLocalProtectedRuntimeAuth({
      env: process.env,
      host: LOCAL_AUTH_HOST,
    });
    const restrictedPrincipalId = `${localProtectedRuntimeAuth.principalId}-without-run-start`;
    const restrictedPrincipalToken = await localProtectedRuntimeAuth.issueBearerToken({
      principalId: restrictedPrincipalId,
    });
    const hasExternallyManagedAnalyzerProfile =
      readNonEmptyEnv(process.env.DVT_DBT_ANALYZER_PROFILES_DIR) !== undefined;
    const apiEnv = buildLiveProofApiEnv({
      databaseUrl,
      dbtExecutable,
      liveProofSchema,
      temporalWorkerAdminPort: await allocateFreePort(LOCAL_AUTH_HOST),
      temporalAddress: temporalEnv.connection.options.address,
      temporalNamespace: temporalEnv.namespace,
      oidcEnv: localProtectedRuntimeAuth.oidcEnv,
    });
    if (!hasExternallyManagedAnalyzerProfile) {
      await prepareLiveProofDbtAnalyzerProfile(apiEnv);
    }
    await seedSelectedClosureLocalWarehouseProof(apiEnv);

    prepareLiveProofOutboxWorkerDependencies();
    if (temporalWorkerRuntime === 'available') {
      prepareTemporalWorkerRuntimeDependencies(apiEnv);
    }

    const apiHandle = spawnProcess('api-live-proof', ['--filter', 'dvt-api', 'dev'], apiEnv);
    processHandles.push(apiHandle);

    await waitForUrlOrProcessExit(
      `http://127.0.0.1:${DEFAULT_API_PORT}/healthz`,
      (response) => response.statusCode === 200,
      DEFAULT_READY_TIMEOUT_MS,
      DEFAULT_POLL_INTERVAL_MS,
      'API healthz',
      apiHandle
    );
    await waitForUrlOrProcessExit(
      `http://127.0.0.1:${DEFAULT_API_PORT}/db/ready`,
      (response) => response.statusCode === 200,
      DEFAULT_READY_TIMEOUT_MS,
      DEFAULT_POLL_INTERVAL_MS,
      'API db/ready',
      apiHandle
    );
    await startLiveProofOutboxWorker(apiEnv, processHandles);
    await waitForUrlOrProcessExit(
      `http://127.0.0.1:${DEFAULT_API_PORT}/readyz`,
      (response) => response.statusCode === 200,
      DEFAULT_READY_TIMEOUT_MS,
      DEFAULT_POLL_INTERVAL_MS,
      'API readyz',
      apiHandle
    );
    await waitForUrlOrProcessExit(
      `http://127.0.0.1:${DEFAULT_API_PORT}/version`,
      (response) => response.statusCode === 200,
      DEFAULT_READY_TIMEOUT_MS,
      DEFAULT_POLL_INTERVAL_MS,
      'API version',
      apiHandle
    );

    await seedLocalProtectedRuntimeGrant({
      databaseUrl,
      schema: liveProofSchema,
      principalId: localProtectedRuntimeAuth.principalId,
      tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
    });
    await seedLocalProtectedRuntimeGrant({
      databaseUrl,
      schema: liveProofSchema,
      principalId: restrictedPrincipalId,
      tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS.filter(
        (action) => action !== 'run:start'
      ),
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
    });

    await ensureLocalWarehouseConnectionViaApi({
      databaseUrl,
      apiBaseUrl: `http://127.0.0.1:${DEFAULT_API_PORT}`,
      bearerToken: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
      commandTimeoutMs: DEFAULT_READY_TIMEOUT_MS,
    });

    const temporalWorkerReadyzUrl = readNonEmptyEnv(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL);
    if (temporalWorkerReadyzUrl === undefined) {
      throw new Error('Selected-closure live proof requires DVT_TEMPORAL_WORKER_READYZ_URL.');
    }

    if (temporalWorkerRuntime === 'available') {
      console.log('[selected-closure-live] Starting Temporal worker; waiting for worker readiness');
      const temporalWorkerHandle = spawnProcess(
        'temporal-worker-live-proof',
        ['--filter', 'dvt-temporal-worker', 'dev'],
        buildLiveProofTemporalWorkerEnv(apiEnv)
      );
      processHandles.push(temporalWorkerHandle);

      await waitForUrlOrProcessExit(
        temporalWorkerReadyzUrl,
        (response) => response.statusCode === 200,
        DEFAULT_READY_TIMEOUT_MS,
        DEFAULT_POLL_INTERVAL_MS,
        'Temporal worker readyz',
        temporalWorkerHandle
      );
    } else {
      console.log('[selected-closure-live] Temporal worker intentionally unavailable');
    }

    const webHandle = spawnProcess(
      'web-live-proof',
      [
        '--filter',
        '@dvt/web',
        'exec',
        'vite',
        '--host',
        WEB_BIND_HOST,
        '--port',
        String(DEFAULT_WEB_PORT),
        '--strictPort',
      ],
      {
        VITE_API_BASE_URL: `http://${
          cypressRuntime === 'native' ? '127.0.0.1' : 'host.docker.internal'
        }:${DEFAULT_API_PORT}`,
        ...localProtectedRuntimeAuth.webEnv,
        VITE_DEFAULT_TENANT_ID: localProtectedRuntimeAuth.workspaceScope.tenantId,
        VITE_DEFAULT_PROJECT_ID: localProtectedRuntimeAuth.workspaceScope.projectId,
        VITE_DEFAULT_ENVIRONMENT_ID: localProtectedRuntimeAuth.workspaceScope.environmentId,
        VITE_GIT_BRANCH: 'main',
        VITE_GIT_SHA: 'local',
        VITE_GIT_REPO: 'dunay2/dvt',
        VITE_GRAPH_ARTIFACT_PATH: 'pipelines/sales_pipeline.yaml',
        VITE_PLATFORM_HEALTH_OPTIONAL_PROBES: '',
      }
    );
    processHandles.push(webHandle);

    await waitForUrlOrProcessExit(
      `http://127.0.0.1:${DEFAULT_WEB_PORT}/`,
      (response) => (response.statusCode ?? 500) < 500,
      DEFAULT_READY_TIMEOUT_MS,
      DEFAULT_POLL_INTERVAL_MS,
      'Web dev server',
      webHandle
    );

    const sourceProof = spawnProcess(
      'source-live-provider-proof',
      [
        '--filter',
        'dvt-api',
        'exec',
        'vitest',
        'run',
        '--config',
        'vitest.integration.config.ts',
        'test/integration/sourceLivePreviewPostgres.proof.ts',
      ],
      { DVT_SOURCE_LIVE_PROOF_DATABASE_URL: databaseUrl }
    );
    processHandles.push(sourceProof);
    const providerResult = await sourceProof.completion;
    if (providerResult.code !== 0 || providerResult.signal != null) {
      throw new Error('Source LIVE provider proof failed.');
    }

    await runCypress(
      {
        apiPort: DEFAULT_API_PORT,
        webPort: DEFAULT_WEB_PORT,
        apiBearerToken: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
        restrictedApiBearerToken: restrictedPrincipalToken.bearerToken,
        workspaceScope: localProtectedRuntimeAuth.workspaceScope,
        postgresTargetSchema: liveProofSchema,
        postgresDatabaseName: lease.name,
        specPaths,
        headed: cypressHeaded,
      },
      cypressRuntime,
      processHandles
    );
  } finally {
    removeInterruptCleanup();
    try {
      await shutdown();
    } finally {
      await lease.dispose();
      await rm(path.join(SELECTED_CLOSURE_LIVE_PROOF_ROOT, liveProofSchema), {
        recursive: true,
        force: true,
      });
    }
  }
}

module.exports = {
  buildLiveProofCypressDockerInvocation,
  buildLiveProofCypressNativeInvocation,
  buildLiveProofApiEnv,
  buildLiveProofOutboxWorkerEnv,
  buildLiveProofTemporalWorkerEnv,
  buildLiveProofTemporalTimeSkippingOptions,
  prepareLiveProofDbtAnalyzerProfile,
  prepareLiveProofOutboxWorkerDependencies,
  resolveLiveProofDbtExecutable,
  resolveLiveProofDatabaseUrl,
  resolveLiveProofCypressRuntime,
  resolveLiveProofCypressHeaded,
  resolveLiveProofSpecPaths,
  resolveLiveProofTemporalWorkerRuntime,
  seedSelectedClosureLocalWarehouseProof,
  startLiveProofOutboxWorker,
  runCypress,
};

if (require.main === module) {
  const keepAlive = setInterval(() => undefined, 1_000);
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => clearInterval(keepAlive));
}
