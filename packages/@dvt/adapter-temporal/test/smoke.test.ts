import { describe, expect, it, vi } from 'vitest';

import {
  ObservedTemporalAdapter,
  TemporalAdapter,
  TemporalClientManager,
  extractRuntimeStatusFromDescribe,
  loadTemporalAdapterConfig,
  mapTemporalStatusToRunStatus,
  toProviderRunStatusView,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
  validateTemporalAdapterConfig,
} from '../src/index.js';
import { runObservedTemporalOperation, toErrorMessage } from '../src/temporalObservability.js';

import { makeTrackingObservability } from './helpers/mockObservability.js';

type WithAbortSignalLike = <R>(signal: globalThis.AbortSignal, fn: () => Promise<R>) => Promise<R>;

const {
  mockEnsureConnected,
  mockClose: _mockClose,
  mockConnectionConnect,
  mockWithAbortSignal,
} = vi.hoisted(() => {
  const mockEnsureConnected = vi.fn(async () => undefined);
  const mockClose = vi.fn(async () => undefined);
  const mockWithAbortSignal = vi.fn<WithAbortSignalLike>(
    async <R>(_signal: globalThis.AbortSignal, fn: () => Promise<R>): Promise<R> => await fn()
  );
  const mockConnectionConnect = vi.fn(async () => ({
    ensureConnected: mockEnsureConnected,
    close: mockClose,
    withAbortSignal: mockWithAbortSignal,
  }));

  return {
    mockEnsureConnected,
    mockClose,
    mockConnectionConnect,
    mockWithAbortSignal,
  };
});

vi.mock('@temporalio/client', () => {
  class Client {
    readonly workflow = {};
    constructor(_opts: unknown) {}
  }

  return {
    Connection: {
      connect: mockConnectionConnect,
    },
    Client,
  };
});

