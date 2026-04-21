/**
 * @file test/TemporalAdapter.lookupRunRef.test.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log - Section 3.3 lookupRunRef for PENDING intent reconciliation
 *
 * Integration-oriented unit tests for TemporalAdapter.lookupRunRef.
 */
import { describe, expect, it, vi } from 'vitest';

import { TemporalAdapter } from '../src/TemporalAdapter.js';

import { createTemporalAdapterConfig } from './helpers/contractFixtures.js';
import {
  createWithAbortSignalMock,
  makeAdapter,
  makeWorkflowHandleMock,
} from './helpers/lookupRunRefHarness.js';

function makeError(args: { name: string; message: string; code?: number | string }): Error {
  return Object.assign(new Error(args.message), {
    name: args.name,
    ...(args.code === undefined ? {} : { code: args.code }),
  });
}

describe('TemporalAdapter.lookupRunRef', () => {
  it('returns EngineRunRef when workflow exists on Temporal', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }));
    const { adapter, workflowClient } = makeAdapter(() => handle);

    const result = await adapter.lookupRunRef('run-abc', 'tenant1');

    expect(result).toMatchObject({
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

  it.each([
    [
      'WorkflowNotFoundError',
      () =>
        makeError({
          name: 'WorkflowNotFoundError',
          message: 'Workflow execution not found',
        }),
    ],
    [
      'ServiceError NOT_FOUND',
      () =>
        makeError({
          name: 'ServiceError',
          message: 'Workflow not found (gRPC NOT_FOUND)',
          code: 5,
        }),
    ],
  ])('returns null when Temporal reports %s', async (_label, makeMissingError) => {
    const handle = makeWorkflowHandleMock(async () => {
      throw makeMissingError();
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-missing', 'tenant1')).resolves.toBeNull();
    expect(handle.cancel).not.toHaveBeenCalled();
  });

  it('propagates ServiceError with unknown code', async () => {
    const unexpectedError = makeError({
      name: 'ServiceError',
      message: 'Workflow service error with unknown code',
      code: 'UNKNOWN_CODE',
    });
    const handle = makeWorkflowHandleMock(async () => {
      throw unexpectedError;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toBe(unexpectedError);
  });

  it('propagates non-ServiceError failures unchanged', async () => {
    const networkError = makeError({
      name: 'UnexpectedError',
      message: 'ECONNREFUSED',
      code: 5,
    });
    const handle = makeWorkflowHandleMock(async () => {
      throw networkError;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toBe(networkError);
  });

  it('propagates non-Error throwables even when they resemble ServiceError', async () => {
    const nonErrorThrowable = { name: 'ServiceError', code: 5, message: 'not-an-Error object' };
    const handle = makeWorkflowHandleMock(async () => {
      throw nonErrorThrowable;
    });
    const { adapter } = makeAdapter(() => handle);

    await expect(adapter.lookupRunRef('run-abc', 'tenant1')).rejects.toBe(nonErrorThrowable);
  });

  it('derives workflowId consistently from the runId', async () => {
    const capturedWorkflowIds: string[] = [];
    const handle = makeWorkflowHandleMock(async () => ({}));
    const { adapter, workflowClient } = makeAdapter((workflowId) => {
      capturedWorkflowIds.push(workflowId);
      return handle;
    });

    await adapter.lookupRunRef('my-run-id', 'my-tenant');

    expect(capturedWorkflowIds).toEqual(['my-run-id']);
    expect(workflowClient.getHandle).toHaveBeenCalledWith('my-run-id');
  });

  it('uses workflowClient.withAbortSignal when the Temporal SDK client exposes it', async () => {
    const handle = makeWorkflowHandleMock(async () => ({ status: { name: 'Running' } }));
    const withAbortSignal = createWithAbortSignalMock();
    const { adapter } = makeAdapter(() => handle, { withAbortSignal });

    await adapter.lookupRunRef('run-abc', 'tenant1');

    expect(withAbortSignal).toHaveBeenCalledOnce();
    expect(handle.describe).toHaveBeenCalledOnce();
  });

  it('aborts describe() through workflowClient.withAbortSignal when requestTimeoutMs elapses', async () => {
    const handle = makeWorkflowHandleMock(() => new Promise<never>(() => undefined));
    const withAbortSignal = createWithAbortSignalMock(
      async <R>(signal: globalThis.AbortSignal, fn: () => Promise<R>): Promise<R> =>
        await new Promise<R>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('CANCELLED')), { once: true });
          void fn().then(resolve, reject);
        })
    );
    const timeoutAdapter = new TemporalAdapter({
      workflowClient: { start: vi.fn(), getHandle: vi.fn(() => handle), withAbortSignal },
      config: createTemporalAdapterConfig({
        timeouts: { requestTimeoutMs: 20 },
      }),
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
      config: createTemporalAdapterConfig({
        timeouts: { requestTimeoutMs: 20 },
      }),
    });

    await expect(timeoutAdapter.lookupRunRef('run-abc', 'tenant1')).rejects.toThrow(
      'lookupRunRef.describe timed out after 20ms'
    );
  });
});
