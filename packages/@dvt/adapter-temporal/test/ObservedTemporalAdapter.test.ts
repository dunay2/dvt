import { describe, expect, it, vi } from 'vitest';

import { ObservedTemporalAdapter, TemporalAdapter } from '../src/index.js';

import { makeTrackingObservability } from './helpers/mockObservability.js';

const BASE_CONFIG = {
  address: '127.0.0.1:7233',
  namespace: 'dvt-test',
  taskQueue: 'q-main',
  connectTimeoutMs: 5000,
  requestTimeoutMs: 10000,
  continueAsNewAfterLayerCount: 0,
};

function makeWorkflowHandleMock(describeImpl: () => Promise<unknown>): {
  cancel: ReturnType<typeof vi.fn>;
  signal: ReturnType<typeof vi.fn>;
  describe: ReturnType<typeof vi.fn>;
} {
  return {
    cancel: vi.fn(async () => undefined),
    signal: vi.fn(async () => undefined),
    describe: vi.fn(describeImpl),
  };
}

interface ObservedLookupAdapterFixture {
  adapter: ObservedTemporalAdapter;
  workflowClient: {
    start: ReturnType<typeof vi.fn>;
    getHandle: ReturnType<typeof vi.fn>;
  };
  logs: ReturnType<typeof makeTrackingObservability>['logs'];
  metrics: ReturnType<typeof makeTrackingObservability>['metrics'];
}

function makeObservedLookupAdapter(
  getHandleImpl: (workflowId: string) => ReturnType<typeof makeWorkflowHandleMock>
): ObservedLookupAdapterFixture {
  const workflowClient = {
    start: vi.fn(),
    getHandle: vi.fn((wfId: string) => getHandleImpl(wfId)),
  };
  const { observability, logs, metrics } = makeTrackingObservability();
  const adapter = new ObservedTemporalAdapter({
    adapter: new TemporalAdapter({
      workflowClient,
      config: BASE_CONFIG,
      stateStore: { listEvents: vi.fn(async () => []) },
      projector: { rebuild: vi.fn() },
    }),
    config: BASE_CONFIG,
    observability,
  });

  return { adapter, workflowClient, logs, metrics };
}

function makeWorkflowNotFoundError(): Error {
  const err = new Error('Workflow execution not found');
  err.name = 'WorkflowNotFoundError';
  return err;
}

describe('ObservedTemporalAdapter', () => {
  it('emits found observability for lookupRunRef', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }));
    const { adapter, workflowClient, logs, metrics } = makeObservedLookupAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-abc', 'tenant1');

    expect(result).toEqual({
      provider: 'temporal',
      tenantId: 'tenant1',
      namespace: 'dvt-test',
      workflowId: 'run-abc',
      runId: 'run-abc',
      taskQueue: 'q-main-tenant1',
    });
    expect(workflowClient.getHandle).toHaveBeenCalledWith('run-abc');
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.lookup_run_ref_total', {
      adapter: 'temporal',
      operation: 'lookupRunRef',
      result: 'found',
    });
    expect(logs.info).toHaveBeenCalled();
  });

  it('emits missing observability for lookupRunRef when workflow is absent', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeWorkflowNotFoundError();
    });
    const { adapter, metrics } = makeObservedLookupAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.lookup_run_ref_total', {
      adapter: 'temporal',
      operation: 'lookupRunRef',
      result: 'missing',
    });
  });

  it('emits error observability for lookupRunRef failures', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw new Error('ECONNREFUSED');
    });
    const { adapter, logs, metrics } = makeObservedLookupAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow('ECONNREFUSED');
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.lookup_run_ref_total', {
      adapter: 'temporal',
      operation: 'lookupRunRef',
      result: 'error',
    });
    expect(logs.error).toHaveBeenCalled();
  });

  it('emits ping error observability when client is not connected', async () => {
    const { observability, logs, metrics } = makeTrackingObservability();
    const adapter = new ObservedTemporalAdapter({
      adapter: new TemporalAdapter({
        clientManager: {
          isConnected: () => false,
          ensureConnected: vi.fn(async () => undefined),
        } as never,
        config: BASE_CONFIG,
        stateStore: { listEvents: vi.fn(async () => []) },
        projector: { rebuild: vi.fn() },
      }),
      config: BASE_CONFIG,
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
