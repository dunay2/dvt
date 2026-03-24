import { describe, expect, it } from 'vitest';

import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

function makeMetadata(
  runId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    runId,
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    provider: 'mock' as const,
    providerWorkflowId: `wf-${runId}`,
    providerRunId: `pr-${runId}`,
    ...overrides,
  };
}

describe('InMemoryTxStore retry lineage reservation', () => {
  it('reserves monotonic logical attempts for the same origin run', async () => {
    const store = new InMemoryTxStore();
    await store.bootstrapRunTx({
      metadata: makeMetadata('run-root'),
      firstEvents: [],
    });

    const reservations = await Promise.all([
      store.reserveRetryAttempt('tenant-1', 'run-root'),
      store.reserveRetryAttempt('tenant-1', 'run-root'),
      store.reserveRetryAttempt('tenant-1', 'run-root'),
    ]);

    expect(reservations.map((item) => item.logicalAttemptId).sort((a, b) => a - b)).toEqual([
      2, 3, 4,
    ]);
    expect(reservations.every((item) => item.originRunId === 'run-root')).toBe(true);
    expect(reservations.every((item) => item.parentRunId === 'run-root')).toBe(true);
  });

  it('keeps originRunId stable when reserving from a recovered child run', async () => {
    const store = new InMemoryTxStore();
    await store.bootstrapRunTx({
      metadata: makeMetadata('run-root'),
      firstEvents: [],
    });
    await store.bootstrapRunTx({
      metadata: makeMetadata('run-child', {
        logicalAttemptId: 2,
        parentRunId: 'run-root',
        originRunId: 'run-root',
      }),
      firstEvents: [],
    });

    const reservation = await store.reserveRetryAttempt('tenant-1', 'run-child');

    expect(reservation).toEqual({
      parentRunId: 'run-child',
      originRunId: 'run-root',
      logicalAttemptId: 3,
    });
  });
});
