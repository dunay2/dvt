import { describe, expect, it, vi } from 'vitest';

import { ObservedTemporalAdapter, TemporalAdapter } from '../src/index.js';

import {
  createPlanRef,
  createResolvedRunContext,
  createTemporalAdapterConfig,
  createTemporalRunRef,
} from './helpers/contractFixtures.js';
import { makeTrackingObservability } from './helpers/mockObservability.js';

const BASE_CONFIG = createTemporalAdapterConfig();
const BASE_PLAN_REF = createPlanRef({
  uri: 'https://plans.example.com/plan-123.json',
  sha256: 'b'.repeat(64),
  planId: 'plan-123',
});
const BASE_RUN_CONTEXT = createResolvedRunContext({
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'environment-1',
  runId: 'run-1',
  originRunId: 'run-1',
});
const START_RUN_COUNTER = 'dvt.temporal.start_run_total';
const LOOKUP_RUN_REF_COUNTER = 'dvt.temporal.lookup_run_ref_total';
const PING_COUNTER = 'dvt.temporal.ping_total';

type WorkflowHandleMock = ReturnType<typeof makeWorkflowHandleMock>;

function makeWorkflowHandleMock(describeImpl: () => Promise<unknown>): {
  cancel: ReturnType<typeof vi.fn>;
  signal: ReturnType<typeof vi.fn>;
  describe: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
} {
  return {
    cancel: vi.fn(async () => undefined),
    signal: vi.fn(async () => undefined),
    describe: vi.fn(describeImpl),
    query: vi.fn(async () => ({
      status: 'RUNNING',
      paused: false,
      cancelled: false,
      currentStepIndex: 0,
      continuedAsNewCount: 0,
    })),
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
  spans: ReturnType<typeof makeTrackingObservability>['spans'];
}

function makeObservedLookupAdapter(
  getHandleImpl: (workflowId: string) => WorkflowHandleMock
): ObservedLookupAdapterFixture {
  const workflowClient = {
    start: vi.fn(async () => ({
      workflowId: 'run-1',
      firstExecutionRunId: 'temporal-run-1',
    })),
    getHandle: vi.fn((wfId: string) => getHandleImpl(wfId)),
  };
  const { observability, logs, metrics, spans } = makeTrackingObservability();
  const adapter = new ObservedTemporalAdapter({
    adapter: new TemporalAdapter({
      workflowClient,
      config: BASE_CONFIG,
    }),
    config: BASE_CONFIG,
    observability,
  });

  return { adapter, workflowClient, logs, metrics, spans };
}

function makeWorkflowNotFoundError(): Error {
  const err = new Error('Workflow execution not found');
  err.name = 'WorkflowNotFoundError';
  return err;
}

describe('ObservedTemporalAdapter', () => {
  it('observes Temporal workflow submission through the startRun rail', async () => {
    const { adapter, workflowClient, metrics, spans } = makeObservedLookupAdapter(() =>
      makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }))
    );

    const runRef = await adapter.startRun(BASE_PLAN_REF, BASE_RUN_CONTEXT);

    expect(runRef).toMatchObject({
      provider: 'temporal',
      workflowId: 'run-1',
      runId: 'run-1',
    });
    expect(workflowClient.start).toHaveBeenCalledTimes(1);
    expect(spans.withSpan).toHaveBeenCalledWith(
      'temporal.startRun',
      expect.objectContaining({
        attributes: {
          namespace: 'dvt-test',
          operation: 'startRun',
          provider: 'temporal',
        },
      }),
      expect.any(Function)
    );
    expect(metrics.counter).toHaveBeenCalledWith(START_RUN_COUNTER, {
      adapter: 'temporal',
      operation: 'startRun',
      result: 'accepted',
    });
  });

  it('preserves deterministic run reference estimation from the wrapped adapter', () => {
    const { adapter } = makeObservedLookupAdapter(() =>
      makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }))
    );

    expect(adapter.estimateRunRef?.(BASE_RUN_CONTEXT)).toEqual(
      createTemporalRunRef({
        tenantId: 'tenant-1',
        namespace: 'dvt-test',
        workflowId: 'run-1',
        runId: 'run-1',
        taskQueue: 'q-main-tenant-1',
      })
    );
  });

  it('preserves startRun rejection while recording a failed submission', async () => {
    const { adapter, workflowClient, metrics } = makeObservedLookupAdapter(() =>
      makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }))
    );
    workflowClient.start.mockRejectedValueOnce(new Error('Temporal unavailable'));

    await expect(adapter.startRun(BASE_PLAN_REF, BASE_RUN_CONTEXT)).rejects.toThrow(
      'Temporal unavailable'
    );

    expect(metrics.counter).toHaveBeenCalledWith(START_RUN_COUNTER, {
      adapter: 'temporal',
      operation: 'startRun',
      result: 'error',
    });
  });

  it('emits found observability for lookupRunRef', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }));
    const { adapter, workflowClient, logs, metrics } = makeObservedLookupAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-abc', 'tenant1');

    expect(result).toEqual(createLookupRunRef('run-abc', 'tenant1'));
    expect(workflowClient.getHandle).toHaveBeenCalledWith('run-abc');
    expectLookupRunRefMetric(metrics, 'found');
    expect(logs.info).toHaveBeenCalled();
  });

  it('emits missing observability for lookupRunRef when workflow is absent', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeWorkflowNotFoundError();
    });
    const { adapter, metrics } = makeObservedLookupAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
    expectLookupRunRefMetric(metrics, 'missing');
  });

  it('emits error observability for lookupRunRef failures', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw new Error('ECONNREFUSED');
    });
    const { adapter, logs, metrics } = makeObservedLookupAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow('ECONNREFUSED');
    expectLookupRunRefMetric(metrics, 'error');
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
      }),
      config: BASE_CONFIG,
      observability,
    });

    await expect(adapter.ping()).rejects.toThrow('TEMPORAL_CLIENT_NOT_CONNECTED');
    expect(metrics.counter).toHaveBeenCalledWith(PING_COUNTER, {
      adapter: 'temporal',
      operation: 'ping',
      result: 'error',
    });
    expect(logs.error).toHaveBeenCalled();
  });
});

function createLookupRunRef(
  workflowId: string,
  tenantId: string
): ReturnType<typeof createTemporalRunRef> {
  return createTemporalRunRef({
    tenantId,
    namespace: 'dvt-test',
    workflowId,
    runId: workflowId,
    taskQueue: `q-main-${tenantId}`,
  });
}

function expectLookupRunRefMetric(
  metrics: ObservedLookupAdapterFixture['metrics'],
  result: 'found' | 'missing' | 'error'
): void {
  expect(metrics.counter).toHaveBeenCalledWith(LOOKUP_RUN_REF_COUNTER, {
    adapter: 'temporal',
    operation: 'lookupRunRef',
    result,
  });
}
