const test = require('node:test');
const assert = require('node:assert/strict');

const { CanvasSourceImportLiveProofRunner } = require('./run-canvas-source-import-live-proof.cjs');

test('source import live proof starts the API without the package predev lifecycle', () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  assert.deepEqual(runner.buildApiProcessArgs(), [
    '--filter',
    'dvt-api',
    'exec',
    'tsx',
    'watch',
    'src/server.ts',
  ]);
});

test('source import live proof starts with tenant project-creation authority and no phantom projects', () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  assert.deepEqual(runner.buildInitialTenantAccess('tenant-a', ['project:create']), [
    {
      tenantId: 'tenant-a',
      allowedActions: ['project:create'],
      projectAccess: [],
    },
  ]);
});

test('source import live proof rejects an empty tenant id for its initial grant', () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  assert.throws(() => runner.buildInitialTenantAccess('', ['project:create']), /tenant id/);
});

test('source import live proof exposes each workspace option once', () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  assert.equal(
    runner.formatWorkspaceOptions(
      [
        { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' },
        { tenantId: 'tenant-a', projectId: 'project-b', environmentId: 'test' },
      ],
      'tenantId'
    ),
    'tenant-a|tenant-a'
  );
});

test('source import live proof uses locally resolvable Cypress dependencies on Windows', () => {
  const runner = new CanvasSourceImportLiveProofRunner(
    {
      ELECTRON_RUN_AS_NODE: '1',
      EXISTING_ENV: 'preserved',
    },
    'canvas-source-identity-live.cy.ts'
  );
  const invocation = runner.buildCypressInvocation(
    {
      apiPort: 3300,
      webPort: 4174,
      apiBearerToken: 'test-token',
      workspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'proof-project',
        environmentId: 'dev',
      },
      secondaryWorkspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'proof-project-b',
        environmentId: 'test',
      },
      sourceImportRunId: 'run-1',
    },
    'win32'
  );

  assert.equal(invocation.command, 'pnpm.cmd');
  assert.equal(invocation.options.cwd, runner.webPackageRoot);
  assert.deepEqual(invocation.args.slice(0, 4), ['exec', 'cypress', 'run', '--config-file']);
  assert.equal(invocation.options.env.CYPRESS_baseUrl, 'http://127.0.0.1:4174');
  assert.equal(invocation.options.env.CYPRESS_apiBaseUrl, 'http://127.0.0.1:3300');
  assert.equal(invocation.options.env.CYPRESS_workspaceProjectId, 'proof-project');
  assert.equal(invocation.options.env.CYPRESS_firstAuthoringProjectId, 'proof-project');
  assert.equal(invocation.options.env.CYPRESS_secondaryWorkspaceTenantId, 'tenant-a');
  assert.equal(invocation.options.env.CYPRESS_secondaryWorkspaceProjectId, 'proof-project-b');
  assert.equal(invocation.options.env.CYPRESS_secondaryWorkspaceEnvironmentId, 'test');
  assert.equal(invocation.options.env.CYPRESS_apiBearerToken, 'test-token');
  assert.equal(invocation.options.env.CYPRESS_requireLiveProtectedRuntime, '1');
  assert.match(
    invocation.args[invocation.args.indexOf('--spec') + 1],
    /canvas-source-identity-live\.cy\.ts$/u
  );
  assert.equal(invocation.options.env.EXISTING_ENV, 'preserved');
  assert.equal(invocation.options.env.ELECTRON_RUN_AS_NODE, undefined);
});

test('source import live proof retains the isolated Docker Cypress lane on POSIX hosts', () => {
  const runner = new CanvasSourceImportLiveProofRunner({});
  const invocation = runner.buildCypressInvocation(
    {
      apiPort: 3300,
      webPort: 4174,
      apiBearerToken: 'test-token',
      workspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'proof-project',
        environmentId: 'dev',
      },
      secondaryWorkspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'proof-project-b',
        environmentId: 'test',
      },
      sourceImportRunId: 'run-1',
    },
    'linux'
  );

  assert.equal(invocation.command, 'docker');
  assert.ok(invocation.args.includes('CYPRESS_baseUrl=http://host.docker.internal:4174'));
  assert.ok(invocation.args.includes('CYPRESS_workspaceProjectId=proof-project'));
  assert.ok(invocation.args.includes('CYPRESS_firstAuthoringProjectId=proof-project'));
  assert.ok(invocation.args.includes('CYPRESS_secondaryWorkspaceTenantId=tenant-a'));
  assert.ok(invocation.args.includes('CYPRESS_secondaryWorkspaceProjectId=proof-project-b'));
  assert.ok(invocation.args.includes('CYPRESS_secondaryWorkspaceEnvironmentId=test'));
  assert.ok(invocation.args.includes(runner.cypressImage));
  assert.ok(invocation.args.includes(runner.specPath));
});

test('source import live proof uses an explicit local Temporal test server binary', async () => {
  const temporalServerPath = 'C:\\tools\\temporal-test-server.exe';
  const calls = [];
  const runner = new CanvasSourceImportLiveProofRunner({
    DVT_TEMPORAL_TEST_SERVER_PATH: temporalServerPath,
  });

  await runner.createTemporalEnvironment({
    createTimeSkipping: async (options) => {
      calls.push(options);
      return { namespace: 'default' };
    },
  });

  assert.deepEqual(calls, [
    {
      server: {
        executable: {
          type: 'existing-path',
          path: temporalServerPath,
        },
      },
    },
  ]);
});

test('source import live proof reports an actionable Temporal server bootstrap failure', async () => {
  const runner = new CanvasSourceImportLiveProofRunner({});

  await assert.rejects(
    () =>
      runner.createTemporalEnvironment({
        createTimeSkipping: async () => {
          throw new Error('error sending request for url: dns error');
        },
      }),
    /DVT_TEMPORAL_TEST_SERVER_PATH/
  );
});
