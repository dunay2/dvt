#!/usr/bin/env node
/**
 * Owned concern: boot a live protected-runtime browser proof lane for selected closure.
 */
const { spawn, spawnSync } = require('node:child_process');
const { existsSync, readdirSync } = require('node:fs');
const { mkdir, rm, writeFile } = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { Client } = require('pg');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');
const yaml = require('js-yaml');

const {
  buildCoordinatedTemporalWorkerEnv,
  buildLocalDbtArtifactEnv,
  ensureLocalWarehouseConnectionViaApi,
  resolveDatabaseUrl,
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
const POSTGRES_BOOTSTRAP_SCRIPT = path.resolve(__dirname, 'run-local-postgres.cjs');
const TEMPORAL_PACKAGE_ROOT = path.resolve(__dirname, '../packages/@dvt/adapter-temporal');
const DEFAULT_SPEC_RELATIVE_PATH = 'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts';
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

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

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
  const child = spawn(PNPM_COMMAND, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...envOverrides },
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  return {
    name,
    child,
    stdoutReader: pipePrefixedOutput(child.stdout, `[${name}]`),
    stderrReader: pipePrefixedOutput(child.stderr, `[${name}]`),
  };
}

function request(url) {
  const transport = url.startsWith('https:') ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.get(
      url,
      {
        timeout: 5_000,
        headers: { Accept: 'application/json,text/html,*/*' },
      },
      (response) => {
        response.resume();
        resolve(response);
      }
    );

    req.on('timeout', () => req.destroy(new Error(`Timeout while requesting ${url}`)));
    req.on('error', reject);
  });
}

async function waitForUrl(url, validator, label) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < DEFAULT_READY_TIMEOUT_MS) {
    try {
      const response = await request(url);
      if (validator(response)) {
        return;
      }
      lastError = new Error(`${label} responded with ${response.statusCode}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
  }

  throw new Error(
    `${label} did not become ready within ${DEFAULT_READY_TIMEOUT_MS}ms. Last error: ${
      lastError?.message ?? 'unknown'
    }`
  );
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

async function terminateProcess(processHandle) {
  if (processHandle.child.killed || processHandle.child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(processHandle.child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  processHandle.child.kill('SIGTERM');
}

async function closeReaders(processHandle) {
  processHandle.stdoutReader.close();
  processHandle.stderrReader.close();
}

async function dropSchemaIfExists(databaseUrl, schema) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
  } finally {
    await client.end();
  }
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

function resolveLiveProofSpecPath(argv = process.argv.slice(2)) {
  if (argv.length === 0) {
    return `/repo/${DEFAULT_SPEC_RELATIVE_PATH}`;
  }

  if (argv.length !== 2 || argv[0] !== '--spec' || readNonEmptyEnv(argv[1]) === undefined) {
    throw new Error(
      'Usage: run-selected-closure-live-proof.cjs [--spec apps/web/cypress/e2e/<path>.cy.ts]'
    );
  }

  const relativeSpecPath = argv[1].trim().replaceAll('\\', '/');
  const pathSegments = relativeSpecPath.split('/');

  if (
    !relativeSpecPath.startsWith('apps/web/cypress/e2e/') ||
    pathSegments.includes('..') ||
    pathSegments.includes('.')
  ) {
    throw new Error('Live proof spec must stay inside apps/web/cypress/e2e.');
  }

  if (!relativeSpecPath.endsWith('.cy.ts')) {
    throw new Error('Live proof spec must end in .cy.ts.');
  }

  if (
    pathSegments.some((segment) => segment.length === 0) ||
    !/^[A-Za-z0-9._/-]+$/.test(relativeSpecPath)
  ) {
    throw new Error('Live proof requires exactly one literal Cypress spec path.');
  }

  return `/repo/${relativeSpecPath}`;
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
    `CYPRESS_baseUrl=http://host.docker.internal:${args.webPort}`,
    '-e',
    `CYPRESS_apiBaseUrl=http://host.docker.internal:${args.apiPort}`,
    '-e',
    `CYPRESS_apiBearerToken=${args.apiBearerToken}`,
    '-e',
    `CYPRESS_workspaceTenantId=${args.workspaceScope.tenantId}`,
    '-e',
    `CYPRESS_workspaceProjectId=${args.workspaceScope.projectId}`,
    '-e',
    `CYPRESS_workspaceEnvironmentId=${args.workspaceScope.environmentId}`,
    CYPRESS_IMAGE,
    '--project',
    '/repo/apps/web',
    '--config-file',
    '/repo/apps/web/cypress.config.ts',
    '--browser',
    'chrome',
    '--spec',
    args.specPath,
  ];
}

function buildLiveProofCypressNativeInvocation(args) {
  const specPrefix = '/repo/apps/web/';
  if (!args.specPath.startsWith(specPrefix)) {
    throw new Error('Native Cypress live proof requires a governed web spec path.');
  }

  return {
    command: PNPM_COMMAND,
    args: [
      '--filter',
      '@dvt/web',
      'exec',
      'cypress',
      'run',
      '--config-file',
      'cypress.config.ts',
      '--browser',
      'chrome',
      '--spec',
      args.specPath.slice(specPrefix.length),
    ],
    env: {
      CYPRESS_baseUrl: `http://127.0.0.1:${args.webPort}`,
      CYPRESS_apiBaseUrl: `http://127.0.0.1:${args.apiPort}`,
      CYPRESS_apiBearerToken: args.apiBearerToken,
      CYPRESS_workspaceTenantId: args.workspaceScope.tenantId,
      CYPRESS_workspaceProjectId: args.workspaceScope.projectId,
      CYPRESS_workspaceEnvironmentId: args.workspaceScope.environmentId,
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
    DVT_TEMPORAL_DBT_ENABLED: readNonEmptyEnv(sourceEnv.DVT_TEMPORAL_DBT_ENABLED) ?? 'true',
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
    DVT_POSTGRES_CREDENTIAL_BINDINGS:
      readNonEmptyEnv(sourceEnv.DVT_POSTGRES_CREDENTIAL_BINDINGS) ??
      JSON.stringify({ 'postgres:local-postgres-proof': databaseUrl }),
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

async function runCypress(args, runtime) {
  const nativeInvocation =
    runtime === 'native' ? buildLiveProofCypressNativeInvocation(args) : undefined;
  const childEnv = { ...process.env, ...(nativeInvocation?.env ?? {}) };
  delete childEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(
    nativeInvocation?.command ?? 'docker',
    nativeInvocation?.args ?? buildLiveProofCypressDockerInvocation(args),
    {
      stdio: 'inherit',
      env: childEnv,
      shell: runtime === 'native' && process.platform === 'win32',
      windowsHide: true,
    }
  );

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal != null) {
        reject(new Error(`Cypress live selected-closure proof exited from signal ${signal}`));
        return;
      }
      resolve(code);
    });
  });

  if (typeof exitCode !== 'number' || exitCode !== 0) {
    throw new Error(`Cypress live selected-closure proof failed with exit code ${exitCode}`);
  }
}

