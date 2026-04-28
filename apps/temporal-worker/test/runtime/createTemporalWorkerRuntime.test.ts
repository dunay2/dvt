import type { TemporalWorkerHostConfig } from '@dvt/adapter-temporal';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTemporalWorkerRuntime } from '../../src/runtime/createTemporalWorkerRuntime.js';

const { mockNativeConnectionConnect } = vi.hoisted(() => ({
  mockNativeConnectionConnect: vi.fn(),
}));

vi.mock('@temporalio/worker', () => ({
  NativeConnection: {
    connect: mockNativeConnectionConnect,
  },
}));

describe('createTemporalWorkerRuntime', () => {
  beforeEach(() => {
    mockNativeConnectionConnect.mockReset();
  });

  it('wires reader, runner, host, and connection when DBT is enabled', async () => {
    const fixture = createRuntimeFixture();
    const probe = vi.fn(async () => undefined);
    const runner = {
      execute: vi.fn(async (input) => ({
        stepId: input.step.stepId,
        status: 'COMPLETED' as const,
      })),
    };
    let capturedConfig: TemporalWorkerHostConfig | undefined;

    const runtime = await createTemporalWorkerRuntime(
      createEnv({
        DVT_TEMPORAL_DBT_ENABLED: true,
        DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: true,
        DVT_DBT_BUNDLE_STORE_BACKEND: 's3',
        DVT_DBT_BUNDLE_S3_BUCKET: 'bundle-bucket',
      }),
      { info() {}, error() {} },
      {
        stateStoreFactory: () => fixture.stateStore,
        connectionFactory: async () => fixture.connection,
        dbtAvailabilityProbe: probe,
        bundleReaderFactory: () => ({
          read: vi.fn(async (_ref, _options) => new Uint8Array()),
        }),
        dbtPluginRunnerFactory: () => runner,
        hostFactory: (config) => {
          capturedConfig = config;
          return fixture.host;
        },
      }
    );

    await runtime.start();
    await runtime.stop();

    expect(probe).toHaveBeenCalledWith('dbt');
    expect(fixture.migrate).toHaveBeenCalledTimes(1);
    expect(fixture.hostStart).toHaveBeenCalledWith(fixture.connection);
    expect(fixture.hostShutdown).toHaveBeenCalledTimes(1);
    expect(fixture.connection.close).toHaveBeenCalledTimes(1);
    expect(fixture.closeStateStore).toHaveBeenCalledTimes(1);
    expect(capturedConfig?.activityDeps).not.toHaveProperty('runExecutionContextReader');
    expect(capturedConfig?.activityDeps).not.toHaveProperty('dbtPluginRunner');
    expect(capturedConfig?.stepActivitiesByKind?.get('DBT_MODEL')).toBeDefined();
    expect(runtime.getRunStateCircuitSnapshot().state).toBe('closed');
  });

  it('does not run migrations by default', async () => {
    const fixture = createRuntimeFixture();

    const runtime = await createTemporalWorkerRuntime(
      createEnv(),
      { info() {}, error() {} },
      {
        stateStoreFactory: () => fixture.stateStore,
        connectionFactory: async () => fixture.connection,
        hostFactory: () => fixture.host,
      }
    );

    await runtime.start();
    await runtime.stop();

    expect(fixture.migrate).not.toHaveBeenCalled();
    expect(fixture.hostStart).toHaveBeenCalledWith(fixture.connection);
  });

  it('connects with the canonical nested Temporal address when no connection factory is provided', async () => {
    const fixture = createRuntimeFixture();
    mockNativeConnectionConnect.mockResolvedValue(fixture.connection);

    const runtime = await createTemporalWorkerRuntime(
      createEnv({
        TEMPORAL_ADDRESS: 'canonical-temporal:7233',
      }),
      { info() {}, error() {} },
      {
        stateStoreFactory: () => fixture.stateStore,
        hostFactory: () => fixture.host,
      }
    );

    await runtime.start();
    await runtime.stop();

    expect(mockNativeConnectionConnect).toHaveBeenCalledWith({
      address: 'canonical-temporal:7233',
    });
    expect(fixture.hostStart).toHaveBeenCalledWith(fixture.connection);
    expect(fixture.connection.close).toHaveBeenCalledTimes(1);
  });

  it('does not require DBT wiring when DBT support is disabled', async () => {
    const fixture = createRuntimeFixture();
    const probe = vi.fn(async () => undefined);
    let capturedConfig: TemporalWorkerHostConfig | undefined;

    const runtime = await createTemporalWorkerRuntime(
      createEnv(),
      { info() {}, error() {} },
      {
        stateStoreFactory: () => fixture.stateStore,
        connectionFactory: async () => fixture.connection,
        dbtAvailabilityProbe: probe,
        hostFactory: (config) => {
          capturedConfig = config;
          return fixture.host;
        },
      }
    );

    await runtime.start();
    await runtime.stop();

    expect(probe).not.toHaveBeenCalled();
    expect(capturedConfig?.activityDeps).not.toHaveProperty('dbtPluginRunner');
    expect(capturedConfig?.stepActivitiesByKind?.get('DBT_MODEL')).toBeUndefined();
  });

  it('wires the configured continue-as-new payload budget into Temporal host config', async () => {
    const fixture = createRuntimeFixture();
    let capturedConfig: TemporalWorkerHostConfig | undefined;

    const runtime = await createTemporalWorkerRuntime(
      createEnv({
        TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: '64000',
      }),
      { info() {}, error() {} },
      {
        stateStoreFactory: () => fixture.stateStore,
        connectionFactory: async () => fixture.connection,
        hostFactory: (config) => {
          capturedConfig = config;
          return fixture.host;
        },
      }
    );

    await runtime.start();
    await runtime.stop();

    expect(capturedConfig?.temporalConfig.workflowBudget.maxContinueAsNewPayloadBytes).toBe(64000);
  });

  it('fails fast when startup is already aborted', async () => {
    const fixture = createRuntimeFixture();
    const shutdown = new globalThis.AbortController();
    shutdown.abort();

    const runtime = await createTemporalWorkerRuntime(
      createEnv({
        DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: true,
      }),
      { info() {}, error() {} },
      {
        stateStoreFactory: () => fixture.stateStore,
        connectionFactory: async () => fixture.connection,
        hostFactory: () => fixture.host,
      }
    );

    await expect(runtime.start(shutdown.signal)).rejects.toThrow(/startup aborted/);
    await runtime.stop();

    expect(fixture.abortPendingOperations).toHaveBeenCalledTimes(1);
    expect(fixture.migrate).not.toHaveBeenCalled();
    expect(fixture.hostStart).not.toHaveBeenCalled();
    expect(fixture.connection.close).not.toHaveBeenCalled();
  });
});

