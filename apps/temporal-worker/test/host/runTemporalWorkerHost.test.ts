import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  parseExecutionPlan,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  RUN_PLAN_WORKFLOW,
  type ExecutionPlan,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { c as createTarball } from 'tar';
import { describe, expect, it, vi } from 'vitest';

import { runTemporalWorkerHost } from '../../src/host/runTemporalWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';
import {
  bootstrapRunMetadata,
  storeValidPlanArtifact,
  waitForRunCompleted,
} from '../support/temporalWorkerServiceTestSupport.js';

describe('runTemporalWorkerHost', () => {
  it('starts runtime, waits for abort, and stops cleanly', async () => {
    const start = vi.fn(async () => undefined);
    const stop = vi.fn(async () => undefined);
    const operationalServer = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const shutdown = new globalThis.AbortController();
    const monitor = createMonitor();
    let receivedSignal: globalThis.AbortSignal | undefined;

    const runPromise = runTemporalWorkerHost({
      env: createEnv(),
      logger: { info() {}, error() {} },
      monitor,
      operationalServer,
      shutdownSignal: shutdown.signal,
      createRuntime: async () => ({
        start: async (signal?: globalThis.AbortSignal) => {
          receivedSignal = signal;
          await start();
        },
        stop,
        getRunStateCircuitSnapshot: () => ({
          state: 'closed',
          consecutiveFailures: 0,
          openUntilEpochMs: null,
          tripCount: 0,
          rejectionCount: 0,
          failureCount: 0,
          timeoutCount: 0,
          halfOpenProbeCount: 0,
        }),
      }),
    });

    await waitFor(() => start.mock.calls.length === 1);
    shutdown.abort();
    await runPromise;

    expect(receivedSignal).toBe(shutdown.signal);
    expect(operationalServer.start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(operationalServer.stop).toHaveBeenCalledTimes(1);
    expect(monitor.getHealthSnapshot().state).toBe('stopped');
  });

  it('skips runtime bootstrap when shutdown was already requested', async () => {
    const operationalServer = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const shutdown = new globalThis.AbortController();
    shutdown.abort();
    const monitor = createMonitor();

    await runTemporalWorkerHost({
      env: createEnv(),
      logger: { info() {}, error() {} },
      monitor,
      operationalServer,
      shutdownSignal: shutdown.signal,
      createRuntime: async () => {
        throw new Error('runtime should not be created when shutdown is already requested');
      },
    });

    expect(operationalServer.start).toHaveBeenCalledTimes(1);
    expect(operationalServer.stop).toHaveBeenCalledTimes(1);
    expect(monitor.getHealthSnapshot().state).toBe('stopped');
  });
});

const describeIfPg = process.env['DVT_PG_INTEGRATION'] === '1' ? describe : describe.skip;

describeIfPg('runTemporalWorkerHost DBT canary', () => {
  it('runs a DBT-enabled workflow against Docker Postgres and exposes ready metrics', async () => {
    const connectionString =
      process.env['DVT_PG_URL'] ??
      process.env['DATABASE_URL'] ??
      'postgresql://dvt:dvt@localhost:5432/dvt';
    const schema = 'dvt';
    const tenantId = 't-it';
    const projectId = 'p-it';
    const environmentId = 'test';
    const namespace = 'default';
    const taskQueue = `dvt-worker-dbt-canary-${Date.now()}`;
    const runId = `run-worker-dbt-canary-${Date.now()}`;
    const canaryRoot = await mkdtemp(join(tmpdir(), 'dvt-worker-dbt-canary-'));
    const artifactRoot = join(canaryRoot, 'artifacts');
    const workdirRoot = join(canaryRoot, 'workdir');
    const dbtInvocationLogPath = join(canaryRoot, 'dbt-invocations.log');
    const runExecutionContextPath = join(canaryRoot, 'run-execution-context.json');
    const adminPort = 9500 + Math.floor(Math.random() * 200);
    let temporalEnv: TestWorkflowEnvironment | undefined;
    let runPromise: Promise<void> | undefined;
    const shutdown = new globalThis.AbortController();

    try {
      await mkdir(artifactRoot, { recursive: true });
      const { bundlePath, bundleSha256, bundleSizeBytes } = await createDbtProjectBundle({
        canaryRoot,
        artifactRoot,
        tenantId,
        dbtInvocationLogPath,
      });
      const plan = createDbtExecutionPlan({ tenantId, projectId, environmentId, runId });
      const planRef = await storeValidPlanArtifact({
        connectionString,
        schema,
        plan,
        tenantId,
        projectId,
        environmentId,
      });
      const ctxBase = {
        tenantId,
        projectId,
        environmentId,
        runId,
        targetAdapter: 'temporal' as const,
        logicalAttemptId: 1,
        originRunId: runId,
      };
      const runExecutionContext = parseRunExecutionContext({
        schemaVersion: 'v1.0',
        planId: planRef.planId,
        planVersion: planRef.planVersion,
        planSha256: planRef.sha256,
        tenantId,
        projectId,
        environmentId,
        targetAdapter: ctxBase.targetAdapter,
        createdAtIso: '2026-05-14T00:00:00.000Z',
        createdBy: 'local-canary',
        pluginContexts: {
          dbt: {
            projectBundleRef: {
              uri: pathToFileURL(bundlePath).href,
              kind: 'dbt-project-bundle',
              sha256: bundleSha256,
              tenantId,
              sizeBytes: bundleSizeBytes,
            },
            targetProfile: 'dbt-dev',
          },
        },
      });
      const runExecutionContextBytes = Buffer.from(JSON.stringify(runExecutionContext), 'utf8');
      await writeFile(runExecutionContextPath, runExecutionContextBytes);
      const ctx = {
        ...ctxBase,
        runExecutionContextRef: parseRunExecutionContextRef({
          uri: pathToFileURL(runExecutionContextPath).href,
          sha256: sha256Hex(runExecutionContextBytes),
          schemaVersion: runExecutionContext.schemaVersion,
          planId: runExecutionContext.planId,
          planVersion: runExecutionContext.planVersion,
        }),
      };

      await bootstrapRunMetadata({
        connectionString,
        schema,
        tenantId,
        projectId,
        environmentId,
        namespace,
        taskQueue,
        runId,
        planRef,
      });

      temporalEnv = await TestWorkflowEnvironment.createLocal();
      const env = loadEnv({
        NODE_ENV: 'development',
        LOG_LEVEL: 'silent',
        DATABASE_URL: connectionString,
        DVT_PG_SCHEMA: schema,
        DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: 'true',
        TEMPORAL_ADDRESS: temporalEnv.address,
        TEMPORAL_NAMESPACE: namespace,
        TEMPORAL_TASK_QUEUE: taskQueue,
        TEMPORAL_IDENTITY: 'dbt-worker-canary',
        DVT_TEMPORAL_ADMIN_HOST: '127.0.0.1',
        DVT_TEMPORAL_ADMIN_PORT: String(adminPort),
        DVT_TEMPORAL_DBT_ENABLED: 'true',
        DVT_DBT_BIN: process.execPath,
        DVT_DBT_WORKDIR_ROOT: workdirRoot,
        DVT_DBT_BUNDLE_STORE_BACKEND: 'file',
        DVT_DBT_BUNDLE_FILE_ROOT: artifactRoot,
      });
      const monitor = new TemporalWorkerMonitor({
        serviceName: env.SERVICE_NAME,
        logger: { info() {}, error() {} },
        enabledCapabilities: ['executor.dbt'],
      });
      const operationalServer = createOperationalServer({
        host: env.DVT_TEMPORAL_ADMIN_HOST,
        port: env.DVT_TEMPORAL_ADMIN_PORT,
        logger: { info() {} },
        monitor,
      });
      runPromise = runTemporalWorkerHost({
        env,
        logger: { info() {}, error() {} },
        monitor,
        operationalServer,
        shutdownSignal: shutdown.signal,
      });

      await waitForAsync(
        async () => (await getOperationalJson(adminPort, '/healthz')).status === 200
      );
      const readyz = await waitForAsync(async () => {
        const response = await getOperationalJson(adminPort, '/readyz');
        return response.status === 200 &&
          Array.isArray(response.body.capabilities) &&
          response.body.capabilities.includes('executor.dbt')
          ? response
          : false;
      });
      const metricsBefore = await getOperationalText(adminPort, '/metrics');
      const errorCountBefore = metricValue(metricsBefore.body, 'dvt_temporal_worker_error_total');

      await temporalEnv.client.workflow.start(RUN_PLAN_WORKFLOW, {
        taskQueue,
        workflowId: runId,
        args: [
          {
            planRef,
            ctx,
            maxContinueAsNewPayloadBytes: 500_000,
            continueAsNewAfterLayerCount: 100,
          },
        ],
      });

      const dbtInvocations = await waitForAsync(async () => {
        const log = await readFile(dbtInvocationLogPath, 'utf8').catch(() => '');
        return log.includes('--select s-3 --target dbt-dev') ? log.trim().split(/\r?\n/) : false;
      });
      const events = await waitForRunCompleted({
        connectionString,
        schema,
        tenantId,
        runId,
      });
      const metricsAfter = await getOperationalText(adminPort, '/metrics');

      expect(readyz.body).toMatchObject({
        ready: true,
        state: 'running',
        capabilities: ['executor.dbt'],
      });
      expect(metricValue(metricsAfter.body, 'dvt_temporal_worker_up')).toBe(1);
      expect(metricValue(metricsAfter.body, 'dvt_temporal_worker_ready')).toBe(1);
      expect(metricsAfter.body).toContain(
        'dvt_temporal_worker_capability_enabled{capability="executor.dbt"} 1'
      );
      expect(metricValue(metricsAfter.body, 'dvt_temporal_worker_error_total')).toBe(
        errorCountBefore
      );
      expect(dbtInvocations).toEqual([
        '--select s-1 --target dbt-dev',
        '--select s-2 --target dbt-dev',
        '--select s-3 --target dbt-dev',
      ]);
      expect(events.map((event) => `${event.eventType}:${event.stepId ?? '-'}`)).toEqual([
        'RunStarted:-',
        'StepStarted:s-1',
        'StepCompleted:s-1',
        'StepStarted:s-2',
        'StepCompleted:s-2',
        'StepStarted:s-3',
        'StepCompleted:s-3',
        'RunCompleted:-',
      ]);
    } finally {
      shutdown.abort();
      await runPromise;
      await temporalEnv?.teardown();
      await rm(canaryRoot, { recursive: true, force: true });
    }
  }, 120_000);
});

async function waitFor(predicate: () => boolean, timeoutMs = 100): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function waitForAsync<T>(
  predicate: () => Promise<T | false>,
  timeoutMs = 60_000
): Promise<T> {
  const startedAt = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      const result = await predicate();
      if (result !== false) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Condition not met before timeout${lastError ? `: ${lastError.message}` : ''}`);
}

async function createDbtProjectBundle(args: {
  canaryRoot: string;
  artifactRoot: string;
  tenantId: string;
  dbtInvocationLogPath: string;
}): Promise<{ bundlePath: string; bundleSha256: string; bundleSizeBytes: number }> {
  const projectRoot = join(args.canaryRoot, 'bundle-src');
  const bundleRoot = join(projectRoot, 'bundle');
  await mkdir(join(bundleRoot, 'models'), { recursive: true });
  await writeFile(
    join(bundleRoot, 'dbt_project.yml'),
    'name: canary\nversion: "1.0"\nprofile: canary\nmodel-paths: ["models"]\n'
  );
  await writeFile(
    join(bundleRoot, 'run'),
    [
      "const fs = require('node:fs');",
      `fs.appendFileSync(${JSON.stringify(args.dbtInvocationLogPath)}, process.argv.slice(2).join(' ') + '\\n');`,
      '',
    ].join('\n')
  );
  for (const stepId of ['s-1', 's-2', 's-3']) {
    await writeFile(join(bundleRoot, 'models', `${stepId}.sql`), `select '${stepId}' as step_id\n`);
  }

  const temporaryBundlePath = join(args.canaryRoot, 'bundle.tgz');
  await createTarball({ cwd: projectRoot, file: temporaryBundlePath, gzip: true }, ['bundle']);
  const bundleBytes = await readFile(temporaryBundlePath);
  const bundleSha256 = sha256Hex(bundleBytes);
  const bundlePath = join(args.artifactRoot, 'tenants', args.tenantId, bundleSha256);
  await mkdir(dirname(bundlePath), { recursive: true });
  await rename(temporaryBundlePath, bundlePath);

  return {
    bundlePath,
    bundleSha256,
    bundleSizeBytes: bundleBytes.byteLength,
  };
}

function createDbtExecutionPlan(args: {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
}): ExecutionPlan {
  const steps = [
    { stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] },
    { stepId: 's-2', kind: 'DBT_MODEL', dependsOn: ['s-1'] },
    { stepId: 's-3', kind: 'DBT_MODEL', dependsOn: ['s-2'] },
  ];
  const inputHashSha256 = sha256Hex(
    Buffer.from(`temporal-worker-dbt-canary:${args.runId}`, 'utf8')
  );
  const planId = sha256Hex(
    jcsCanonicalize({
      metadata: {
        planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        inputHashSha256,
      },
      steps,
    })
  );

  return parseExecutionPlan({
    metadata: {
      planId,
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256,
      createdAtIso: '2026-05-14T00:00:00.000Z',
      ownership: {
        tenantId: args.tenantId,
        projectId: args.projectId,
        environmentId: args.environmentId,
      },
    },
    observability: {
      extra: {
        transformationFlowRuntime: {
          previewProfile: 'planner-generic-v1',
          executor: 'dbt',
        },
      },
    },
    steps,
  });
}

async function getOperationalJson(
  port: number,
  path: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await globalThis.fetch(`http://127.0.0.1:${port}${path}`);
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

async function getOperationalText(
  port: number,
  path: string
): Promise<{ status: number; body: string }> {
  const response = await globalThis.fetch(`http://127.0.0.1:${port}${path}`);
  return {
    status: response.status,
    body: await response.text(),
  };
}

function metricValue(metrics: string, name: string): number {
  const line = metrics.split('\n').find((candidate) => candidate.startsWith(`${name} `));
  if (line === undefined) {
    throw new Error(`METRIC_MISSING:${name}`);
  }
  return Number(line.trim().split(/\s+/).at(-1));
}

function sha256Hex(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function createMonitor(): TemporalWorkerMonitor {
  return new TemporalWorkerMonitor({
    serviceName: 'dvt-temporal-worker',
    logger: { info() {}, error() {} },
    enabledCapabilities: [],
  });
}

function createEnv(): {
  NODE_ENV: 'test';
  LOG_LEVEL: 'info';
  SERVICE_NAME: string;
  DATABASE_URL: string;
  DVT_PG_SCHEMA: string;
  DVT_PG_STATEMENT_TIMEOUT_MS: number;
  DVT_PG_QUERY_TIMEOUT_MS: number;
  DVT_RUNSTATE_CIRCUIT_BREAKER_FAILURE_THRESHOLD: number;
  DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS: number;
  DVT_RUNSTATE_CIRCUIT_BREAKER_OPERATION_TIMEOUT_MS: number;
  DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: boolean;
  TEMPORAL_ADDRESS: string;
  TEMPORAL_NAMESPACE: string;
  TEMPORAL_TASK_QUEUE: string;
  TEMPORAL_IDENTITY: undefined;
  TEMPORAL_CONNECT_TIMEOUT_MS: undefined;
  TEMPORAL_REQUEST_TIMEOUT_MS: undefined;
  TEMPORAL_MAX_START_PAYLOAD_BYTES: undefined;
  TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: undefined;
  DVT_TEMPORAL_ADMIN_HOST: string;
  DVT_TEMPORAL_ADMIN_PORT: number;
  DVT_TEMPORAL_DBT_ENABLED: boolean;
  DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: boolean;
  DVT_TEMPORAL_HTTP_JSON_ENABLED: boolean;
  DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE: boolean;
  DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: string | undefined;
  DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: string | undefined;
  DVT_OBJECT_FILE_S3_ENDPOINT: string | undefined;
  DVT_OBJECT_FILE_S3_REGION: string | undefined;
  DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: boolean;
  DVT_DBT_BIN: string;
  DVT_DBT_WORKDIR_ROOT: string;
  DVT_DBT_BUNDLE_STORE_BACKEND: 'file' | 's3' | undefined;
  DVT_DBT_BUNDLE_S3_BUCKET: string | undefined;
  DVT_DBT_BUNDLE_FILE_ROOT: string | undefined;
} {
  return {
    NODE_ENV: 'test' as const,
    LOG_LEVEL: 'info' as const,
    SERVICE_NAME: 'dvt-temporal-worker',
    DATABASE_URL: 'postgres://localhost/dvt',
    DVT_PG_SCHEMA: 'dvt',
    DVT_PG_STATEMENT_TIMEOUT_MS: 0,
    DVT_PG_QUERY_TIMEOUT_MS: 0,
    DVT_RUNSTATE_CIRCUIT_BREAKER_FAILURE_THRESHOLD: 3,
    DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS: 10000,
    DVT_RUNSTATE_CIRCUIT_BREAKER_OPERATION_TIMEOUT_MS: 2000,
    DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: false,
    TEMPORAL_ADDRESS: 'temporal:7233',
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: 'dvt-temporal',
    TEMPORAL_IDENTITY: undefined,
    TEMPORAL_CONNECT_TIMEOUT_MS: undefined,
    TEMPORAL_REQUEST_TIMEOUT_MS: undefined,
    TEMPORAL_MAX_START_PAYLOAD_BYTES: undefined,
    TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: undefined,
    DVT_TEMPORAL_ADMIN_HOST: '127.0.0.1',
    DVT_TEMPORAL_ADMIN_PORT: 9468,
    DVT_TEMPORAL_DBT_ENABLED: false,
    DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: false,
    DVT_TEMPORAL_HTTP_JSON_ENABLED: false,
    DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE: false,
    DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: undefined,
    DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: undefined,
    DVT_OBJECT_FILE_S3_ENDPOINT: undefined,
    DVT_OBJECT_FILE_S3_REGION: undefined,
    DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: false,
    DVT_DBT_BIN: 'dbt',
    DVT_DBT_WORKDIR_ROOT: '/tmp/dvt',
    DVT_DBT_BUNDLE_STORE_BACKEND: undefined,
    DVT_DBT_BUNDLE_S3_BUCKET: undefined,
    DVT_DBT_BUNDLE_FILE_ROOT: undefined,
  };
}
