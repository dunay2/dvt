import type { RunEventInput, RunMetadata } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { PostgresRunStateCommandPortBridge } from '../src/runStateCommandPortBridge.js';

function buildMetadata(runId: string): RunMetadata {
  return {
    tenantId: 't-1',
    projectId: 'p-1',
    environmentId: 'e-1',
    runId,
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    provider: 'temporal',
    providerWorkflowId: runId,
    providerRunId: runId,
  };
}

function buildRunStarted(runId: string): RunEventInput {
  return {
    eventId: 'ev-1',
    eventType: 'RunStarted',
    runId,
    tenantId: 't-1',
    projectId: 'p-1',
    environmentId: 'e-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-01-01T00:00:00.000Z',
    idempotencyKey: `RunStarted|t-1|${runId}|1|`,
  };
}

describe('PostgresRunStateCommandPortBridge', () => {
  it('delegates bootstrapRun to bootstrapRunTx', async () => {
    const store = {
      bootstrapRunTx: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
      appendAndEnqueueTx: vi.fn(),
    } as any;

    const bridge = new PostgresRunStateCommandPortBridge(store);
    const input = { metadata: buildMetadata('run-1'), firstEvents: [] };

    await bridge.bootstrapRun(input);
    expect(store.bootstrapRunTx).toHaveBeenCalledWith(input);
  });

  it('delegates appendTransitions to appendAndEnqueueTx', async () => {
    const store = {
      bootstrapRunTx: vi.fn(),
      appendAndEnqueueTx: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
    } as any;

    const bridge = new PostgresRunStateCommandPortBridge(store);
    const events = [buildRunStarted('run-2')];

    await bridge.appendTransitions('run-2', events);
    expect(store.appendAndEnqueueTx).toHaveBeenCalledWith('run-2', events);
  });
});
