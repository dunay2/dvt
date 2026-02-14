import { describe, expect, it, vi } from 'vitest';

const {
  mockEnsureConnected: _mockEnsureConnected,
  mockClose: _mockClose,
  mockConnectionConnect,
} = vi.hoisted(() => {
  const mockEnsureConnected = vi.fn(async () => undefined);
  const mockClose = vi.fn(async () => undefined);
  const mockConnectionConnect = vi.fn(async () => ({
    ensureConnected: mockEnsureConnected,
    close: mockClose,
  }));

  return {
    mockEnsureConnected,
    mockClose,
    mockConnectionConnect,
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

import {
  TemporalClientManager,
  loadTemporalAdapterConfig,
  mapTemporalStatusToRunStatus,
  toRunStatusSnapshot,
  toTemporalRunRef,
  toTemporalTaskQueue,
  toTemporalWorkflowId,
} from '../src/index.js';

describe('adapter-temporal foundation', () => {
  it('loads config with defaults when identity is omitted', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'dvt',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    expect(cfg.identity).toBeUndefined();
  });

  it('loads config with defaults and env overrides', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'dvt',
      TEMPORAL_TASK_QUEUE: 'q-main',
      TEMPORAL_IDENTITY: 'adapter-a',
      TEMPORAL_CONNECT_TIMEOUT_MS: '1500',
      TEMPORAL_REQUEST_TIMEOUT_MS: '2500',
    });

    expect(cfg.address).toBe('temporal:7233');
    expect(cfg.namespace).toBe('dvt');
    expect(cfg.taskQueue).toBe('q-main');
    expect(cfg.identity).toBe('adapter-a');
    expect(cfg.connectTimeoutMs).toBe(1500);
    expect(cfg.requestTimeoutMs).toBe(2500);
  });

  it('maps workflow identifiers and status deterministically', () => {
    const workflowId = toTemporalWorkflowId('run-1');
    expect(workflowId).toBe('run-1');

    const status = mapTemporalStatusToRunStatus('COMPLETED');
    expect(status).toBe('COMPLETED');

    const snapshot = toRunStatusSnapshot({
      runId: 'run-1',
      runtimeStatus: 'RUNNING',
      message: 'ok',
    });
    expect(snapshot).toEqual({
      runId: 'run-1',
      status: 'RUNNING',
      message: 'ok',
    });
  });

  it('builds temporal run refs and task queue from config', () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const taskQueue = toTemporalTaskQueue('tenant1', cfg);
    expect(taskQueue).toBe('q-main-tenant1');

    const runRef = toTemporalRunRef({
      workflowId: 'wf-1',
      runId: 'trun-1',
      config: cfg,
      taskQueue,
    });

    expect(runRef).toEqual({
      provider: 'temporal',
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
});
