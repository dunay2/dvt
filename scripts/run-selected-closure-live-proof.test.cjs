const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');

const {
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
} = require('./run-selected-closure-live-proof.cjs');
const { defaultPgUrl } = require('./run-local-postgres.cjs');

test('resolveLiveProofSpecPath keeps the selected-closure proof as the default', () => {
  assert.equal(
    resolveLiveProofSpecPath([]),
    '/repo/apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
  );
});

test('uses the configured Temporal test server binary for the live proof', () => {
  assert.deepEqual(
    buildLiveProofTemporalTimeSkippingOptions({
      DVT_TEMPORAL_TEST_SERVER_PATH: 'C:\\tools\\temporal-test-server.exe',
    }),
    {
      server: {
        executable: {
          type: 'existing-path',
          path: 'C:\\tools\\temporal-test-server.exe',
        },
      },
    }
  );
});

test('resolveLiveProofSpecPath maps a governed repository Cypress spec into the proof container', () => {
  assert.equal(
    resolveLiveProofSpecPath([
      '--spec',
      'apps\\web\\cypress\\e2e\\canvas\\canvas-dbt-author-code-run-live.cy.ts',
    ]),
    '/repo/apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
  );
});

test('buildLiveProofCypressDockerInvocation isolates the one governed spec in Cypress 15', () => {
  assert.deepEqual(
    buildLiveProofCypressDockerInvocation(
      {
        apiPort: 3300,
        webPort: 4174,
        apiBearerToken: 'proof-token',
        specPath: '/repo/apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
        workspaceScope: {
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'dev',
        },
      },
      'C:/repo',
      { platform: 'linux' }
    ),
    [
      'run',
      '--rm',
      '-t',
      '-v',
      'C:/repo:/repo',
      '-w',
      '/repo/apps/web',
      '-e',
      'CYPRESS_baseUrl=http://host.docker.internal:4174',
      '-e',
      'CYPRESS_apiBaseUrl=http://host.docker.internal:3300',
      '-e',
      'CYPRESS_apiBearerToken=proof-token',
      '-e',
      'CYPRESS_workspaceTenantId=tenant',
      '-e',
      'CYPRESS_workspaceProjectId=project',
      '-e',
      'CYPRESS_workspaceEnvironmentId=dev',
      'cypress/included:15.18.1',
      '--project',
      '/repo/apps/web',
      '--config-file',
      '/repo/apps/web/cypress.config.ts',
      '--browser',
      'chrome',
      '--spec',
      '/repo/apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
    ]
  );
});

test('buildLiveProofCypressDockerInvocation mirrors Windows junction targets read-only', () => {
  const invocation = buildLiveProofCypressDockerInvocation(
    {
      apiPort: 3300,
      webPort: 4174,
      apiBearerToken: 'proof-token',
      specPath: '/repo/apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      },
    },
    'C:/repo',
    {
      platform: 'win32',
    }
  );

  assert.deepEqual(invocation.slice(3, 9), [
    '-v',
    'C:/repo:/repo',
    '-v',
    'C:/repo:/mnt/host/c/repo:ro',
    '-w',
    '/repo/apps/web',
  ]);
});

test('buildLiveProofCypressNativeInvocation targets the already running host stack', () => {
  assert.deepEqual(
    buildLiveProofCypressNativeInvocation({
      apiPort: 3300,
      webPort: 4174,
      apiBearerToken: 'proof-token',
      specPath: '/repo/apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      },
    }),
    {
      command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
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
        'cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      ],
      env: {
        CYPRESS_baseUrl: 'http://127.0.0.1:4174',
        CYPRESS_apiBaseUrl: 'http://127.0.0.1:3300',
        CYPRESS_apiBearerToken: 'proof-token',
        CYPRESS_workspaceTenantId: 'tenant',
        CYPRESS_workspaceProjectId: 'project',
        CYPRESS_workspaceEnvironmentId: 'dev',
      },
    }
  );
});

test('live proof selects Docker by default and native Cypress only when explicitly requested', () => {
  assert.equal(resolveLiveProofCypressRuntime({}), 'docker');
  assert.equal(
    resolveLiveProofCypressRuntime({ DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'native' }),
    'native'
  );
  assert.throws(
    () => resolveLiveProofCypressRuntime({ DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME: 'remote' }),
    /must be docker or native/
  );
});

test('live proof reuses an explicit database and otherwise keeps local bootstrap behavior', () => {
  assert.deepEqual(resolveLiveProofDatabaseUrl({ DATABASE_URL: 'postgresql://host/proof' }), {
    databaseUrl: 'postgresql://host/proof',
    shouldBootstrap: false,
  });
  assert.deepEqual(resolveLiveProofDatabaseUrl({}), {
    databaseUrl: defaultPgUrl,
    shouldBootstrap: true,
  });
});

