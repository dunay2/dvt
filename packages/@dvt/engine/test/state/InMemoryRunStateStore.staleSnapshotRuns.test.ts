import { describe, expect, it } from 'vitest';

import type { RunBootstrapInput } from '../../src/ports/IRunStateStore.js';
import { InMemoryRunStateStore } from '../../src/state/InMemoryRunStateStore.js';

type InMemoryRunStateStoreInternals = {
  snapshotByRunId: Map<string, unknown>;
  snapshotLastRunSeqByRunId: Map<string, number>;
};

function makeBootstrap(runId: string, createdAt: string): RunBootstrapInput {
  return {
    metadata: {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'dev',
      runId,
      planId: 'plan-minimal',
      planVersion: '1.0',
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: `wf-${runId}`,
      providerRunId: `pr-${runId}`,
      createdAt,
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        eventType: 'RunQueued',
        runId,
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'dev',
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        engineAttemptId: 1,
        emittedAt: createdAt,
        idempotencyKey: `${runId}:queued`,
        payloadVersion: 1,
      },
    ],
  };
}

describe('InMemoryRunStateStore stale snapshot runs', () => {
  it('returns missing and stale snapshots in createdAt order', async () => {
    const store = new InMemoryRunStateStore();

    await store.bootstrapRunTx(makeBootstrap('run-missing-snapshot', '2026-03-10T00:00:00.000Z'));
    const missingInternals = store as unknown as InMemoryRunStateStoreInternals;
    missingInternals.snapshotByRunId.delete('run-missing-snapshot');
    missingInternals.snapshotLastRunSeqByRunId.delete('run-missing-snapshot');

    await store.bootstrapRunTx(makeBootstrap('run-stale-snapshot', '2026-03-11T00:00:00.000Z'));
    missingInternals.snapshotLastRunSeqByRunId.set('run-stale-snapshot', 0);

    await store.bootstrapRunTx(makeBootstrap('run-current-snapshot', '2026-03-12T00:00:00.000Z'));

    await expect(store.listStaleSnapshotRuns(10)).resolves.toEqual([
      { runId: 'run-missing-snapshot', tenantId: 't1' },
      { runId: 'run-stale-snapshot', tenantId: 't1' },
    ]);
  });

  it('checks staleness for a single run with tenant scope', async () => {
    const store = new InMemoryRunStateStore();
    await store.bootstrapRunTx(makeBootstrap('run-stale', '2026-03-13T00:00:00.000Z'));
    (store as unknown as InMemoryRunStateStoreInternals).snapshotLastRunSeqByRunId.set(
      'run-stale',
      0
    );

    await expect(store.isSnapshotStale('t1', 'run-stale')).resolves.toBe(true);
    await expect(store.isSnapshotStale('t2', 'run-stale')).resolves.toBe(false);
    await expect(store.isSnapshotStale('t1', 'run-missing')).resolves.toBe(false);
  });

  it('does not mark missing snapshot as stale when there are no events', async () => {
    const store = new InMemoryRunStateStore();
    await store.bootstrapRunTx(makeBootstrap('run-empty', '2026-03-14T00:00:00.000Z'));

    const internals = store as unknown as InMemoryRunStateStoreInternals & {
      eventsByRunId: Map<string, unknown[]>;
    };
    internals.eventsByRunId.set('run-empty', []);
    internals.snapshotByRunId.delete('run-empty');
    internals.snapshotLastRunSeqByRunId.delete('run-empty');

    await expect(store.isSnapshotStale('t1', 'run-empty')).resolves.toBe(false);
    await expect(store.listStaleSnapshotRuns(10)).resolves.toEqual([]);
  });
});