async function main() {
  const specPath = resolveLiveProofSpecPath();
  const dbtExecutable = resolveLiveProofDbtExecutable();
  const cypressRuntime = resolveLiveProofCypressRuntime();
  const { databaseUrl, shouldBootstrap } = resolveLiveProofDatabaseUrl();
  ensureLocalPostgresReady(shouldBootstrap);

  const { TestWorkflowEnvironment } = await loadTemporalTesting();
  const timeSkippingOptions = buildLiveProofTemporalTimeSkippingOptions();
  const temporalEnv = timeSkippingOptions
    ? await TestWorkflowEnvironment.createTimeSkipping(timeSkippingOptions)
    : await TestWorkflowEnvironment.createTimeSkipping();
  const localProtectedRuntimeAuth = await startLocalProtectedRuntimeAuth({
    env: process.env,
    host: LOCAL_AUTH_HOST,
  });
  const liveProofSchema = allocateLiveProofSchema();
  const processHandles = [];

  async function shutdown() {
    await Promise.all(processHandles.map((handle) => terminateProcess(handle)));
    await Promise.all(processHandles.map((handle) => closeReaders(handle)));
    await localProtectedRuntimeAuth.close();
    await temporalEnv.teardown();
  }

  try {
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

    const apiHandle = spawnProcess('api-live-proof', ['--filter', 'dvt-api', 'dev'], apiEnv);
    processHandles.push(apiHandle);

    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/healthz`,
      (response) => response.statusCode === 200,
      'API healthz'
    );
    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/db/ready`,
      (response) => response.statusCode === 200,
      'API db/ready'
    );
    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/readyz`,
      (response) => response.statusCode === 200,
      'API readyz'
    );
    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/version`,
      (response) => response.statusCode === 200,
      'API version'
    );

    await seedLocalProtectedRuntimeGrant({
      databaseUrl,
      schema: liveProofSchema,
      principalId: localProtectedRuntimeAuth.principalId,
      tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
    });

    await ensureLocalWarehouseConnectionViaApi({
      apiBaseUrl: `http://127.0.0.1:${DEFAULT_API_PORT}`,
      bearerToken: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
      commandTimeoutMs: DEFAULT_READY_TIMEOUT_MS,
    });

    const temporalWorkerReadyzUrl = readNonEmptyEnv(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL);
    if (temporalWorkerReadyzUrl === undefined) {
      throw new Error('Selected-closure live proof requires DVT_TEMPORAL_WORKER_READYZ_URL.');
    }

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

    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_WEB_PORT}/`,
      (response) => (response.statusCode ?? 500) < 500,
      'Web dev server'
    );

    await runCypress(
      {
        apiPort: DEFAULT_API_PORT,
        webPort: DEFAULT_WEB_PORT,
        apiBearerToken: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
        workspaceScope: localProtectedRuntimeAuth.workspaceScope,
        specPath,
      },
      cypressRuntime
    );
  } finally {
    await shutdown();
    await dropSchemaIfExists(databaseUrl, liveProofSchema);
    await rm(path.join(SELECTED_CLOSURE_LIVE_PROOF_ROOT, liveProofSchema), {
      recursive: true,
      force: true,
    });
  }
}

module.exports = {
  buildLiveProofCypressDockerInvocation,
  buildLiveProofCypressNativeInvocation,
  buildLiveProofApiEnv,
  buildLiveProofTemporalWorkerEnv,
  buildLiveProofTemporalTimeSkippingOptions,
  prepareLiveProofDbtAnalyzerProfile,
  resolveLiveProofDbtExecutable,
  resolveLiveProofDatabaseUrl,
  resolveLiveProofCypressRuntime,
  resolveLiveProofSpecPath,
  seedSelectedClosureLocalWarehouseProof,
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