describe('adapter-temporal foundation', () => {
  it('does not read ambient process.env when explicit env is provided', () => {
    const previous = process.env.TEMPORAL_NAMESPACE;
    process.env.TEMPORAL_NAMESPACE = 'ambient-namespace';

    try {
      const cfg = loadTemporalAdapterConfig({
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'explicit-namespace',
        TEMPORAL_TASK_QUEUE: 'q-main',
      });

      expect(cfg).toMatchObject({
        connection: {
          namespace: 'explicit-namespace',
        },
      });
    } finally {
      if (previous === undefined) {
        delete process.env.TEMPORAL_NAMESPACE;
      } else {
        process.env.TEMPORAL_NAMESPACE = previous;
      }
    }
  });

  it('loads config with defaults when identity is omitted', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'dvt',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    expect(cfg).toMatchObject({
      connection: {
        address: 'temporal:7233',
        namespace: 'dvt',
        taskQueue: 'q-main',
      },
      timeouts: {
        connectTimeoutMs: 5000,
        requestTimeoutMs: 10000,
      },
      workflowBudget: {
        maxStartPayloadBytes: 2_000_000,
        maxContinueAsNewPayloadBytes: 500_000,
        continueAsNewAfterLayerCount: 100,
      },
    });
    expect(cfg.connection.identity).toBeUndefined();
  });

  it('keeps explicit zero as an operator-controlled continue-as-new disablement override', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'dvt',
      TEMPORAL_TASK_QUEUE: 'q-main',
      TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: '0',
    });

    expect(cfg.workflowBudget.continueAsNewAfterLayerCount).toBe(0);
  });

  it('loads config with defaults and env overrides', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'dvt',
      TEMPORAL_TASK_QUEUE: 'q-main',
      TEMPORAL_IDENTITY: 'adapter-a',
      TEMPORAL_CONNECT_TIMEOUT_MS: '1500',
      TEMPORAL_REQUEST_TIMEOUT_MS: '2500',
      TEMPORAL_MAX_START_PAYLOAD_BYTES: '123456',
      TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: '64000',
      TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: '12',
    });

    expect(cfg).toMatchObject({
      connection: {
        address: 'temporal:7233',
        namespace: 'dvt',
        taskQueue: 'q-main',
        identity: 'adapter-a',
      },
      timeouts: {
        connectTimeoutMs: 1500,
        requestTimeoutMs: 2500,
      },
      workflowBudget: {
        maxStartPayloadBytes: 123456,
        maxContinueAsNewPayloadBytes: 64000,
        continueAsNewAfterLayerCount: 12,
      },
    });
  });

  it('rejects invalid numeric env overrides instead of silently using defaults', () => {
    expect(() =>
      loadTemporalAdapterConfig({
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'dvt',
        TEMPORAL_TASK_QUEUE: 'q-main',
        TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: 'typo',
      })
    ).toThrow(
      'TEMPORAL_CONFIG_INVALID: TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES must be a positive integer'
    );

    expect(() =>
      loadTemporalAdapterConfig({
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'dvt',
        TEMPORAL_TASK_QUEUE: 'q-main',
        TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: '-1',
      })
    ).toThrow(
      'TEMPORAL_CONFIG_INVALID: TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS must be a non-negative integer'
    );
  });

  it('rejects continue-as-new budgets larger than the start payload budget', () => {
    expect(() =>
      validateTemporalAdapterConfig({
        connection: {
          address: 'temporal:7233',
          namespace: 'dvt',
          taskQueue: 'q-main',
        },
        timeouts: {
          connectTimeoutMs: 1500,
          requestTimeoutMs: 2500,
        },
        workflowBudget: {
          maxStartPayloadBytes: 1024,
          maxContinueAsNewPayloadBytes: 2048,
          continueAsNewAfterLayerCount: 0,
        },
      })
    ).toThrow(
      'TEMPORAL_CONFIG_INVALID: maxContinueAsNewPayloadBytes must be less than or equal to maxStartPayloadBytes'
    );
  });

  it('maps workflow identifiers and status deterministically', () => {
    const workflowId = toTemporalWorkflowId('run-1');
    expect(workflowId).toBe('run-1');

    const status = mapTemporalStatusToRunStatus('COMPLETED');
    expect(status).toBe('COMPLETED');

    const providerView = toProviderRunStatusView({
      runtimeStatus: 'RUNNING',
      message: 'ok',
    });
    expect(providerView).toEqual({
      provider: 'temporal',
      providerStatus: 'RUNNING',
      message: 'ok',
    });
  });

  it('rejects blank provider status tokens when building provider views', () => {
    expect(() =>
      toProviderRunStatusView({
        runtimeStatus: '   ',
      })
    ).toThrow('String must contain at least one non-whitespace character');
  });

  it('maps CONTINUED_AS_NEW to RUNNING in run-status mapping', () => {
    expect(mapTemporalStatusToRunStatus('CONTINUED_AS_NEW')).toBe('RUNNING');
  });

  it('maps PAUSED to PAUSED in run-status mapping', () => {
    expect(mapTemporalStatusToRunStatus('PAUSED')).toBe('PAUSED');
  });

  it('maps every known Temporal runtime status deterministically', () => {
    expect(
      Object.fromEntries(
        (
          [
            ['RUNNING', mapTemporalStatusToRunStatus('RUNNING')],
            ['PAUSED', mapTemporalStatusToRunStatus('PAUSED')],
            ['COMPLETED', mapTemporalStatusToRunStatus('COMPLETED')],
            ['FAILED', mapTemporalStatusToRunStatus('FAILED')],
            ['CANCELLED', mapTemporalStatusToRunStatus('CANCELLED')],
            ['TERMINATED', mapTemporalStatusToRunStatus('TERMINATED')],
            ['TIMED_OUT', mapTemporalStatusToRunStatus('TIMED_OUT')],
            ['CONTINUED_AS_NEW', mapTemporalStatusToRunStatus('CONTINUED_AS_NEW')],
          ] as const
        ).map(([status, mapped]) => [status, mapped])
      )
    ).toEqual({
      RUNNING: 'RUNNING',
      PAUSED: 'PAUSED',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      TERMINATED: 'CANCELLED',
      TIMED_OUT: 'FAILED',
      CONTINUED_AS_NEW: 'RUNNING',
    });
  });

  it('extracts Temporal-native runtime status from describe result', () => {
    expect(extractRuntimeStatusFromDescribe({ status: { name: 'RUNNING', code: 1 } })).toBe(
      'RUNNING'
    );
    expect(extractRuntimeStatusFromDescribe({ status: { name: 'COMPLETED' } })).toBe('COMPLETED');
    expect(extractRuntimeStatusFromDescribe({ status: { name: 'PAUSED' } })).toBe('PAUSED');
    expect(extractRuntimeStatusFromDescribe({ status: { name: 'CONTINUED_AS_NEW' } })).toBe(
      'CONTINUED_AS_NEW'
    );
  });

  it('throws for missing status in describe result and preserves unknown provider tokens', () => {
    expect(() => extractRuntimeStatusFromDescribe({})).toThrow('TEMPORAL_DESCRIBE_MISSING_STATUS');
    expect(() => extractRuntimeStatusFromDescribe(null)).toThrow(
      'TEMPORAL_DESCRIBE_MISSING_STATUS'
    );
    expect(extractRuntimeStatusFromDescribe({ status: { name: 'UNKNOWN' } })).toBe('UNKNOWN');
    expect(extractRuntimeStatusFromDescribe({ status: { name: 'PAUSE_REQUESTED' } })).toBe(
      'PAUSE_REQUESTED'
    );
  });

  it('coerces primitive non-Error throwables into messages', () => {
    expect(toErrorMessage(42)).toBe('42');
    expect(toErrorMessage(false)).toBe('false');
    expect(toErrorMessage(1n)).toBe('1');
    expect(toErrorMessage(Symbol.for('temporal'))).toBe('Symbol(temporal)');
  });

  it('falls back to Unknown error for opaque non-Error values', () => {
    expect(toErrorMessage(null)).toBe('Unknown error');
    expect(toErrorMessage({ reason: 'opaque' })).toBe('Unknown error');
  });

  it('records success observability through the shared temporal operation helper', async () => {
    const { observability, logs, metrics } = makeTrackingObservability();

    const value = await runObservedTemporalOperation({
      observability,
      context: { adapter: 'temporal', taskQueue: 'q-main' },
      spanName: 'temporal.test.success',
      counterName: 'dvt.temporal.test_total',
      durationName: 'dvt.temporal.test_duration_ms',
      metricOperation: 'testSuccess',
      run: async () => 'ok-value',
      onSuccess: () => ({
        result: 'custom-ok',
        logLevel: 'debug',
        logMessage: 'Temporal operation succeeded',
      }),
    });

    expect(value).toBe('ok-value');
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.test_total', {
      adapter: 'temporal',
      operation: 'testSuccess',
      result: 'custom-ok',
    });
    expect(metrics.histogram).toHaveBeenCalledWith('dvt.temporal.test_duration_ms', {
      adapter: 'temporal',
      operation: 'testSuccess',
    });
    expect(logs.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Temporal operation succeeded',
      })
    );
  });

  it('records error observability through the shared temporal operation helper without forcing duration', async () => {
    const { observability, logs, metrics } = makeTrackingObservability();
    const error = new Error('OPERATION_FAILED');

    await expect(
      runObservedTemporalOperation({
        observability,
        context: { adapter: 'temporal', taskQueue: 'q-main' },
        spanName: 'temporal.test.error',
        counterName: 'dvt.temporal.test_total',
        durationName: 'dvt.temporal.test_duration_ms',
        metricOperation: 'testError',
        recordDurationOnError: false,
        run: async () => {
          throw error;
        },
        onError: () => ({
          result: 'custom-error',
          logLevel: 'warn',
          logMessage: 'Temporal operation failed',
        }),
      })
    ).rejects.toThrow('OPERATION_FAILED');

    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.test_total', {
      adapter: 'temporal',
      operation: 'testError',
      result: 'custom-error',
    });
    expect(metrics.histogram).not.toHaveBeenCalledWith(
      'dvt.temporal.test_duration_ms',
      expect.anything()
    );
    expect(logs.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Temporal operation failed',
        err: error,
      })
    );
  });

  it('builds temporal run refs and task queue from config', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });
    const tenantId = 'tenant1';

    const taskQueue = toTemporalTaskQueue(tenantId, cfg);
    expect(taskQueue).toBe('q-main-tenant1');

    const runRef = toTemporalRunRef({
      tenantId,
      workflowId: 'wf-1',
      runId: 'trun-1',
      config: cfg,
      taskQueue,
    });

    expect(runRef).toEqual({
      provider: 'temporal',
      tenantId: 'tenant1',
      namespace: 'ns-a',
      workflowId: 'wf-1',
      runId: 'trun-1',
      taskQueue: 'q-main-tenant1',
    });
  });

  it('manages client lifecycle with connect/get/close', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_IDENTITY: 'adapter-x',
    });

    const manager = new TemporalClientManager(cfg);
    expect(manager.isConnected()).toBe(false);

    const c1 = await manager.connect();
    const c2 = manager.getClient();

    expect(c1).toEqual(c2);
    expect(c1.address).toBe('temporal:7233');
    expect(c1.namespace).toBe('default');
    expect(c1.identity).toBe('adapter-x');
    expect(c1.client.workflow).toBeDefined();

    await manager.close();
    expect(manager.isConnected()).toBe(false);
  });

  it('passes connectTimeoutMs to the SDK connect call and emits connect failure observability', async () => {
    mockConnectionConnect.mockRejectedValueOnce(new Error('CONNECT_DEADLINE_EXCEEDED'));

    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_CONNECT_TIMEOUT_MS: '20',
    });

    const { observability, logs, metrics } = makeTrackingObservability();
    const manager = new TemporalClientManager(cfg, observability);

    await expect(manager.connect()).rejects.toThrow('CONNECT_DEADLINE_EXCEEDED');
    expect(mockConnectionConnect).toHaveBeenCalledWith({
      address: 'temporal:7233',
      connectTimeout: 20,
    });
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.client.connect_total', {
      adapter: 'temporal',
      operation: 'connect',
      result: 'error',
    });
    expect(logs.error).toHaveBeenCalled();
  });

  it('emits health-check metrics for ensureConnected', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
    });

    const { observability, metrics } = makeTrackingObservability();
    const manager = new TemporalClientManager(cfg, observability);

    await manager.connect();
    await manager.ensureConnected();

    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.client.ensure_connected_total', {
      adapter: 'temporal',
      operation: 'ensureConnected',
      result: 'ok',
    });

    await manager.close();
  });

  it('aborts ensureConnected with requestTimeoutMs instead of leaving the RPC hanging', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_REQUEST_TIMEOUT_MS: '20',
    });

    const { observability, logs, metrics } = makeTrackingObservability();
    const manager = new TemporalClientManager(cfg, observability);

    await manager.connect();

    mockEnsureConnected.mockImplementationOnce(() => new Promise<never>(() => undefined));
    mockWithAbortSignal.mockImplementationOnce(
      async <R>(signal: globalThis.AbortSignal, fn: () => Promise<R>): Promise<R> =>
        await new Promise<R>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('CANCELLED')), { once: true });
          void fn().then(resolve, reject);
        })
    );

    await expect(manager.ensureConnected()).rejects.toThrow(
      'temporal.ensureConnected timed out after 20ms'
    );
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.client.ensure_connected_total', {
      adapter: 'temporal',
      operation: 'ensureConnected',
      result: 'error',
    });
    expect(logs.error).toHaveBeenCalled();

    await manager.close();
  });

  it('returns same promise/handle for concurrent connect calls', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
    });

    const manager = new TemporalClientManager(cfg);
    const [h1, h2] = await Promise.all([manager.connect(), manager.connect()]);

    expect(h1.connection).toBe(h2.connection);
    expect(h1.client).toBe(h2.client);

    await manager.close();
  });

  it('exports the observed adapter wrapper for ping observability', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
    });

    const { observability, logs, metrics } = makeTrackingObservability();
    const adapter = new ObservedTemporalAdapter({
      adapter: new TemporalAdapter({
        clientManager: {
          isConnected: () => false,
          ensureConnected: vi.fn(async () => undefined),
        } as never,
        config: cfg,
      }),
      config: cfg,
      observability,
    });

    await expect(adapter.ping()).rejects.toThrow('TEMPORAL_CLIENT_NOT_CONNECTED');
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.ping_total', {
      adapter: 'temporal',
      operation: 'ping',
      result: 'error',
    });
    expect(logs.error).toHaveBeenCalled();
  });
});
