/**
 * Owned concern: prove the real LIVE composition stays scoped, owned and fail-closed.
 * @baseline GH-3594: admission requires the existing outbox consumer, not a higher lag limit.
 * @decision Exercise configuration and startup boundaries without another runtime or runner.
 * @consequence Failed preparation or readiness keeps the proof red and its handles owned.
 * @version 1.0.0
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');
const ts = require('typescript');
const { runInNewContext } = require('node:vm');

const {
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
  resolveLiveProofSpecPath,
  resolveLiveProofTemporalWorkerRuntime,
  seedSelectedClosureLocalWarehouseProof,
  startLiveProofOutboxWorker,
  runCypress,
} = require('./run-selected-closure-live-proof.cjs');
const { defaultPgUrl } = require('./run-local-postgres.cjs');

test('Source provider proof requires explicit lease admission in the existing integration config', async () => {
  const source = await readFile(
    path.join(__dirname, '../apps/api/vitest.integration.config.ts'),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const value of [undefined, '', 'postgresql://localhost/dvt_proof_test']) {
    const exports = {};
    runInNewContext(compiled, {
      exports,
      require: (id) => {
        assert.equal(id, 'vitest/config');
        return { defineConfig: (config) => config };
      },
      process: { env: value === undefined ? {} : { DVT_SOURCE_LIVE_PROOF_DATABASE_URL: value } },
    });
    assert.deepEqual(Array.from(exports.default.test.include), [
      'test/integration/**/*.test.ts',
      ...(value === undefined ? [] : ['test/integration/sourceLivePreviewPostgres.proof.ts']),
    ]);
  }
});

