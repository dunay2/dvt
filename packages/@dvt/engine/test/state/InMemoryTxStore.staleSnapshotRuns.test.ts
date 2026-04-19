import { describe, expect, it } from 'vitest';

import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

import { makeBootstrap } from './runBootstrapTestSupport.js';

type InMemoryTxStoreInternals = {
  runState: {
    snapshotByRunId: Map<string, unknown>;
    snapshotLastRunSeqByRunId: Map<string, number>;
    eventsByRunId: Map<string, unknown[]>;
  };
};

describe('InMemoryTxStore stale snapshot runs', () => {
  it('returns missing and stale snapshots in createdAt order', async () => {
    const store = new InMemoryTxStore();

    await store.bootstrapRunTx(
      makeBootstrap('run-missing-snapshot', { createdAt: '2026-03-10T00:00:00.000Z' })
    );
    (store as unknown as InMemoryTxStoreInternals).runState.snapshotByRunId.delete(
      'run-missing-snapshot'
    );
    (store as unknown as InMemoryTxStoreInternals).runState.snapshotLastRunSeqByRunId.delete(
      'run-missing-snapshot'
    );

    await store.bootstrapRunTx(
      makeBootstrap('run-stale-snapshot', { createdAt: '2026-03-11T00:00:00.000Z' })
    );
    (store as unknown as InMemoryTxStoreInternals).runState.snapshotLastRunSeqByRunId.set(
      'run-stale-snapshot',
      0
    );

    await store.bootstrapRunTx(
      makeBootstrap('run-current-snapshot', { createdAt: '2026-03-12T00:00:00.000Z' })
    );

    await expect(store.listStaleSnapshotRuns(10)).resolves.toEqual([
      { runId: 'run-missing-snapshot', tenantId: 't1' },
      { runId: 'run-stale-snapshot', tenantId: 't1' },
    ]);
  });

  it('checks staleness for a single run with tenant scope', async () => {
    const store = new InMemoryTxStore();
    await store.bootstrapRunTx(
      makeBootstrap('run-stale', { createdAt: '2026-03-13T00:00:00.000Z' })
    );
    (store as unknown as InMemoryTxStoreInternals).runState.snapshotLastRunSeqByRunId.set(
      'run-stale',
      0
    );

    await expect(store.isSnapshotStale('t1', 'run-stale')).resolves.toBe(true);
    await expect(store.isSnapshotStale('t2', 'run-stale')).resolves.toBe(false);
    await expect(store.isSnapshotStale('t1', 'run-missing')).resolves.toBe(false);
  });

  it('does not mark missing snapshot as stale when there are no events', async () => {
    const store = new InMemoryTxStore();
    await store.bootstrapRunTx(
      makeBootstrap('run-empty', { createdAt: '2026-03-14T00:00:00.000Z' })
    );

    const internals = store as unknown as InMemoryTxStoreInternals;
    internals.runState.eventsByRunId.set('run-empty', []);
    internals.runState.snapshotByRunId.delete('run-empty');
    internals.runState.snapshotLastRunSeqByRunId.delete('run-empty');

    await expect(store.isSnapshotStale('t1', 'run-empty')).resolves.toBe(false);
    await expect(store.listStaleSnapshotRuns(10)).resolves.toEqual([]);
  });
});
