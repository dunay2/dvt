#!/usr/bin/env node
/**
 * Owned concern: boot a live protected-runtime browser proof lane for first
 * Canvas authoring.
 */
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { Client } = require('pg');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');

const { defaultPgUrl } = require('./run-local-postgres.cjs');
const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  resolveDevWorkspaceScope,
  startLocalProtectedRuntimeAuth,
} = require('./run-dev-stack.auth.cjs');

class CanvasFirstAuthoringLiveProofRunner {
  constructor(env = process.env) {
    this.env = env;
    this.pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    this.apiPort = 3300;
    this.webPort = 4174;
    this.readyTimeoutMs = 240_000;
    this.pollIntervalMs = 500;
    this.postgresBootstrapScript = path.resolve(__dirname, 'run-local-postgres.cjs');
    this.temporalPackageRoot = path.resolve(__dirname, '../packages/@dvt/adapter-temporal');
    this.specPath = '/repo/apps/web/cypress/e2e/canvas/canvas-first-authoring-live.cy.ts';
    this.cypressImage = 'cypress/included:15.18.1';
    this.localAuthHost = '127.0.0.1';
    this.apiBindHost = '0.0.0.0';
    this.webBindHost = '0.0.0.0';
    this.processHandles = [];
  }

  quoteIdentifier(identifier) {
    return `"${identifier.replaceAll('"', '""')}"`;
  }

  allocateLiveProofSchema() {
    return `dvt_live_first_authoring_${Date.now()}_${process.pid}`;
  }

  allocateFirstAuthoringRunId() {
    return `${Date.now().toString(36)}-${process.pid.toString(36)}`;
  }

  buildFirstAuthoringWorkspaceScopes(baseScope, runId) {
    return ['transformation', 'dbt'].map((variant) => ({
      tenantId: baseScope.tenantId,
      projectId: `${baseScope.projectId}-tf-e2-m-c-first-authoring-${variant}-${runId}`,
      environmentId: baseScope.environmentId,
    }));
  }

  formatWorkspaceOptions(scopes, key) {
    return scopes.map((scope) => `${scope[key]}|${scope[key]}`).join(',');
  }

  pipePrefixedOutput(stream, prefix) {
    const lineReader = readline.createInterface({ input: stream });
    lineReader.on('line', (line) => {
      console.log(`${prefix} ${line}`);
    });
    return lineReader;
  }

