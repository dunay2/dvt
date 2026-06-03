/**
 * @file packages/@dvt/adapter-temporal/test/runPlanWorkflow.signals.test.ts
 * @baseline ADR-0007: Run Cancellation
 * @baseline ADR-0008: Signal Idempotency
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Verify signal handlers deduplicate control signals and preserve first-writer lifecycle state
 * @consequence Duplicate Temporal signals cannot create duplicate DVT lifecycle transitions
 * @version 1.2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registeredHandlers } = vi.hoisted(() => ({
  registeredHandlers: new Map<unknown, unknown>(),
}));

vi.mock('@temporalio/workflow', () => ({
  defineSignal: vi.fn((name: string) => ({ kind: 'signal', name })),
  defineQuery: vi.fn((name: string) => ({ kind: 'query', name })),
  setHandler: vi.fn((target: unknown, handler: unknown) => {
    registeredHandlers.set(target, handler);
  }),
}));

import {
  cancelSignal,
  createInitialWorkflowState,
  registerSignalHandlers,
} from '../src/workflows/runPlanWorkflow.signals.js';

describe('runPlanWorkflow signal handlers', () => {
  beforeEach(() => {
    registeredHandlers.clear();
  });

  it('deduplicates CANCEL by signalId and preserves the first cancel reason', () => {
    const state = createInitialWorkflowState(0, undefined);
    const processedControlSignalIds = new Set<string>();

    registerSignalHandlers(state, processedControlSignalIds);

    const cancelHandler = expectCancelSignalHandler(registeredHandlers.get(cancelSignal));
    cancelHandler('sig-cancel-1', 'operator-request');
    cancelHandler('sig-cancel-1', 'duplicate-request');

    expect(state.cancelRequested).toBe(true);
    expect(state.cancelReason).toBe('operator-request');
    expect(processedControlSignalIds).toEqual(new Set(['sig-cancel-1']));
  });
});

function expectCancelSignalHandler(handler: unknown): (signalId: string, reason?: string) => void {
  expect(typeof handler).toBe('function');
  if (typeof handler !== 'function') {
    throw new TypeError('CANCEL_SIGNAL_HANDLER_NOT_REGISTERED');
  }

  return handler as (signalId: string, reason?: string) => void;
}
