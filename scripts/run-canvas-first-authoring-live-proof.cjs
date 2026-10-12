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
const { buildLiveCypressInvocation } = require('./live-cypress-invocation.cjs');
const { buildInitialTenantAccess, createGovernedProject } = require('./live-governed-project.cjs');
const {
  allocateDisposablePostgresDatabase,
  installDisposablePostgresInterruptCleanup,
} = require('./disposable-postgres-database.cjs');
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
    this.webPackageRoot = path.resolve(__dirname, '../apps/web');
    this.localSpecPath = path.resolve(
      this.webPackageRoot,
      'cypress/e2e/canvas/canvas-first-authoring-live.cy.ts'
    );
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

  async seedProtectedRuntimeGrants(args) {
    const tenantAccess = JSON.stringify(
      buildInitialTenantAccess(args.tenantId, args.tenantActions)
    );
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

  buildCypressInvocation(args, platform = process.platform) {
    const host = platform === 'win32' ? '127.0.0.1' : 'host.docker.internal';
    return buildLiveCypressInvocation({
      platform,
      inheritedEnv: this.env,
      repoRoot: path.resolve(__dirname, '..'),
      webPackageRoot: this.webPackageRoot,
      localSpecPaths: [this.localSpecPath],
      containerSpecPaths: [this.specPath],
      cypressImage: this.cypressImage,
      cypressEnv: {
        baseUrl: `http://${host}:${args.webPort}`,
        apiBaseUrl: `http://${host}:${args.apiPort}`,
        apiBearerToken: args.apiBearerToken,
        workspaceTenantId: args.workspaceScope.tenantId,
        workspaceProjectId: args.workspaceScope.projectId,
        workspaceEnvironmentId: args.workspaceScope.environmentId,
        firstAuthoringProjectId: args.workspaceScope.projectId,
        firstAuthoringRunId: args.firstAuthoringRunId,
        requireLiveProtectedRuntime: '1',
      },
    });
  }

  async runCypress(args) {
    const invocation = this.buildCypressInvocation(args);
    const child = spawn(invocation.command, invocation.args, invocation.options);

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
    const lease = await allocateDisposablePostgresDatabase(defaultPgUrl, 'first_authoring');
    const databaseUrl = lease.url;
    const processContext = {
      temporalEnv: null,
      localProtectedRuntimeAuth: null,
    };
    const liveProofSchema = this.allocateLiveProofSchema();
    const firstAuthoringRunId = this.allocateFirstAuthoringRunId();
    const baseWorkspaceScope = resolveDevWorkspaceScope(this.env);
    const removeInterruptCleanup = installDisposablePostgresInterruptCleanup(lease, () =>
      this.shutdown(processContext)
    );

    try {
      const { TestWorkflowEnvironment } = await this.loadTemporalTesting();
      processContext.temporalEnv = await TestWorkflowEnvironment.createTimeSkipping();
      processContext.localProtectedRuntimeAuth = await startLocalProtectedRuntimeAuth({
        env: this.env,
        host: this.localAuthHost,
        assertedProjectIds: [],
      });

      const apiHandle = this.spawnProcess(
        'api-first-authoring-proof',
        ['--filter', 'dvt-api', 'exec', 'tsx', 'watch', 'src/server.ts'],
        {
          HOST: this.apiBindHost,
          PORT: String(this.apiPort),
          DATABASE_URL: databaseUrl,
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
        databaseUrl,
        schema: liveProofSchema,
        principalId: processContext.localProtectedRuntimeAuth.principalId,
        tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
        tenantId: baseWorkspaceScope.tenantId,
      });

      const firstAuthoringWorkspaceScope = await createGovernedProject({
        apiBaseUrl: `http://127.0.0.1:${this.apiPort}`,
        bearerToken: processContext.localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
        tenantId: baseWorkspaceScope.tenantId,
        name: `First authoring ${firstAuthoringRunId}`,
        idempotencyKey: `first-authoring-${firstAuthoringRunId}`,
      });
      const firstAuthoringScopes = [firstAuthoringWorkspaceScope];

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
          VITE_API_BASE_URL: `http://${
            process.platform === 'win32' ? '127.0.0.1' : 'host.docker.internal'
          }:${this.apiPort}`,
          ...processContext.localProtectedRuntimeAuth.webEnv,
          VITE_DEFAULT_TENANT_ID: firstAuthoringWorkspaceScope.tenantId,
          VITE_DEFAULT_PROJECT_ID: firstAuthoringWorkspaceScope.projectId,
          VITE_DEFAULT_ENVIRONMENT_ID: firstAuthoringWorkspaceScope.environmentId,
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
        workspaceScope: firstAuthoringWorkspaceScope,
        firstAuthoringRunId,
      });
    } finally {
      removeInterruptCleanup();
      try {
        await this.shutdown(processContext);
      } finally {
        await lease.dispose();
      }
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