  spawnProcess(name, args, envOverrides = {}) {
    const child = spawn(this.pnpmCommand, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...this.env, ...envOverrides },
      shell: process.platform === 'win32',
      windowsHide: true,
    });

    return {
      name,
      child,
      stdoutReader: this.pipePrefixedOutput(child.stdout, `[${name}]`),
      stderrReader: this.pipePrefixedOutput(child.stderr, `[${name}]`),
    };
  }

  request(url) {
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

  async waitForUrl(url, validator, label) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < this.readyTimeoutMs) {
      try {
        const response = await this.request(url);
        if (validator(response)) {
          return;
        }
        lastError = new Error(`${label} responded with ${response.statusCode}`);
      } catch (error) {
        lastError = error;
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }

    throw new Error(
      `${label} did not become ready within ${this.readyTimeoutMs}ms. Last error: ${
        lastError?.message ?? 'unknown'
      }`
    );
  }

  ensureLocalPostgresReady() {
    const result = spawnSync(process.execPath, [this.postgresBootstrapScript, 'up'], {
      stdio: 'inherit',
      env: this.env,
      windowsHide: true,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`Local Postgres bootstrap failed with exit code ${result.status}`);
    }
  }

  async loadTemporalTesting() {
    const temporalTestingEntry = require.resolve('@temporalio/testing', {
      paths: [this.temporalPackageRoot],
    });

    return import(pathToFileURL(temporalTestingEntry).href);
  }

  async terminateProcess(processHandle) {
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

  async closeReaders(processHandle) {
    processHandle.stdoutReader.close();
    processHandle.stderrReader.close();
  }

  async dropSchemaIfExists(databaseUrl, schema) {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      await client.query(`DROP SCHEMA IF EXISTS ${this.quoteIdentifier(schema)} CASCADE`);
    } finally {
      await client.end();
    }
  }

  async seedProtectedRuntimeGrants(args) {
    const projectAccess = args.workspaceScopes.map((scope) => ({
      projectId: scope.projectId,
      allowedActions: [],
      environmentAccess: [
        {
          environmentId: scope.environmentId,
          allowedActions: [],
        },
      ],
    }));
    const tenantAccess = JSON.stringify([
      {
        tenantId: args.workspaceScope.tenantId,
        allowedActions: [...args.tenantActions],
        projectAccess,
      },
    ]);
    const client = new Client({ connectionString: args.databaseUrl });

    await client.connect();

    try {
      await client.query(
        `INSERT INTO ${this.quoteIdentifier(args.schema)}.principal_grants
           (principal_id, principal_type, suspended, tenant_access)
         VALUES ($1, 'user', FALSE, $2::jsonb)
         ON CONFLICT (principal_id, principal_type)
         DO UPDATE SET tenant_access = EXCLUDED.tenant_access,
                       suspended = FALSE,
                       updated_at = NOW()`,
        [args.principalId, tenantAccess]
      );
    } finally {
      await client.end();
    }
  }

  async runCypress(args) {
    const repoRoot = path.resolve(__dirname, '..').replaceAll('\\', '/');
    const dockerArgs = [
      'run',
      '--rm',
      '-t',
      '-v',
      `${repoRoot}:/repo`,
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
      '-e',
      `CYPRESS_firstAuthoringRunId=${args.firstAuthoringRunId}`,
      '-e',
      'CYPRESS_requireLiveProtectedRuntime=1',
      this.cypressImage,
      '--project',
      '/repo/apps/web',
      '--config-file',
      '/repo/apps/web/cypress.config.ts',
      '--spec',
      this.specPath,
    ];

    const child = spawn('docker', dockerArgs, {
      stdio: 'inherit',
      windowsHide: true,
    });

    const [exitCode] = await once(child, 'exit');

    if (typeof exitCode !== 'number' || exitCode !== 0) {
      throw new Error(`Cypress live first-authoring proof failed with exit code ${exitCode}`);
    }
  }

  async shutdown(processContext) {
    await Promise.all(this.processHandles.map((handle) => this.terminateProcess(handle)));
    await Promise.all(this.processHandles.map((handle) => this.closeReaders(handle)));
    await processContext.localProtectedRuntimeAuth?.close();
    await processContext.temporalEnv?.teardown();
  }

  async run() {
    this.ensureLocalPostgresReady();

    const { TestWorkflowEnvironment } = await this.loadTemporalTesting();
    const processContext = {
      temporalEnv: null,
      localProtectedRuntimeAuth: null,
    };
    const liveProofSchema = this.allocateLiveProofSchema();
    const firstAuthoringRunId = this.allocateFirstAuthoringRunId();
    const baseWorkspaceScope = resolveDevWorkspaceScope(this.env);
    const firstAuthoringScopes = this.buildFirstAuthoringWorkspaceScopes(
      baseWorkspaceScope,
      firstAuthoringRunId
    );
    const firstAuthoringProjectIds = firstAuthoringScopes.map((scope) => scope.projectId);

    try {
      processContext.temporalEnv = await TestWorkflowEnvironment.createTimeSkipping();
      processContext.localProtectedRuntimeAuth = await startLocalProtectedRuntimeAuth({
        env: this.env,
        host: this.localAuthHost,
        additionalProjectIds: firstAuthoringProjectIds,
      });

      const apiHandle = this.spawnProcess(
        'api-first-authoring-proof',
        ['--filter', 'dvt-api', 'dev'],
        {
          HOST: this.apiBindHost,
          PORT: String(this.apiPort),
          DATABASE_URL: defaultPgUrl,
          DVT_PG_SCHEMA: liveProofSchema,
          DVT_READYZ_ENABLED: 'true',
          DVT_VERSION_ENABLED: 'true',
          DVT_DB_READY_ENABLED: 'true',
          TEMPORAL_ADDRESS: processContext.temporalEnv.connection.options.address,
          TEMPORAL_NAMESPACE: processContext.temporalEnv.namespace,
          TEMPORAL_TASK_QUEUE: 'dvt-temporal',
          ...processContext.localProtectedRuntimeAuth.oidcEnv,
        }
      );
      this.processHandles.push(apiHandle);

      await this.waitForUrl(
        `http://127.0.0.1:${this.apiPort}/healthz`,
        (response) => response.statusCode === 200,
        'API healthz'
      );
      await this.waitForUrl(
        `http://127.0.0.1:${this.apiPort}/db/ready`,
        (response) => response.statusCode === 200,
        'API db/ready'
      );
      await this.waitForUrl(
        `http://127.0.0.1:${this.apiPort}/readyz`,
        (response) => response.statusCode === 200,
        'API readyz'
      );
      await this.waitForUrl(
        `http://127.0.0.1:${this.apiPort}/version`,
        (response) => response.statusCode === 200,
        'API version'
      );

      await this.seedProtectedRuntimeGrants({
        databaseUrl: defaultPgUrl,
        schema: liveProofSchema,
        principalId: processContext.localProtectedRuntimeAuth.principalId,
        tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
        workspaceScope: processContext.localProtectedRuntimeAuth.workspaceScope,
        workspaceScopes: firstAuthoringScopes,
      });

      const webHandle = this.spawnProcess(
        'web-first-authoring-proof',
        [
          '--filter',
          '@dvt/web',
          'exec',
          'vite',
          '--host',
          this.webBindHost,
          '--port',
          String(this.webPort),
          '--strictPort',
        ],
        {
          VITE_API_BASE_URL: `http://host.docker.internal:${this.apiPort}`,
          ...processContext.localProtectedRuntimeAuth.webEnv,
          VITE_DEFAULT_TENANT_ID: processContext.localProtectedRuntimeAuth.workspaceScope.tenantId,
          VITE_DEFAULT_PROJECT_ID:
            processContext.localProtectedRuntimeAuth.workspaceScope.projectId,
          VITE_DEFAULT_ENVIRONMENT_ID:
            processContext.localProtectedRuntimeAuth.workspaceScope.environmentId,
          VITE_TENANT_OPTIONS: this.formatWorkspaceOptions(firstAuthoringScopes, 'tenantId'),
          VITE_PROJECT_OPTIONS: this.formatWorkspaceOptions(firstAuthoringScopes, 'projectId'),
          VITE_ENVIRONMENT_OPTIONS: this.formatWorkspaceOptions(
            firstAuthoringScopes,
            'environmentId'
          ),
          VITE_GIT_BRANCH: 'main',
          VITE_GIT_SHA: 'local',
          VITE_GIT_REPO: 'dunay2/dvt',
          VITE_GRAPH_ARTIFACT_PATH: 'pipelines/sales_pipeline.yaml',
          VITE_PLATFORM_HEALTH_OPTIONAL_PROBES: '',
        }
      );
      this.processHandles.push(webHandle);

      await this.waitForUrl(
        `http://127.0.0.1:${this.webPort}/`,
        (response) => (response.statusCode ?? 500) < 500,
        'Web dev server'
      );

      await this.runCypress({
        apiPort: this.apiPort,
        webPort: this.webPort,
        apiBearerToken: processContext.localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
        workspaceScope: processContext.localProtectedRuntimeAuth.workspaceScope,
        firstAuthoringRunId,
      });
    } finally {
      await this.shutdown(processContext);
      await this.dropSchemaIfExists(defaultPgUrl, liveProofSchema);
    }
  }
}

async function main() {
  await new CanvasFirstAuthoringLiveProofRunner().run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