test('resolveLiveProofSpecPath rejects paths outside the governed Cypress E2E surface', () => {
  assert.throws(
    () => resolveLiveProofSpecPath(['--spec', '../canvas-dbt-author-code-run-live.cy.ts']),
    /inside apps\/web\/cypress\/e2e/
  );
  assert.throws(
    () =>
      resolveLiveProofSpecPath([
        '--spec',
        'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx',
      ]),
    /inside apps\/web\/cypress\/e2e/
  );
  assert.throws(
    () =>
      resolveLiveProofSpecPath([
        '--spec',
        'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.ts',
      ]),
    /must end in \.cy\.ts/
  );
});

test('resolveLiveProofSpecPath rejects spec lists and glob patterns', () => {
  assert.throws(
    () =>
      resolveLiveProofSpecPath([
        '--spec',
        'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts,apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
      ]),
    /exactly one literal Cypress spec path/
  );
  assert.throws(
    () => resolveLiveProofSpecPath(['--spec', 'apps/web/cypress/e2e/**/*.cy.ts']),
    /exactly one literal Cypress spec path/
  );
});

test('resolveLiveProofDbtExecutable keeps API analysis and worker execution on one binary', () => {
  assert.equal(
    resolveLiveProofDbtExecutable(
      {
        DVT_DBT_ANALYZER_BIN: 'C:\\tools\\dbt.exe',
        DVT_DBT_BIN: 'C:\\tools\\dbt.exe',
      },
      () => undefined
    ),
    'C:\\tools\\dbt.exe'
  );

  assert.throws(
    () =>
      resolveLiveProofDbtExecutable(
        {
          DVT_DBT_ANALYZER_BIN: 'C:\\tools\\analyzer-dbt.exe',
          DVT_DBT_BIN: 'C:\\tools\\worker-dbt.exe',
        },
        () => undefined
      ),
    /same dbt executable/
  );
});

test('resolveLiveProofDbtExecutable discovers dbt or fails before stack startup', () => {
  assert.equal(
    resolveLiveProofDbtExecutable({}, () => 'C:\\python-scripts\\dbt.exe'),
    'C:\\python-scripts\\dbt.exe'
  );
  assert.throws(
    () => resolveLiveProofDbtExecutable({}, () => undefined),
    /requires a real dbt executable/
  );
});

test('buildLiveProofApiEnv exposes workspace file roots for live warehouse catalog discovery', () => {
  const apiEnv = buildLiveProofApiEnv({
    databaseUrl: defaultPgUrl,
    liveProofSchema: 'dvt_live_selected_closure_test',
    temporalAddress: '127.0.0.1:7233',
    temporalNamespace: 'default',
    oidcEnv: { OIDC_ISSUER: 'https://issuer.local.dvt/' },
    sourceEnv: {},
  });

  assert.equal(apiEnv.DATABASE_URL, defaultPgUrl);
  assert.equal(apiEnv.DVT_LOCAL_POSTGRES_WAREHOUSE_URL, undefined);
  assert.equal(
    apiEnv.DVT_POSTGRES_CREDENTIAL_BINDINGS,
    JSON.stringify({ 'postgres:local-postgres-proof': defaultPgUrl })
  );
  assert.equal(apiEnv.DVT_PG_SCHEMA, 'dvt_live_selected_closure_test');
  assert.equal(apiEnv.TEMPORAL_ADDRESS, '127.0.0.1:7233');
  assert.equal(apiEnv.TEMPORAL_NAMESPACE, 'default');
  assert.equal(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL, 'http://127.0.0.1:9468/readyz');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(apiEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
  assert.match(apiEnv.DVT_DBT_BUNDLE_FILE_ROOT, /[\\/]\.dvt[\\/]dev-stack[\\/]dbt-bundles$/);
  assert.match(
    apiEnv.DVT_WORKSPACE_FILES_ROOT,
    /[\\/]\.dvt[\\/]live-proofs[\\/]selected-closure[\\/]dvt_live_selected_closure_test[\\/]workspace-files$/
  );
  assert.match(
    apiEnv.DVT_DBT_ANALYZER_PROFILES_DIR,
    /[\\/]\.dvt[\\/]live-proofs[\\/]selected-closure[\\/]dvt_live_selected_closure_test[\\/]server-dbt-profiles$/
  );
  assert.equal(apiEnv.DBT_PROFILES_DIR, apiEnv.DVT_DBT_ANALYZER_PROFILES_DIR);
  assert.equal(apiEnv.DVT_DBT_EXECUTION_ADAPTER, 'postgres');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_TARGET_NAME, 'analysis');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_CONNECTION_ID, 'local-postgres-proof');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_CREDENTIAL_REF, 'env:DBT_PROFILES_DIR');
  assert.equal(apiEnv.DVT_DBT_ANALYZER_BIN, 'dbt');
  assert.equal(apiEnv.DVT_DBT_BIN, 'dbt');
  assert.equal(apiEnv.OIDC_ISSUER, 'https://issuer.local.dvt/');
});

