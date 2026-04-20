import { type Mock, vi } from 'vitest';

import { TemporalAdapter } from '../../src/TemporalAdapter.js';

import { createTemporalAdapterConfig, createTemporalRunRef } from './contractFixtures.js';

const BASE_CONFIG = createTemporalAdapterConfig();

export type WithAbortSignalLike = <R>(
  signal: globalThis.AbortSignal,
  fn: () => Promise<R>
) => Promise<R>;

export interface WorkflowHandleMock {
  cancel: ReturnType<typeof vi.fn>;
  signal: ReturnType<typeof vi.fn>;
  describe: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
}

export interface WorkflowClientMock {
  start: ReturnType<typeof vi.fn>;
  getHandle: ReturnType<typeof vi.fn>;
  withAbortSignal?: WithAbortSignalLike;
}

export function makeWorkflowHandleMock(describeImpl: () => Promise<unknown>): WorkflowHandleMock {
  return {
    cancel: vi.fn(async () => undefined),
    signal: vi.fn(async () => undefined),
    describe: vi.fn(describeImpl),
    query: vi.fn(async () => ({
      status: 'RUNNING',
      paused: false,
      cancelRequested: false,
      currentStepIndex: 0,
      continuedAsNewCount: 0,
    })),
  };
}

export function createWithAbortSignalMock(
  implementation: WithAbortSignalLike = async <R>(
    _signal: globalThis.AbortSignal,
    fn: () => Promise<R>
  ): Promise<R> => await fn()
): Mock<WithAbortSignalLike> {
  return vi.fn<WithAbortSignalLike>(implementation);
}

export function makeAdapter(
  getHandleImpl: (workflowId: string) => WorkflowHandleMock,
  overrides: Partial<WorkflowClientMock> = {}
): {
  adapter: TemporalAdapter;
  workflowClient: WorkflowClientMock;
} {
  const workflowClient: WorkflowClientMock = {
    start: vi.fn(),
    getHandle: vi.fn((workflowId: string) => getHandleImpl(workflowId)),
    ...overrides,
  };

  return {
    adapter: new TemporalAdapter({
      workflowClient,
      config: BASE_CONFIG,
    }),
    workflowClient,
  };
}

export function createLookupRunRef(
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
