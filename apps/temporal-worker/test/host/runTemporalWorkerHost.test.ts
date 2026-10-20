import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { TemporalWorkerHost, type TemporalWorkerRunResult } from '@dvt/adapter-temporal';
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
import { Context } from '@temporalio/activity';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { GracefulShutdownPeriodExpiredError, NativeConnection, Worker } from '@temporalio/worker';
import { c as createTarball } from 'tar';
import { describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';

import { runTemporalWorkerHost } from '../../src/host/runTemporalWorkerHost.js';
import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';
import { loadEnv } from '../../src/plugins/env.js';
import {
  createTemporalWorkerRuntime,
  type RuntimeHandle,
} from '../../src/runtime/createTemporalWorkerRuntime.js';
import { createTemporalWorkerStores } from '../../src/runtime/temporalWorkerStores.js';
import {
  bootstrapRunMetadata,
  storeValidPlanArtifact,
  waitForRunCompleted,
} from '../support/temporalWorkerServiceTestSupport.js';

describe('runTemporalWorkerHost', () => {
  it('starts runtime, waits for abort, and stops cleanly', async () => {
    const completion = deferred<TemporalWorkerRunResult>();
    const start = vi.fn(async () => undefined);
    const stop = vi.fn(async () => {
      completion.resolve({ status: 'completed' });
    });
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
        getRunCompletion: () => completion.promise,
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

describe('worker termination propagation', () => {
  it.each([new Error('diagnostic sink failed'), undefined])(
    'reports SDK and diagnostic errors while closing resources: %s',
    async (diagnosticError) => {
      const fixture = createHostLifecycleFixture();
      const fatal = new Error('native SDK failed');
      fixture.completion.resolve({ status: 'failed', error: fatal, diagnosticError });
      fixture.releaseStop.resolve();
      const error = await runTemporalWorkerHost(fixture.options).catch(
        (failure: unknown) => failure
      );
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toEqual([
        fatal,
        diagnosticError === undefined ? new Error('UnknownError') : diagnosticError,
      ]);
      expect(fixture.runtime.stop).toHaveBeenCalledTimes(1);
      expect(fixture.operationalServer.stop).toHaveBeenCalledTimes(1);
    }
  );

  it('closes resources when a completion provider violates its fulfilled-result contract', async () => {
    const fixture = createHostLifecycleFixture();
    const violation = new Error('completion provider rejected');
    fixture.runtime.getRunCompletion.mockReturnValue(Promise.reject(violation));
    fixture.releaseStop.resolve();
    const result = runTemporalWorkerHost(fixture.options).catch((error: unknown) => error);
    expect(await withDeadline(result)).toBe(violation);
    expect(fixture.runtime.stop).toHaveBeenCalledTimes(1);
    expect(fixture.operationalServer.stop).toHaveBeenCalledTimes(1);
  });

  it.each(['completed', 'failed', 'immediate-failure', 'abort-and-failure'] as const)(
    'withdraws real HTTP readiness and joins cleanup on %s',
    async (scenario) => {
      const fixture = createHostLifecycleFixture();
      const fatal = new Error('native worker failed');
      const outcome: TemporalWorkerRunResult =
        scenario === 'completed' ? { status: 'completed' } : { status: 'failed', error: fatal };
      if (scenario === 'immediate-failure') fixture.completion.resolve(outcome);
      const server = createOperationalServer({
        host: '127.0.0.1',
        port: 0,
        logger: { info() {} },
        monitor: fixture.monitor,
      });
      const serverStop = vi.spyOn(server, 'stop');
      const host = runTemporalWorkerHost({ ...fixture.options, operationalServer: server });
      const result = host.then(
        () => null,
        (error: unknown) => error
      );
      try {
        if (scenario !== 'immediate-failure') {
          await withDeadline(fixture.ready.promise);
          const address = server.getAddress();
          if (address === null) throw new Error('Operational server not listening');
          expect((await getOperationalJson(address.port, '/readyz')).status).toBe(200);
          if (scenario === 'abort-and-failure') fixture.shutdown.abort();
          fixture.completion.resolve(outcome);
        }
        await withDeadline(fixture.stopping.promise);
        const address = server.getAddress();
        if (address === null) throw new Error('Operational server not listening');
        const health = await getOperationalJson(address.port, '/readyz');
        expect(health.status).toBe(503);
        expect(health.body.ready).toBe(false);
        expect(serverStop).not.toHaveBeenCalled();
        fixture.releaseStop.resolve();
        expect(await withDeadline(result)).toBe(scenario === 'completed' ? null : fatal);
        expect(fixture.runtime.stop).toHaveBeenCalledTimes(1);
        expect(serverStop).toHaveBeenCalledTimes(1);
        if (scenario !== 'completed') {
          expect(fixture.monitor.getHealthSnapshot().lastErrorMessage).toBe(fatal.message);
        }
        if (scenario === 'immediate-failure') expect(fixture.onStarted).not.toHaveBeenCalled();
      } finally {
        fixture.shutdown.abort();
        fixture.completion.resolve(outcome);
        fixture.releaseStop.resolve();
        await result;
        await server.stop();
      }
    }
  );

  it.each(['ops', 'create', 'start'] as const)(
    'preserves both cleanup failures after abort at %s',
    async (checkpoint) => {
      const fixture = createHostLifecycleFixture();
      const runtimeFailure = new Error('runtime cleanup failed');
      const serverFailure = new Error('server cleanup failed');
      fixture.runtime.stop.mockImplementation(async () => {
        throw runtimeFailure;
      });
      fixture.operationalServer.stop.mockImplementation(async () => {
        throw serverFailure;
      });
      fixture.completion.resolve({ status: 'completed' });
      fixture.operationalServer.start.mockImplementation(async () => {
        if (checkpoint === 'ops') fixture.shutdown.abort();
      });
      fixture.runtime.start.mockImplementation(async () => {
        if (checkpoint === 'start') fixture.shutdown.abort();
      });
      const host = runTemporalWorkerHost({
        ...fixture.options,
        createRuntime: async () => {
          if (checkpoint === 'create') fixture.shutdown.abort();
          return fixture.runtime;
        },
      });
      const error = await host.then(
        () => null,
        (failure: unknown) => failure
      );
      if (checkpoint === 'ops') {
        expect(error).toBe(serverFailure);
        expect(fixture.runtime.stop).not.toHaveBeenCalled();
      } else {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toEqual([runtimeFailure, serverFailure]);
        expect(fixture.runtime.stop).toHaveBeenCalledTimes(1);
      }
      expect(fixture.operationalServer.stop).toHaveBeenCalledTimes(1);
    }
  );

  it('retains fatal AbortError and cleanup failure when shutdown races termination', async () => {
    const fixture = createHostLifecycleFixture();
    const fatal = new Error('fatal SDK abort');
    fatal.name = 'AbortError';
    const cleanupFailure = new Error('cleanup failed');
    fixture.runtime.stop.mockImplementation(async () => {
      throw cleanupFailure;
    });
    const host = runTemporalWorkerHost(fixture.options);
    const result = host.then(
      () => null,
      (error: unknown) => error
    );
    await withDeadline(fixture.ready.promise);
    fixture.shutdown.abort();
    fixture.completion.resolve({ status: 'failed', error: fatal });
    const error = await withDeadline(result);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([fatal, cleanupFailure]);
    expect(fixture.operationalServer.stop).toHaveBeenCalledTimes(1);
  });

  it('preserves native failure when startup throws AbortError after beginning a run', async () => {
    const fixture = createHostLifecycleFixture();
    const fatal = new Error('native run failed during startup');
    fixture.runtime.start.mockImplementation(async () => {
      fixture.completion.resolve({ status: 'failed', error: fatal });
      fixture.shutdown.abort();
      throw Object.assign(new Error('startup cancelled'), { name: 'AbortError' });
    });
    fixture.releaseStop.resolve();
    await expect(runTemporalWorkerHost(fixture.options)).rejects.toBe(fatal);
    expect(fixture.runtime.stop).toHaveBeenCalledTimes(1);
    expect(fixture.operationalServer.stop).toHaveBeenCalledTimes(1);
    expect(fixture.monitor.getHealthSnapshot().lastErrorMessage).toBe(fatal.message);
  });

  it('removes the abort listener when native completion wins', async () => {
    const fixture = createHostLifecycleFixture();
    const add = vi.spyOn(fixture.shutdown.signal, 'addEventListener');
    const remove = vi.spyOn(fixture.shutdown.signal, 'removeEventListener');
    fixture.releaseStop.resolve();
    const host = runTemporalWorkerHost(fixture.options);
    try {
      await withDeadline(fixture.ready.promise);
      fixture.completion.resolve({ status: 'completed' });
      await withDeadline(host);
      const subscription = add.mock.calls.find(([event]) => event === 'abort');
      expect(subscription).toBeDefined();
      expect(remove).toHaveBeenCalledWith('abort', subscription?.[1]);
    } finally {
      fixture.shutdown.abort();
      fixture.completion.resolve({ status: 'completed' });
      await host;
    }
  });

  it('rejects a successful startup without a native run and still closes resources', async () => {
    const fixture = createHostLifecycleFixture();
    fixture.runtime.getRunCompletion.mockReturnValue(null);
    fixture.releaseStop.resolve();
    const host = runTemporalWorkerHost(fixture.options);
    const result = host.then(
      () => null,
      (error: unknown) => error
    );
    try {
      const error = await withDeadline(result);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('TEMPORAL_WORKER_RUN_NOT_STARTED');
      expect(fixture.onStarted).not.toHaveBeenCalled();
      expect(fixture.runtime.stop).toHaveBeenCalledTimes(1);
    } finally {
      fixture.shutdown.abort();
      fixture.completion.resolve({ status: 'completed' });
      await result;
    }
  });
});

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

async function withDeadline<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Lifecycle barrier was not reached')), 1000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

type HostTestRuntime = { [Key in keyof RuntimeHandle]: Mock<RuntimeHandle[Key]> };
interface HostLifecycleFixture {
  completion: Deferred<TemporalWorkerRunResult>;
  ready: Deferred<void>;
  stopping: Deferred<void>;
  releaseStop: Deferred<void>;
  shutdown: globalThis.AbortController;
  monitor: TemporalWorkerMonitor;
  onStarted: MockInstance<TemporalWorkerMonitor['onStarted']>;
  runtime: HostTestRuntime;
  operationalServer: { start: Mock<() => Promise<void>>; stop: Mock<() => Promise<void>> };
  options: Parameters<typeof runTemporalWorkerHost>[0];
}

function createHostLifecycleFixture(): HostLifecycleFixture {
  const completion = deferred<TemporalWorkerRunResult>();
  const ready = deferred();
  const stopping = deferred();
  const releaseStop = deferred();
  const shutdown = new globalThis.AbortController();
  const monitor = createMonitor();
  const onStartedOriginal = monitor.onStarted.bind(monitor);
  const onStarted = vi.spyOn(monitor, 'onStarted').mockImplementation(() => {
    onStartedOriginal();
    ready.resolve();
  });
  const runtime = {
    start: vi.fn(async (_signal?: globalThis.AbortSignal) => undefined),
    stop: vi.fn(async () => {
      stopping.resolve();
      await releaseStop.promise;
    }),
    getRunCompletion: vi.fn<() => Promise<TemporalWorkerRunResult> | null>(
      () => completion.promise
    ),
    getRunStateCircuitSnapshot: vi.fn(() => ({
      state: 'closed' as const,
      consecutiveFailures: 0,
      openUntilEpochMs: null,
      tripCount: 0,
      rejectionCount: 0,
      failureCount: 0,
      timeoutCount: 0,
      halfOpenProbeCount: 0,
    })),
  };
  const operationalServer = {
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  };
  const options = {
    env: createEnv(),
    logger: { info() {}, error() {} },
    monitor,
    operationalServer,
    shutdownSignal: shutdown.signal,
    createRuntime: async () => runtime,
  };
  return {
    completion,
    ready,
    stopping,
    releaseStop,
    shutdown,
    monitor,
    onStarted,
    runtime,
    operationalServer,
    options,
  };
}

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

const describeIfLinuxPg =
  process.platform === 'linux' && process.env['DVT_PG_INTEGRATION'] === '1'
    ? describe
    : describe.skip;

describeIfLinuxPg('runTemporalWorkerHost signal canary', () => {
  it.each([
    {
      kind: 'graceful',
      title: 'drains an in-flight SDK activity after SIGTERM before closing runtime resources',
    },
    {
      kind: 'forced',
      title: 'propagates a real SDK forced shutdown failure and withdraws readiness',
    },
  ] as const)(
    '$title',
    async ({ kind }) => {
      const connectionString =
        process.env['DVT_PG_URL'] ??
        process.env['DATABASE_URL'] ??
        'postgresql://dvt:dvt@localhost:5432/dvt';
      const runId = `run-worker-drain-${Date.now()}`;
      const taskQueue = `worker-drain-${Date.now()}`;
      const ownership = { tenantId: 't-it', projectId: 'p-it', environmentId: 'test', runId };
      const shutdown = new globalThis.AbortController();
      const receipt: string[] = [];
      const cleanupResources: Array<() => Promise<void>> = [];
      let activityEntered = false;
      let activityCancellation: globalThis.AbortSignal | undefined;
      let nativeRunSettled = false;
      let connectionCloseEntered = false;
      let expectedNativeFailure: Error | undefined;
      let releaseConnectionClose: (() => void) | undefined;
      const connectionCloseRelease = new Promise<void>((resolve) => {
        releaseConnectionClose = resolve;
      });
      let hostShutdownState: string | undefined;
      let releaseActivity: (() => void) | undefined;
      const activityRelease = new Promise<void>((resolve) => {
        releaseActivity = resolve;
      });
      let temporalEnv: TestWorkflowEnvironment | undefined;
      let nativeRun: Promise<void> | undefined;
      let hostCompletion: Promise<{ error?: unknown }> | undefined;
      let operationalServer: ReturnType<typeof createOperationalServer> | undefined;
      let testFailure: { error: unknown } | undefined;
      let cleanupErrors: unknown[];
      const onSignal = (): void => {
        // The SDK queues its own callback. Exercise the already-draining ordering.
        globalThis.queueMicrotask(() => shutdown.abort());
      };

      const settleCleanup = async (
        phase: string,
        operations: readonly (Promise<unknown> | undefined)[]
      ): Promise<PromiseSettledResult<unknown>[]> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            Promise.allSettled(operations.map((operation) => Promise.resolve(operation))),
            new Promise<PromiseSettledResult<unknown>[]>((resolve) => {
              timer = setTimeout(
                () =>
                  resolve([
                    { status: 'rejected', reason: new Error(`CANARY_CLEANUP_TIMEOUT:${phase}`) },
                  ]),
                10_000
              );
            }),
          ]);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
      };

      const observeClose = (name: string, resource: { close?: () => Promise<void> }): void => {
        const original = resource.close;
        if (original === undefined) throw new Error(`CANARY_CLOSE_MISSING:${name}`);
        let closed = false;
        resource.close = async () => {
          expect(nativeRunSettled, `${name} must wait for the native run`).toBe(true);
          if (kind === 'forced' && name === 'connection.close') {
            connectionCloseEntered = true;
            await connectionCloseRelease;
          }
          await original.call(resource);
          closed = true;
          receipt.push(name);
        };
        cleanupResources.push(async () => {
          resource.close = original;
          if (!closed) await original.call(resource);
        });
      };

      try {
        const planRef = await storeValidPlanArtifact({
          connectionString,
          schema: 'dvt',
          plan: createDbtExecutionPlan(ownership),
          ...ownership,
        });
        await bootstrapRunMetadata({
          connectionString,
          schema: 'dvt',
          namespace: 'default',
          taskQueue,
          planRef,
          ...ownership,
        });
        temporalEnv = await TestWorkflowEnvironment.createLocal();
        const env = {
          ...createEnv(),
          DATABASE_URL: connectionString,
          TEMPORAL_ADDRESS: temporalEnv.address,
          TEMPORAL_TASK_QUEUE: taskQueue,
          DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: true,
          DVT_TEMPORAL_ADMIN_PORT: 0,
        };
        const stores = createTemporalWorkerStores(env, {}, true);
        observeClose('state-store.close', stores.stateStore);
        observeClose('plan-reader.close', stores.planArtifactReader);
        const monitor = createMonitor();
        operationalServer = createOperationalServer({
          host: '127.0.0.1',
          port: 0,
          logger: { info() {} },
          monitor,
        });
        const server = operationalServer;
        const createWorker = Worker.create.bind(Worker);
        let nativeWorker: Worker | undefined;
        vi.spyOn(Worker, 'create').mockImplementation(async (options) => {
          // Only the explicit fixture changes the SDK's documented shutdown deadline.
          const worker = await createWorker({
            ...options,
            ...(kind === 'forced' ? { shutdownForceTime: '1s' } : {}),
          });
          nativeWorker = worker;
          const run = worker.run.bind(worker);
          vi.spyOn(worker, 'run').mockImplementation(() => {
            nativeRun = run().finally(() => {
              nativeRunSettled = true;
              receipt.push('worker.run');
            });
            return nativeRun;
          });
          return worker;
        });
        hostCompletion = runTemporalWorkerHost({
          env,
          logger: { info() {}, error() {} },
          monitor,
          shutdownSignal: shutdown.signal,
          operationalServer: {
            start: () => server.start(),
            stop: async () => {
              await server.stop();
              receipt.push('operational-server.stop');
            },
          },
          createRuntime: (runtimeEnv, logger) =>
            createTemporalWorkerRuntime(runtimeEnv, logger, {
              stateStoreFactory: () => stores.stateStore,
              planArtifactReaderFactory: () => stores.planArtifactReader,
              connectionFactory: async (config) => {
                const connection = await NativeConnection.connect({
                  address: config.connection.address,
                });
                observeClose('connection.close', connection);
                return connection;
              },
              hostFactory: (config) => {
                const host = new TemporalWorkerHost({
                  ...config,
                  // Explicit activity fixture: hold native in-flight work, then propagate
                  // its actual cancellation. This is not a DBT execution success proof.
                  stepExecutors: [
                    {
                      canExecute: () => true,
                      execute: async () => {
                        const cancellation = Context.current().cancellationSignal;
                        activityCancellation = cancellation;
                        activityEntered = true;
                        await activityRelease;
                        if (!cancellation.aborted) throw new Error('CANARY_ACTIVITY_NOT_CANCELLED');
                        throw cancellation.reason;
                      },
                    },
                  ],
                });
                const stop = host.shutdown.bind(host);
                vi.spyOn(host, 'shutdown').mockImplementation(() => {
                  hostShutdownState = nativeWorker?.getState();
                  return stop();
                });
                return host;
              },
            }),
        }).then(
          () => ({}),
          (error: unknown) => ({ error })
        );
        await waitForAsync(async () => monitor.getHealthSnapshot().ready);
        await temporalEnv.client.workflow.start(RUN_PLAN_WORKFLOW, {
          taskQueue,
          workflowId: runId,
          args: [
            {
              planRef,
              ctx: {
                ...ownership,
                targetAdapter: 'temporal',
                logicalAttemptId: 1,
                originRunId: runId,
              },
              maxContinueAsNewPayloadBytes: 500_000,
              continueAsNewAfterLayerCount: 100,
            },
          ],
        });
        await waitFor(() => activityEntered, 30_000);
        if (kind === 'graceful') {
          process.once('SIGTERM', onSignal);
          process.kill(process.pid, 'SIGTERM');
          await waitFor(() => hostShutdownState !== undefined, 5_000);
          await waitFor(() => activityCancellation?.aborted === true, 5_000);
          expect(['DRAINING', 'DRAINED']).toContain(hostShutdownState);
          expect(nativeRunSettled).toBe(false);
          expect(receipt).toEqual([]);
          releaseActivity?.();
          expect(await hostCompletion).toEqual({});
        } else {
          if (nativeWorker === undefined) throw new Error('CANARY_WORKER_MISSING');
          // Exercise original SDK failure independently of the application AbortSignal.
          nativeWorker.shutdown();
          await waitFor(() => nativeWorker?.getState() === 'FAILED', 5_000);
          expect(activityCancellation?.aborted).toBe(true);
          // The real SDK deadline has fired; release the fixture so leftover activity work
          // cannot outlive the test's native resources. Worker.run remains untouched.
          releaseActivity?.();
          await waitFor(() => connectionCloseEntered, 10_000);
          expect(shutdown.signal.aborted).toBe(false);
          expect(nativeRunSettled).toBe(true);
          expect(hostShutdownState).toBe('FAILED');
          expect(receipt).toEqual(['worker.run']);
          expect(monitor.getHealthSnapshot().ready).toBe(false);
          const address = server.getAddress();
          if (address === null) throw new Error('CANARY_OPERATIONAL_SERVER_MISSING');
          const readiness = await globalThis.fetch('http://127.0.0.1:' + address.port + '/readyz');
          expect(readiness.status).toBe(503);
          expect(await readiness.json()).toMatchObject({ ready: false });
          releaseConnectionClose?.();
          const result = await hostCompletion;
          expect(result.error).toBeInstanceOf(GracefulShutdownPeriodExpiredError);
          if (!(result.error instanceof GracefulShutdownPeriodExpiredError)) {
            throw new Error('CANARY_EXPECTED_REAL_SDK_SHUTDOWN_FAILURE');
          }
          expectedNativeFailure = result.error;
          await expect(nativeRun).rejects.toBe(expectedNativeFailure);
        }
        expect(receipt).toEqual([
          'worker.run',
          'connection.close',
          'state-store.close',
          'plan-reader.close',
          'operational-server.stop',
        ]);
      } catch (error) {
        testFailure = { error };
      } finally {
        process.off('SIGTERM', onSignal);
        releaseConnectionClose?.();
        shutdown.abort();
        releaseActivity?.();
        const joins = await settleCleanup('host-and-native-run', [
          hostCompletion,
          nativeRun?.catch((error: unknown) => {
            if (expectedNativeFailure === undefined || error !== expectedNativeFailure) throw error;
          }),
        ]);
        const cleanup = await settleCleanup(
          'owned-resources',
          cleanupResources.map((close) => Promise.resolve().then(close))
        );
        vi.restoreAllMocks();
        const teardown = await settleCleanup('operational-and-temporal-servers', [
          operationalServer?.stop(),
          temporalEnv?.teardown(),
        ]);
        cleanupErrors = [...joins, ...cleanup, ...teardown]
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason);
      }
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [...(testFailure === undefined ? [] : [testFailure.error]), ...cleanupErrors],
          'canary cleanup failed'
        );
      }
      if (testFailure !== undefined) throw testFailure.error;
    },
    120_000
  );
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
  DVT_TEMPORAL_DVT_POSTGRES_ENABLED: boolean;
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
    DVT_TEMPORAL_DVT_POSTGRES_ENABLED: false,
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
