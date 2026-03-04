/**
 * @file test/TemporalAdapter.lookupRunRef.test.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log — §3.3 lookupRunRef for PENDING intent reconciliation
 *
 * Unit tests for TemporalAdapter.lookupRunRef.
 *
 * Uses an injected workflowClient mock so no real Temporal connection is required.
 * The adapter receives the mock via TemporalAdapterDeps.workflowClient.
 */
import { describe, expect, it, vi } from 'vitest';

import { TemporalAdapter } from '../src/TemporalAdapter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeAdapter(
  getHandleImpl: (workflowId: string) => ReturnType<typeof makeWorkflowHandleMock>
): {
  adapter: TemporalAdapter;
  workflowClient: { start: ReturnType<typeof vi.fn>; getHandle: ReturnType<typeof vi.fn> };
} {
  const workflowClient = {
    start: vi.fn(),
    getHandle: vi.fn((wfId: string) => getHandleImpl(wfId)),
  };

  const adapter = new TemporalAdapter({
    workflowClient,
    config: BASE_CONFIG,
    stateStore: { listEvents: vi.fn(async () => []) },
    projector: { rebuild: vi.fn() },
  });

  return { adapter, workflowClient };
}

/** Creates an Error shaped like WorkflowNotFoundError from the Temporal SDK. */
function makeWorkflowNotFoundError(): Error {
  const err = new Error('Workflow execution not found');
  err.name = 'WorkflowNotFoundError';
  return err;
}

/** Creates an Error shaped like ServiceError with gRPC NOT_FOUND (code 5). */
function makeServiceErrorNotFound(): Error {
  const err = new Error('Workflow not found (gRPC NOT_FOUND)') as Error & { code: number };
  err.name = 'ServiceError';
  err.code = 5;
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TemporalAdapter.lookupRunRef', () => {
  it('returns EngineRunRef when workflow exists on Temporal', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }));
    const { adapter, workflowClient } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-abc', 'tenant1');

    expect(result).toEqual({
      provider: 'temporal',
      tenantId: 'tenant1',
      namespace: 'dvt-test',
      workflowId: 'run-abc',
      runId: 'run-abc',
      taskQueue: 'q-main-tenant1',
    });

    // workflowId is derived deterministically from runId (same as startRun)
    expect(workflowClient.getHandle).toHaveBeenCalledWith('run-abc');
    expect(handle.describe).toHaveBeenCalledOnce();
  });

  it('returns null when workflow does not exist (WorkflowNotFoundError)', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeWorkflowNotFoundError();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });

  it('returns null when workflow does not exist (ServiceError gRPC NOT_FOUND code 5)', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeServiceErrorNotFound();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });

  it('propagates non-not-found errors (network failure, auth, etc.)', async () => {
    const networkError = new Error('ECONNREFUSED');
    const handle = makeWorkflowHandleMock(async () => {
      throw networkError;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow('ECONNREFUSED');
  });

  it('derives workflowId and taskQueue consistently with startRun', async () => {
    // workflowId = toTemporalWorkflowId(runId) = runId (identity)
    // taskQueue  = toTemporalTaskQueue(tenantId, config) = config.taskQueue + '-' + tenantId
    const capturedArgs: { workflowId: string }[] = [];
    const handle = makeWorkflowHandleMock(async () => ({}));
    const { adapter, workflowClient } = makeAdapter((wfId) => {
      capturedArgs.push({ workflowId: wfId });
      return handle;
    });

    await adapter.lookupRunRef('my-run-id', 'my-tenant');

    expect(capturedArgs[0]?.workflowId).toBe('my-run-id');
    expect(workflowClient.getHandle).toHaveBeenCalledWith('my-run-id');
  });

  it('returns null and does not call cancel for a WorkflowNotFoundError', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeWorkflowNotFoundError();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-gone', 'tenant-x');

    expect(result).toBeNull();
    expect(handle.cancel).not.toHaveBeenCalled();
  });

  it('propagates a timeout error when describe() exceeds requestTimeoutMs', async () => {
    // describe() returns a promise that never resolves — simulates a hung Temporal server.
    const handle = makeWorkflowHandleMock(() => new Promise<never>(() => undefined));
    const timeoutAdapter = new TemporalAdapter({
      workflowClient: { start: vi.fn(), getHandle: vi.fn(() => handle) },
      config: { ...BASE_CONFIG, requestTimeoutMs: 20 },
      stateStore: { listEvents: vi.fn(async () => []) },
      projector: { rebuild: vi.fn() },
    });

    await expect(timeoutAdapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow(
      'lookupRunRef.describe timed out after 20ms'
    );
  });
});