test('selected closure explicitly prepares an available worker before starting the API', async () => {
  const source = await readFile(
    path.join(__dirname, 'run-selected-closure-live-proof.cjs'),
    'utf8'
  );
  assert.ok(
    /if \(temporalWorkerRuntime === 'available'\) \{\s+prepareTemporalWorkerRuntimeDependencies\(apiEnv\);\s+\}\s+const apiHandle = spawnProcess\('api-live-proof'/.test(
      source
    ),
    'Available workers must be prepared before API startup, without swallowing preparation failures'
  );
  const prepareOutbox = source.indexOf('prepareLiveProofOutboxWorkerDependencies();');
  assert.ok(
    prepareOutbox > 0 &&
      prepareOutbox < source.indexOf("const apiHandle = spawnProcess('api-live-proof'")
  );
  const startOutbox = source.indexOf('await startLiveProofOutboxWorker(apiEnv, processHandles);');
  assert.ok(startOutbox > source.indexOf("'API db/ready'"));
  assert.ok(startOutbox < source.indexOf('const webHandle = spawnProcess('));
});

test('outbox composition uses only the proof database, topology, archive and real local sink', () => {
  const apiEnv = Object.freeze(
    buildLiveProofApiEnv({
      databaseUrl: 'postgresql://proof:secret@127.0.0.1/proof',
      liveProofSchema: 'dvt_live_selected_closure_outbox',
      temporalAddress: '127.0.0.1:7233',
      temporalNamespace: 'default',
      sourceEnv: {
        DVT_OUTBOX_SHARD_COUNT: '8',
        DVT_OUTBOX_OWNED_SHARD_IDS: '7',
        DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
        DVT_OUTBOX_EVENT_BUS_MODE: 'http',
        DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
        DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY: 'C:\\unrelated-archive',
        DVT_START_RUN_MAX_OUTBOX_LAG_MS: '300000',
      },
    })
  );
  const workerEnv = buildLiveProofOutboxWorkerEnv(apiEnv, 19465);
  assert.equal(workerEnv.DATABASE_URL, apiEnv.DATABASE_URL);
  assert.equal(workerEnv.DVT_PG_SCHEMA, apiEnv.DVT_PG_SCHEMA);
  assert.equal(apiEnv.DVT_OUTBOX_SHARD_COUNT, '1');
  assert.equal(workerEnv.DVT_OUTBOX_SHARD_COUNT, apiEnv.DVT_OUTBOX_SHARD_COUNT);
  assert.equal(workerEnv.DVT_OUTBOX_OWNED_SHARD_IDS, '0');
  assert.equal(workerEnv.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
  assert.equal(workerEnv.DVT_OUTBOX_EVENT_BUS_MODE, 'log');
  assert.equal(workerEnv.DVT_OUTBOX_WORKER_RUN_MIGRATIONS, 'false');
  assert.equal(workerEnv.DVT_OUTBOX_ADMIN_HOST, '127.0.0.1');
  assert.equal(workerEnv.DVT_OUTBOX_ADMIN_PORT, '19465');
  assert.equal(workerEnv.SERVICE_NAME, 'dvt-outbox-worker-live-proof');
  assert.equal(workerEnv.DVT_START_RUN_BACKPRESSURE_MODE, 'enforce');
  assert.equal(workerEnv.DVT_START_RUN_MAX_OUTBOX_LAG_MS, '300000');
  assert.equal(workerEnv.DVT_PURGE_ENABLED, undefined);
  assert.equal(workerEnv.DVT_RUN_EVENT_RETENTION_ENABLED, undefined);
  assert.equal(
    workerEnv.DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY,
    path.resolve(
      __dirname,
      '../.dvt/live-proofs/selected-closure',
      apiEnv.DVT_PG_SCHEMA,
      'outbox-archive'
    )
  );
  assert.equal(apiEnv.DVT_OUTBOX_OWNERSHIP_MODE, 'passive');
  assert.equal(apiEnv.DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY, 'C:\\unrelated-archive');
});

test('outbox dependency preparation reuses the canonical builder and rejects spawn, exit and signal failures', () => {
  const calls = [];
  prepareLiveProofOutboxWorkerDependencies({
    spawnCommand: (...args) => {
      calls.push(args);
      return { status: 0, signal: null };
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], process.execPath);
  assert.deepEqual(calls[0][1], [
    path.resolve(__dirname, 'build-workspace-runtime-deps.cjs'),
    'dvt-outbox-worker',
  ]);
  assert.equal(calls[0][2].stdio, 'inherit');
  assert.equal(calls[0][2].windowsHide, true);
  const spawnError = new Error('build spawn failed');
  for (const result of [
    { error: spawnError },
    { status: 1 },
    { status: null, signal: 'SIGTERM' },
    { status: 0, signal: 'SIGTERM' },
  ]) {
    assert.throws(
      () => prepareLiveProofOutboxWorkerDependencies({ spawnCommand: () => result }),
      result.error ?? /Outbox worker runtime dependency build failed/
    );
  }
});

test('outbox startup owns its process before waiting and requires a fresh active service receipt', async () => {
  const apiEnv = {
    DATABASE_URL: 'postgresql://proof:secret@127.0.0.1/proof',
    DVT_PG_SCHEMA: 'proof',
  };
  const valid = {
    ready: true,
    owner: true,
    tickFresh: true,
    service: 'dvt-outbox-worker-live-proof',
  };
  for (const readiness of [
    valid,
    null,
    {},
    { ...valid, ready: false },
    { ...valid, owner: false },
    { ...valid, tickFresh: false },
    { ...valid, service: 'another-service' },
    'malformed',
    'http-201',
    'http-503',
    'exited',
  ]) {
    const handle = {};
    const handles = [];
    const calls = [];
    const start = startLiveProofOutboxWorker(apiEnv, handles, {
      allocateFreePort: async (host) => {
        assert.equal(host, '127.0.0.1');
        return 19465;
      },
      spawnProcess: (name, argv, env) => {
        calls.push('spawn');
        assert.equal(name, 'outbox-live-proof');
        assert.deepEqual(argv, ['--filter', 'dvt-outbox-worker', 'dev']);
        assert.doesNotMatch(JSON.stringify(argv), /secret/);
        assert.equal(env.DATABASE_URL, apiEnv.DATABASE_URL);
        return handle;
      },
      waitForUrlOrProcessExit: async (url, validator, timeout, interval, label, owned) => {
        calls.push('ready');
        assert.deepEqual(handles, [handle]);
        assert.equal(owned, handle);
        assert.equal(url, 'http://127.0.0.1:19465/readyz');
        assert.equal(timeout, 240_000);
        assert.equal(interval, 500);
        assert.equal(label, 'Outbox worker readyz');
        assert.equal(validator({ statusCode: 200 }), true);
        assert.equal(validator({ statusCode: 503 }), false);
        if (readiness === 'exited') throw new Error('worker exited before readiness');
      },
      fetch: async (url, options) => {
        calls.push('receipt');
        assert.equal(url, 'http://127.0.0.1:19465/readyz');
        assert.ok(options.signal instanceof AbortSignal);
        return {
          status:
            typeof readiness === 'string' && readiness.startsWith('http-')
              ? Number(readiness.slice(5))
              : 200,
          json: async () => {
            if (readiness === 'malformed') throw new SyntaxError('invalid readiness JSON');
            return typeof readiness === 'string' && readiness.startsWith('http-')
              ? valid
              : readiness;
          },
        };
      },
    });
    if (readiness === valid) await start;
    else await assert.rejects(start);
    assert.deepEqual(handles, [handle], 'failures retain the process for existing shutdown');
    assert.deepEqual(
      calls,
      readiness === 'exited' ? ['spawn', 'ready'] : ['spawn', 'ready', 'receipt']
    );
  }
});

test('resolveLiveProofSpecPath keeps the selected-closure proof as the default', () => {
  assert.equal(
    resolveLiveProofSpecPath([]),
    '/repo/apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts'
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
        restrictedApiBearerToken: 'restricted-proof-token',
        specPath: '/repo/apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
        workspaceScope: {
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'dev',
        },
        postgresTargetSchema: 'proof_schema',
        postgresDatabaseName: 'dvt_proof_selected_closure_1234',
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
      'CYPRESS_baseUrl',
      '-e',
      'CYPRESS_apiBaseUrl',
      '-e',
      'CYPRESS_apiBearerToken',
      '-e',
      'CYPRESS_restrictedApiBearerToken',
      '-e',
      'CYPRESS_workspaceTenantId',
      '-e',
      'CYPRESS_workspaceProjectId',
      '-e',
      'CYPRESS_workspaceEnvironmentId',
      '-e',
      'CYPRESS_postgresTargetSchema',
      '-e',
      'CYPRESS_postgresDatabaseName',
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
      restrictedApiBearerToken: 'restricted-proof-token',
      specPath: '/repo/apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      },
      postgresTargetSchema: 'proof_schema',
      postgresDatabaseName: 'dvt_proof_selected_closure_1234',
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
      restrictedApiBearerToken: 'restricted-proof-token',
      specPath: '/repo/apps/web/cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
      },
      postgresTargetSchema: 'proof_schema',
      postgresDatabaseName: 'dvt_proof_selected_closure_1234',
    }),
    {
      command: process.execPath,
      args: [
        path.join(__dirname, 'run-selected-closure-cypress.cjs'),
        '--spec',
        'cypress/e2e/dbt/dbt-project-import-source-live.cy.ts',
      ],
      env: {
        CYPRESS_baseUrl: 'http://127.0.0.1:4174',
        CYPRESS_apiBaseUrl: 'http://127.0.0.1:3300',
        CYPRESS_apiBearerToken: 'proof-token',
        CYPRESS_restrictedApiBearerToken: 'restricted-proof-token',
        CYPRESS_workspaceTenantId: 'tenant',
        CYPRESS_workspaceProjectId: 'project',
        CYPRESS_workspaceEnvironmentId: 'dev',
        CYPRESS_postgresTargetSchema: 'proof_schema',
        CYPRESS_postgresDatabaseName: 'dvt_proof_selected_closure_1234',
      },
    }
  );
});

