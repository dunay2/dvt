/**
 * @file test/TemporalAdapter.lookupRunRef.test.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log - Section 3.3 lookupRunRef for PENDING intent reconciliation
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
  maxStartPayloadBytes: 2_000_000,
  continueAsNewAfterLayerCount: 0,
};

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

type WorkflowClientMock = {
  start: ReturnType<typeof vi.fn>;
  getHandle: ReturnType<typeof vi.fn>;
  withAbortSignal?: ReturnType<typeof vi.fn>;
};

function makeAdapter(
  getHandleImpl: (workflowId: string) => ReturnType<typeof makeWorkflowHandleMock>,
  overrides: Partial<WorkflowClientMock> = {}
): {
  adapter: TemporalAdapter;
  workflowClient: WorkflowClientMock;
} {
  const workflowClient: WorkflowClientMock = {
    start: vi.fn(),
    getHandle: vi.fn((wfId: string) => getHandleImpl(wfId)),
    ...overrides,
  };

  const adapter = new TemporalAdapter({
    workflowClient,
    config: BASE_CONFIG,
  });

  return { adapter, workflowClient };
}

function makeWorkflowNotFoundError(): Error {
  const err = new Error('Workflow execution not found');
  err.name = 'WorkflowNotFoundError';
  return err;
}

function makeServiceErrorNotFound(): Error {
  const err = new Error('Workflow not found (gRPC NOT_FOUND)') as Error & { code: number };
  err.name = 'ServiceError';
  err.code = 5;
  return err;
}

function makeServiceErrorNotFoundCodeAsString(): Error {
  const err = new Error('Workflow not found (gRPC NOT_FOUND)') as Error & { code: string };
  err.name = 'ServiceError';
  err.code = '5';
  return err;
}

function makeServiceErrorNotFoundCodeAsText(): Error {
  const err = new Error('Workflow not found (gRPC NOT_FOUND)') as Error & { code: string };
  err.name = 'ServiceError';
  err.code = 'NOT_FOUND';
  return err;
}

function makeServiceErrorNotFoundCodeAsLowerText(): Error {
  const err = new Error('Workflow not found (gRPC not_found)') as Error & { code: string };
  err.name = 'ServiceError';
  err.code = 'not_found';
  return err;
}

function makeServiceErrorNotFoundCodeWithSpaces(): Error {
  const err = new Error('Workflow not found (gRPC NOT_FOUND)') as Error & { code: string };
  err.name = 'ServiceError';
  err.code = ' 5 ';
  return err;
}

function makeServiceErrorNotFoundTextWithSpaces(): Error {
  const err = new Error('Workflow not found (gRPC NOT_FOUND)') as Error & { code: string };
  err.name = 'ServiceError';
  err.code = ' NOT_FOUND ';
  return err;
}
function makeServiceErrorUnknownCode(): Error {
  const err = new Error('Workflow service error with unknown code') as Error & { code: string };
  err.name = 'ServiceError';
  err.code = 'UNKNOWN_CODE';
  return err;
}

function makeNonServiceErrorCodeFive(): Error {
  const err = new Error('Some other error with code 5') as Error & { code: number };
  err.name = 'UnexpectedError';
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

  it('returns null when workflow does not exist (ServiceError gRPC NOT_FOUND code "5")', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeServiceErrorNotFoundCodeAsString();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });

  it('returns null when workflow does not exist (ServiceError NOT_FOUND string code)', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeServiceErrorNotFoundCodeAsText();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });

  it('returns null when workflow does not exist (ServiceError not_found lowercase code)', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeServiceErrorNotFoundCodeAsLowerText();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });

  it('returns null when workflow does not exist (ServiceError numeric string with spaces)', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeServiceErrorNotFoundCodeWithSpaces();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });

  it('returns null when workflow does not exist (ServiceError NOT_FOUND with spaces)', async () => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeServiceErrorNotFoundTextWithSpaces();
    });
    const { adapter } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-missing', 'tenant1');

    expect(result).toBeNull();
  });
  it('propagates ServiceError with unknown code', async () => {
    const unknownCodeError = makeServiceErrorUnknownCode();
    const handle = makeWorkflowHandleMock(async () => {
      throw unknownCodeError;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toBe(unknownCodeError);
  });

  it('propagates non-ServiceError even when code is 5', async () => {
    const nonServiceError = makeNonServiceErrorCodeFive();
    const handle = makeWorkflowHandleMock(async () => {
      throw nonServiceError;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toBe(nonServiceError);
  });

  it('propagates non-Error throwables even with name/code shape', async () => {
    const nonErrorThrowable = { name: 'ServiceError', code: 5, message: 'not-an-Error object' };
    const handle = makeWorkflowHandleMock(async () => {
      throw nonErrorThrowable;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toBe(nonErrorThrowable);
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

  it('uses workflowClient.withAbortSignal when the Temporal SDK client exposes it', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }));
    const withAbortSignal = vi.fn(
      async (_signal: globalThis.AbortSignal, fn: () => Promise<unknown>) => await fn()
    );
    const { adapter } = makeAdapter(() => handle, { withAbortSignal });

    await adapter.lookupRunRef('run-abc', 'tenant1');

    expect(withAbortSignal).toHaveBeenCalledOnce();
    expect(handle.describe).toHaveBeenCalledOnce();
  });

  it('aborts describe() through workflowClient.withAbortSignal when requestTimeoutMs elapses', async () => {
    const handle = makeWorkflowHandleMock(() => new Promise<never>(() => undefined));
    const withAbortSignal = vi.fn(
      async (signal: globalThis.AbortSignal, fn: () => Promise<unknown>) =>
        await new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('CANCELLED')), { once: true });
          void fn().then(resolve, reject);
        })
    );
    const timeoutAdapter = new TemporalAdapter({
      workflowClient: { start: vi.fn(), getHandle: vi.fn(() => handle), withAbortSignal },
      config: { ...BASE_CONFIG, requestTimeoutMs: 20 },
    });

    await expect(timeoutAdapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow(
      'lookupRunRef.describe timed out after 20ms'
    );
    expect(withAbortSignal).toHaveBeenCalledOnce();
  });

  it('falls back to a local timeout when workflowClient does not expose withAbortSignal', async () => {
    const handle = makeWorkflowHandleMock(() => new Promise<never>(() => undefined));
    const timeoutAdapter = new TemporalAdapter({
      workflowClient: { start: vi.fn(), getHandle: vi.fn(() => handle) },
      config: { ...BASE_CONFIG, requestTimeoutMs: 20 },
    });

    await expect(timeoutAdapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow(
      'lookupRunRef.describe timed out after 20ms'
    );
  });

  it('returns provider-native workflow query status without reading persisted projection', async () => {
    const handle = makeWorkflowHandleMock(async () => ({}));
    handle.query.mockResolvedValueOnce({
      status: 'PAUSED',
      paused: true,
      cancelled: false,
      currentStepIndex: 4,
      continuedAsNewCount: 1,
    });
    const { adapter, workflowClient } = makeAdapter(() => handle);

    const status = await adapter.getRunStatus({
      provider: 'temporal',
      tenantId: 'tenant1',
      namespace: 'dvt-test',
      workflowId: 'run-abc',
      runId: 'run-abc',
      taskQueue: 'q-main-tenant1',
    });

    expect(workflowClient.getHandle).toHaveBeenCalledWith('run-abc');
    expect(handle.query).toHaveBeenCalledWith('status');
    expect(status).toEqual({
      runId: 'run-abc',
      status: 'PAUSED',
    });
  });

  it('fails cleanly when the workflow handle does not support query()', async () => {
    const handle = {
      cancel: vi.fn(async () => undefined),
      signal: vi.fn(async () => undefined),
      describe: vi.fn(async () => ({})),
    };
    const { adapter } = makeAdapter(() => handle as never);

    await expect(
      adapter.getRunStatus({
        provider: 'temporal',
        tenantId: 'tenant1',
        namespace: 'dvt-test',
        workflowId: 'run-abc',
        runId: 'run-abc',
        taskQueue: 'q-main-tenant1',
      })
    ).rejects.toThrow('TEMPORAL_WORKFLOW_QUERY_NOT_SUPPORTED');
  });
});