function createEnv(
  overrides: Partial<ReturnType<typeof buildBaseEnv>> = {}
): ReturnType<typeof buildBaseEnv> {
  return {
    ...buildBaseEnv(),
    ...overrides,
  };
}

function buildBaseEnv(): {
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
  TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: string | undefined;
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
    TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: undefined,
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

function createRuntimeFixture(): {
  abortPendingOperations: ReturnType<typeof vi.fn>;
  closeStateStore: ReturnType<typeof vi.fn>;
  connection: { close: ReturnType<typeof vi.fn> };
  host: {
    start: ReturnType<typeof vi.fn>;
    shutdown: ReturnType<typeof vi.fn>;
  };
  hostShutdown: ReturnType<typeof vi.fn>;
  hostStart: ReturnType<typeof vi.fn>;
  migrate: ReturnType<typeof vi.fn>;
  stateStore: {
    migrate: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    abortPendingOperations: ReturnType<typeof vi.fn>;
    bootstrapRunTx: ReturnType<typeof vi.fn>;
    appendAndEnqueueTx: ReturnType<typeof vi.fn>;
  };
} {
  const migrate = vi.fn(async () => undefined);
  const closeStateStore = vi.fn(async () => undefined);
  const abortPendingOperations = vi.fn(() => undefined);
  const stateStore = {
    migrate,
    close: closeStateStore,
    abortPendingOperations,
    bootstrapRunTx: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
    appendAndEnqueueTx: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
  };
  const connection = { close: vi.fn(async () => undefined) };
  const hostStart = vi.fn(async () => undefined);
  const hostShutdown = vi.fn(async () => undefined);
  const host = {
    start: hostStart,
    shutdown: hostShutdown,
  };

  return {
    abortPendingOperations,
    closeStateStore,
    connection,
    host,
    hostShutdown,
    hostStart,
    migrate,
    stateStore,
  };
}