test('buildLiveProofCypressNativeInvocation opens Chrome only when headed is explicit', () => {
  const invocation = buildLiveProofCypressNativeInvocation({
    apiPort: 3300,
    webPort: 4174,
    apiBearerToken: 'proof-token',
    specPath: '/repo/apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts',
    workspaceScope: {
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'dev',
    },
    headed: true,
  });

  assert.deepEqual(invocation.args.slice(-3), [
    '--spec',
    'cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts',
    '--headed',
  ]);
});

test('native and manual Docker browser children are registered before awaiting and keep tokens out of argv', async () => {
  const args = {
    apiPort: 3300,
    webPort: 4174,
    apiBearerToken: 'secret-token',
    specPath: '/repo/apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts',
    workspaceScope: { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' },
  };
  for (const runtime of ['native', 'docker']) {
    const handles = [];
    let complete;
    const handle = {
      completion: new Promise((resolve) => {
        complete = resolve;
      }),
    };
    const proof = runCypress(args, runtime, handles, {
      spawnLiveProofProcess: (_name, _command, argv, options) => {
        assert.doesNotMatch(JSON.stringify(argv), /secret-token/);
        assert.equal(options.env.CYPRESS_apiBearerToken, 'secret-token');
        assert.equal(options.shell, false);
        return handle;
      },
    });
    assert.deepEqual(handles, [handle]);
    complete({ code: 0, signal: null });
    await proof;
  }
  for (const outcome of [
    { code: 1, signal: null },
    { code: null, signal: 'SIGTERM' },
  ]) {
    await assert.rejects(
      runCypress(args, 'native', [], {
        spawnLiveProofProcess: () => ({ completion: Promise.resolve(outcome) }),
      }),
      /Cypress live selected-closure proof/
    );
  }
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

test('live proof keeps Chrome headless unless headed mode is explicit', () => {
  assert.equal(resolveLiveProofCypressHeaded({}), false);
  assert.equal(
    resolveLiveProofCypressHeaded({ DVT_SELECTED_CLOSURE_CYPRESS_HEADED: 'false' }),
    false
  );
  assert.equal(
    resolveLiveProofCypressHeaded({ DVT_SELECTED_CLOSURE_CYPRESS_HEADED: 'true' }),
    true
  );
  assert.throws(
    () => resolveLiveProofCypressHeaded({ DVT_SELECTED_CLOSURE_CYPRESS_HEADED: 'yes' }),
    /must be true or false/
  );
});

test('live proof omits only the Temporal worker when runtime absence is explicit', () => {
  assert.equal(resolveLiveProofTemporalWorkerRuntime({}), 'available');
  assert.equal(
    resolveLiveProofTemporalWorkerRuntime({
      DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'unavailable',
    }),
    'unavailable'
  );
  assert.throws(
    () =>
      resolveLiveProofTemporalWorkerRuntime({
        DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME: 'stubbed',
      }),
    /must be available or unavailable/
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
        'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts,apps/web/cypress/e2e/canvas/canvas-dvt-terminal-transform-preview-live.cy.ts',
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
  assert.equal(apiEnv.DVT_START_RUN_BACKPRESSURE_MODE, 'enforce');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(apiEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
  assert.equal(apiEnv.DVT_TEMPORAL_DVT_POSTGRES_ENABLED, 'true');
  assert.match(apiEnv.DVT_DBT_BUNDLE_FILE_ROOT, /[\\/]\.dvt[\\/]dev-stack[\\/]dbt-bundles$/);
  assert.match(
    apiEnv.DVT_WORKSPACE_FILES_ROOT,
    /[\\/]\.dvt[\\/]live-proofs[\\/]selected-closure[\\/]dvt_live_selected_closure_test[\\/]workspace-files$/
  );
  assert.equal(apiEnv.DVT_CAS_FILE_ROOT, undefined);
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
      DVT_CAS_FILE_ROOT: 'C:\\live-proof\\cas',
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
  assert.equal(workerEnv.DVT_CAS_FILE_ROOT, 'C:\\live-proof\\cas');
  assert.equal(workerEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(workerEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
  assert.equal(workerEnv.DVT_TEMPORAL_DVT_POSTGRES_ENABLED, 'true');
  assert.equal(workerEnv.DVT_DBT_BUNDLE_FILE_ROOT, apiEnv.DVT_DBT_BUNDLE_FILE_ROOT);
  assert.equal(workerEnv.DBT_PROFILES_DIR, apiEnv.DBT_PROFILES_DIR);
  assert.equal(workerEnv.DVT_DBT_BIN, apiEnv.DVT_DBT_BIN);
});

test('seedSelectedClosureLocalWarehouseProof explicitly seeds both external fixtures in the same lease', async () => {
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
      seedPcv1PostgresProofData: async (databaseUrl) => {
        calls.push(['pcv1', databaseUrl]);
      },
      log: (message) => {
        calls.push(['log', message]);
      },
    }
  );

  assert.deepEqual(calls, [
    ['log', '[selected-closure-live] Seeding local Postgres proof source data'],
    ['postgres', 'postgresql://user:pass@localhost:5432/dvt'],
    ['pcv1', 'postgresql://user:pass@localhost:5432/dvt'],
  ]);
});

test('PCV1 source preparation failure rejects the LIVE bootstrap without a fallback', async () => {
  const failure = new Error('External source preparation failed');
  await assert.rejects(
    seedSelectedClosureLocalWarehouseProof(
      { DATABASE_URL: 'postgresql://proof@127.0.0.1/claimed-lease' },
      {
        seedLocalPostgresProofData: async () => {},
        seedPcv1PostgresProofData: async () => {
          throw failure;
        },
        log: () => {},
      }
    ),
    (error) => error === failure
  );
});