test('buildLiveProofApiEnv keeps execution on the generated live-proof profile', () => {
  const apiEnv = buildLiveProofApiEnv({
    databaseUrl: defaultPgUrl,
    liveProofSchema: 'dvt_live_selected_closure_profile_authority_test',
    temporalAddress: '127.0.0.1:7233',
    temporalNamespace: 'default',
    sourceEnv: {
      DBT_PROFILES_DIR: 'C:\\developer\\unrelated-dbt-profiles',
      DVT_DBT_EXECUTION_ADAPTER: 'snowflake',
      DVT_DBT_EXECUTION_TARGET_NAME: 'developer-target',
      DVT_DBT_EXECUTION_CONNECTION_ID: 'developer-connection',
      DVT_DBT_EXECUTION_CREDENTIAL_REF: 'env:DEVELOPER_DBT_CREDENTIAL',
    },
  });

  assert.equal(apiEnv.DBT_PROFILES_DIR, apiEnv.DVT_DBT_ANALYZER_PROFILES_DIR);
  assert.notEqual(apiEnv.DBT_PROFILES_DIR, 'C:\\developer\\unrelated-dbt-profiles');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_ADAPTER, 'postgres');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_TARGET_NAME, 'analysis');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_CONNECTION_ID, 'local-postgres-proof');
  assert.equal(apiEnv.DVT_DBT_EXECUTION_CREDENTIAL_REF, 'env:DBT_PROFILES_DIR');
});

test('prepareLiveProofDbtAnalyzerProfile creates an isolated server-owned analysis profile', async () => {
  const proofRoot = await mkdtemp(path.join(tmpdir(), 'dvt-selected-closure-profile-'));
  const profilesDirectory = path.join(proofRoot, 'server-dbt-profiles');

  try {
    await prepareLiveProofDbtAnalyzerProfile({
      DATABASE_URL: 'postgresql://proof-user:proof-pass@127.0.0.1:5544/proof-db',
      DVT_PG_SCHEMA: 'proof_schema',
      DVT_DBT_ANALYZER_PROFILES_DIR: profilesDirectory,
    });

    const profile = yaml.load(await readFile(path.join(profilesDirectory, 'profiles.yml'), 'utf8'));
    const expectedProfile = {
      target: 'analysis',
      outputs: {
        analysis: {
          type: 'postgres',
          host: '127.0.0.1',
          port: 5544,
          user: 'proof-user',
          password: 'proof-pass',
          dbname: 'proof-db',
          schema: 'proof_schema',
          threads: 1,
        },
      },
    };
    assert.deepEqual(profile, {
      default: expectedProfile,
      dvt_live_proof: expectedProfile,
    });
  } finally {
    await rm(proofRoot, { recursive: true, force: true });
  }
});

test('buildLiveProofTemporalWorkerEnv derives the worker from the selected live API posture', () => {
  const apiEnv = buildLiveProofApiEnv({
    databaseUrl: defaultPgUrl,
    liveProofSchema: 'dvt_live_selected_closure_worker_test',
    temporalWorkerAdminPort: 19568,
    temporalAddress: '127.0.0.1:7233',
    temporalNamespace: 'default',
    oidcEnv: { OIDC_ISSUER: 'https://issuer.local.dvt/' },
    sourceEnv: {
      VITE_DEFAULT_TENANT_ID: 'tenant-live',
    },
  });

  const workerEnv = buildLiveProofTemporalWorkerEnv(apiEnv, {});

  assert.equal(workerEnv.DATABASE_URL, defaultPgUrl);
  assert.equal(workerEnv.DVT_PG_SCHEMA, 'dvt_live_selected_closure_worker_test');
  assert.equal(workerEnv.TEMPORAL_ADDRESS, '127.0.0.1:7233');
  assert.equal(workerEnv.TEMPORAL_NAMESPACE, 'default');
  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal-tenant-live');
  assert.equal(workerEnv.DVT_TEMPORAL_ADMIN_HOST, '127.0.0.1');
  assert.equal(workerEnv.DVT_TEMPORAL_ADMIN_PORT, '19568');
  assert.equal(workerEnv.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS, 'true');
  assert.equal(workerEnv.DVT_WORKSPACE_FILES_ROOT, apiEnv.DVT_WORKSPACE_FILES_ROOT);
  assert.equal(workerEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(workerEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
  assert.equal(workerEnv.DVT_DBT_BUNDLE_FILE_ROOT, apiEnv.DVT_DBT_BUNDLE_FILE_ROOT);
  assert.equal(workerEnv.DBT_PROFILES_DIR, apiEnv.DBT_PROFILES_DIR);
  assert.equal(workerEnv.DVT_DBT_BIN, apiEnv.DVT_DBT_BIN);
});

test('seedSelectedClosureLocalWarehouseProof seeds source data before the API command creates the catalog', async () => {
  const calls = [];

  await seedSelectedClosureLocalWarehouseProof(
    {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
      DVT_WORKSPACE_FILES_ROOT: 'C:\\workspace-files',
    },
    {
      seedLocalPostgresProofData: async (databaseUrl) => {
        calls.push(['postgres', databaseUrl]);
      },
      log: (message) => {
        calls.push(['log', message]);
      },
    }
  );

  assert.deepEqual(calls, [
    ['log', '[selected-closure-live] Seeding local Postgres proof source data'],
    ['postgres', 'postgresql://user:pass@localhost:5432/dvt'],
  ]);
});
