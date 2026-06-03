/**
 * @file packages/@dvt/adapter-temporal/test/runPlanWorkflow.cancellation.test.ts
 * @baseline ADR-0007: Run Cancellation
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Verify workflow cancellation emits canonical lifecycle events under Temporal cancellation scopes
 * @consequence Native provider cancellation cannot bypass DVT terminal event ownership
 * @version 1.2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  finalizeCancellationIfRequested,
  finalizeNativeCancellationIfNeeded,
} from '../src/workflows/runPlanWorkflow.cancellation.js';
import type { RuntimeWorkflowState } from '../src/workflows/runPlanWorkflow.types.js';

import { createPlanRef, createResolvedRunContext } from './helpers/contractFixtures.js';

const {
  currentScope,
  nonCancellable,
  condition,
  isCancellation,
  eventEmitEvent,
  terminalEmitEvent,
} = vi.hoisted(() => ({
  currentScope: { consideredCancelled: false },
  nonCancellable: vi.fn(async <T>(fn: () => Promise<T>) => await fn()),
  condition: vi.fn(async () => undefined),
  isCancellation: vi.fn((error: unknown) => error === 'cancelled'),
  eventEmitEvent: vi.fn(async () => undefined),
  terminalEmitEvent: vi.fn(async () => undefined),
}));

vi.mock('@temporalio/workflow', () => ({
  CancellationScope: {
    current: vi.fn(() => currentScope),
    nonCancellable,
  },
  condition,
  isCancellation,
}));

vi.mock('../src/workflows/runPlanWorkflow.activities.js', () => ({
  eventActivities: {
    emitEvent: eventEmitEvent,
  },
  terminalEventActivities: {
    emitEvent: terminalEmitEvent,
  },
}));

const BASE_RUNTIME_STATE: RuntimeWorkflowState = {
  status: 'RUNNING',
  paused: false,
  cancelRequested: false,
  currentStepIndex: 0,
  continuedAsNewCount: 0,
};

describe('runPlanWorkflow cancellation finalization', () => {
  beforeEach(() => {
    currentScope.consideredCancelled = false;
    vi.clearAllMocks();
  });

  it('wraps cooperative cancellation terminal emission in a non-cancellable scope', async () => {
    const result = await finalizeCancellationIfRequested(
      createCancellationArgs({
        state: createRuntimeState({ cancelRequested: true }),
      })
    );

    expect(result).toEqual({
      runId: 'run-1',
      status: 'CANCELLED',
      continuedAsNewCount: 0,
    });
    expect(nonCancellable).toHaveBeenCalledTimes(1);
    expectCancellationTerminalEvents();
  });

  it('does not treat native scope cancellation as a cooperative cancel request', async () => {
    currentScope.consideredCancelled = true;

    const result = await finalizeCancellationIfRequested(
      createCancellationArgs({
        state: createRuntimeState(),
      })
    );

    expect(result).toBeNull();
    expect(nonCancellable).not.toHaveBeenCalled();
    expect(terminalEmitEvent).not.toHaveBeenCalled();
  });

  it('keeps native cancellation finalization in the catch path', async () => {
    const result = await finalizeNativeCancellationIfNeeded({
      ...createCancellationArgs({
        state: createRuntimeState(),
      }),
      error: 'cancelled',
    });

    expect(result).toBe(true);
    expect(nonCancellable).toHaveBeenCalledTimes(1);
    expectCancellationTerminalEvents();
  });
});

function createCancellationArgs(args: { state: RuntimeWorkflowState }): {
  state: RuntimeWorkflowState;
  ctx: ReturnType<typeof createResolvedRunContext>;
  planRef: ReturnType<typeof createPlanRef>;
  continuedAsNewCount: number;
} {
  return {
    state: args.state,
    ctx: createResolvedRunContext({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      runId: 'run-1',
    }),
    planRef: createPlanRef({
      uri: 'file://plan.json',
      sha256: 'a'.repeat(64),
      planId: 'plan-1',
    }),
    continuedAsNewCount: 0,
  };
}

function createRuntimeState(overrides: Partial<RuntimeWorkflowState> = {}): RuntimeWorkflowState {
  return {
    ...BASE_RUNTIME_STATE,
    ...overrides,
  };
}

function expectCancellationTerminalEvents(): void {
  expect(terminalEmitEvent).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ eventType: 'RunCancelRequested' })
  );
  expect(terminalEmitEvent).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ eventType: 'RunCancelled' })
  );
}
