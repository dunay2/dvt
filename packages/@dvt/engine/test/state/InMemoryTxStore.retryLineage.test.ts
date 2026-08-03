import { describe, expect, it } from 'vitest';

import type { EventInput, RunMetadata } from '../../src/contracts/runEvents.js';
import type { RecoveryRunBootstrapResult } from '../../src/ports/IRunStateStore.js';
import { InMemoryRunStateCore } from '../../src/state/InMemoryRunStateCore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

function makeMetadata(runId: string, overrides: Partial<RunMetadata> = {}): RunMetadata {
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

function makeQueuedEvent(runId: string, logicalAttemptId: number): EventInput {
  return {
    eventId: `${runId}:queued`,
    eventType: 'RunQueued',
    runId,
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId,
    engineAttemptId: 1,
    emittedAt: '2026-08-02T00:00:00.000Z',
    idempotencyKey: `${runId}:queued`,
    payloadVersion: 1,
  };
}

type RecoveryBootstrapStore = Pick<InMemoryRunStateCore, 'bootstrapRecoveryRunTx'>;
type DeferredWriteFailure = {
  release: () => void;
  started: Promise<void>;
  store: InMemoryRunStateCore;
};

function bootstrapRecovery(
  store: RecoveryBootstrapStore,
  sourceRunId: string,
  childRunId: string,
  includeQueuedEvent = false
): Promise<RecoveryRunBootstrapResult> {
  return store.bootstrapRecoveryRunTx('tenant-1', sourceRunId, (reservation) => ({
    metadata: makeMetadata(childRunId, {
      logicalAttemptId: reservation.logicalAttemptId,
      parentRunId: reservation.parentRunId,
      originRunId: reservation.originRunId,
    }),
    firstEvents: includeQueuedEvent
      ? [makeQueuedEvent(childRunId, reservation.logicalAttemptId)]
      : [],
  }));
}

function createDeferredWriteFailure(failedRunId: string): DeferredWriteFailure {
  let release!: () => void;
  let reportStarted!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    reportStarted = resolve;
  });
  const store = new InMemoryRunStateCore({
    commitOutbox: async (runId) => {
      if (runId !== failedRunId) return;
      reportStarted();
      await gate;
      throw new Error('outbox unavailable');
    },
  });

  return { release, started, store };
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

  it('does not roll back a successful concurrent bootstrap from another origin', async () => {
    const { release, started, store } = createDeferredWriteFailure('run-a-failed-child');
    await store.bootstrapRunTx({ metadata: makeMetadata('run-a'), firstEvents: [] });
    await store.bootstrapRunTx({ metadata: makeMetadata('run-b'), firstEvents: [] });

    const failedBootstrap = bootstrapRecovery(store, 'run-a', 'run-a-failed-child', true);
    await started;
    const successful = await bootstrapRecovery(store, 'run-b', 'run-b-child', true);
    release();
    await expect(failedBootstrap).rejects.toThrow('outbox unavailable');

    const next = await bootstrapRecovery(store, 'run-b', 'run-b-next-child');

    expect(successful.reservation.logicalAttemptId).toBe(2);
    expect(next.reservation.logicalAttemptId).toBe(3);
  });

  it('serializes bootstrap rollback within the same recovery lineage', async () => {
    const { release, started, store } = createDeferredWriteFailure('run-failed-child');
    await store.bootstrapRunTx({ metadata: makeMetadata('run-root'), firstEvents: [] });

    const failedBootstrap = bootstrapRecovery(store, 'run-root', 'run-failed-child', true);
    await started;
    const successfulBootstrap = bootstrapRecovery(store, 'run-root', 'run-successful-child');
    release();

    await expect(failedBootstrap).rejects.toThrow('outbox unavailable');
    await expect(successfulBootstrap).resolves.toMatchObject({
      reservation: { logicalAttemptId: 2, originRunId: 'run-root' },
    });
  });
});
