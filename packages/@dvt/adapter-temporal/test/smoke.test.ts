import { describe, expect, it, vi } from 'vitest';

import {
  ObservedTemporalAdapter,
  TemporalAdapter,
  TemporalClientManager,
  loadTemporalAdapterConfig,
  mapTemporalStatusToRunStatus,
  toProviderRunStatusViewFromWorkflowState,
  toProviderRunStatusView,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
} from '../src/index.js';

import { makeTrackingObservability } from './helpers/mockObservability.js';

const {
  mockEnsureConnected,
  mockClose: _mockClose,
  mockConnectionConnect,
  mockWithAbortSignal,
} = vi.hoisted(() => {
  const mockEnsureConnected = vi.fn(async () => undefined);
  const mockClose = vi.fn(async () => undefined);
  const mockWithAbortSignal = vi.fn(
    async (_signal: globalThis.AbortSignal, fn: () => Promise<unknown>) => {
      return await fn();
    }
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

      expect(cfg.namespace).toBe('explicit-namespace');
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

    expect(cfg.identity).toBeUndefined();
    expect(cfg.maxStartPayloadBytes).toBe(2_000_000);
    expect(cfg.continueAsNewAfterLayerCount).toBe(0);
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
      TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: '12',
    });

    expect(cfg.address).toBe('temporal:7233');
    expect(cfg.namespace).toBe('dvt');
    expect(cfg.taskQueue).toBe('q-main');
    expect(cfg.identity).toBe('adapter-a');
    expect(cfg.connectTimeoutMs).toBe(1500);
    expect(cfg.requestTimeoutMs).toBe(2500);
    expect(cfg.maxStartPayloadBytes).toBe(123456);
    expect(cfg.continueAsNewAfterLayerCount).toBe(12);
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
      providerSubstatus: 'RUNNING',
      message: 'ok',
    });

    expect(
      toProviderRunStatusViewFromWorkflowState({
        state: {
          status: 'CANCELLED',
          paused: false,
          cancelRequested: true,
          cancelReason: 'user request',
          currentStepIndex: 2,
          continuedAsNewCount: 0,
        },
      })
    ).toEqual({
      provider: 'temporal',
      providerStatus: 'CANCELLED',
      message: 'user request',
    });
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
      async (signal: globalThis.AbortSignal, fn: () => Promise<unknown>) =>
        await new Promise((resolve, reject) => {
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
