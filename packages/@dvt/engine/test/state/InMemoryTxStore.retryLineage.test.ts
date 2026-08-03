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
    providerRef: {
      provider: 'temporal' as const,
      tenantId: 'tenant-1',
      namespace: 'default',
      workflowId: `wf-${runId}`,
      runId: `pr-${runId}`,
    },
    ...overrides,
  };
}

describe('InMemoryTxStore recovery bootstrap lineage', () => {
  it('bootstraps monotonic logical attempts for the same origin run', async () => {
    const store = new InMemoryTxStore();
    await store.bootstrapRunTx({
      metadata: makeMetadata('run-root'),
      firstEvents: [],
    });

    const preparedRuns = await Promise.all(
      ['run-child-a', 'run-child-b', 'run-child-c'].map((runId) =>
        store.bootstrapRecoveryRunTx('tenant-1', 'run-root', (reservation) => ({
          metadata: makeMetadata(runId, {
            logicalAttemptId: reservation.logicalAttemptId,
            parentRunId: reservation.parentRunId,
            originRunId: reservation.originRunId,
          }),
          firstEvents: [],
        }))
      )
    );
    const reservations = preparedRuns.map((prepared) => prepared.reservation);

    expect(reservations.map((item) => item.logicalAttemptId).sort((a, b) => a - b)).toEqual([
      2, 3, 4,
    ]);
    expect(reservations.every((item) => item.originRunId === 'run-root')).toBe(true);
    expect(reservations.every((item) => item.parentRunId === 'run-root')).toBe(true);
  });

  it('keeps originRunId stable when bootstrapping from a recovered child run', async () => {
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

    const prepared = await store.bootstrapRecoveryRunTx('tenant-1', 'run-child', (reservation) => ({
      metadata: makeMetadata('run-grandchild', {
        logicalAttemptId: reservation.logicalAttemptId,
        parentRunId: reservation.parentRunId,
        originRunId: reservation.originRunId,
      }),
      firstEvents: [],
    }));

    expect(prepared.reservation).toEqual({
      parentRunId: 'run-child',
      originRunId: 'run-root',
      logicalAttemptId: 3,
    });
  });
});
