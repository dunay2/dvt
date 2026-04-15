import { describe, expect, it, vi } from 'vitest';

import { runTemporalWorkerHost } from '../../src/host/runTemporalWorkerHost.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';

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

async function waitFor(predicate: () => boolean, timeoutMs = 100): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function createMonitor(): TemporalWorkerMonitor {
  return new TemporalWorkerMonitor({
    serviceName: 'dvt-temporal-worker',
    logger: { info() {}, error() {} },
    dbtEnabled: false,
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
    DVT_DBT_BIN: 'dbt',
    DVT_DBT_WORKDIR_ROOT: '/tmp/dvt',
    DVT_DBT_BUNDLE_STORE_BACKEND: undefined,
    DVT_DBT_BUNDLE_S3_BUCKET: undefined,
    DVT_DBT_BUNDLE_FILE_ROOT: undefined,
  };
}
