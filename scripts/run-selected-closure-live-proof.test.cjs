const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLiveProofApiEnv,
  buildLiveProofTemporalWorkerEnv,
  resolveLiveProofSpecPath,
  seedSelectedClosureLocalWarehouseProof,
} = require('./run-selected-closure-live-proof.cjs');
const { defaultPgUrl } = require('./run-temporal-postgres-proof.cjs');

test('resolveLiveProofSpecPath keeps the selected-closure proof as the default', () => {
  assert.equal(
    resolveLiveProofSpecPath([]),
    '/repo/apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
  );
});

test('resolveLiveProofSpecPath maps a governed repository Cypress spec into the container', () => {
  assert.equal(
    resolveLiveProofSpecPath([
      '--spec',
      'apps\\web\\cypress\\e2e\\canvas\\canvas-dbt-author-code-run-live.cy.ts',
    ]),
    '/repo/apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
  );
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
  assert.equal(apiEnv.DVT_LOCAL_POSTGRES_WAREHOUSE_URL, defaultPgUrl);
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
  assert.equal(apiEnv.OIDC_ISSUER, 'https://issuer.local.dvt/');
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
