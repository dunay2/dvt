import { InvalidStateTransitionError } from '@dvt/run-domain';
import { describe, expect, it } from 'vitest';

import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import type { IRunSnapshotStalenessQuery } from '../../src/ports/IRunSnapshotStalenessQuery.js';
import type { IRunStateStoreRead, WorkflowSnapshot } from '../../src/ports/IRunStateStore.js';
import { SignalTransitionGuard } from '../../src/services/signal/SignalTransitionGuard.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { appendRunStarted, bootstrapQueuedRun } from '../helpers/runLifecycle.fixture.js';

async function appendRunLifecycleEvent(
  store: InMemoryTxStore,
  runId: string,
  eventType: 'RunPaused' | 'RunResumed',
  emittedAt: string
): Promise<void> {
  const meta = await store.getRunMetadataByRunId('t', runId);
  if (!meta) {
    throw new Error(`RUN_METADATA_NOT_FOUND: ${runId}`);
  }

  await store.appendAndEnqueueTx(runId, [
    {
      eventId: `${runId}:${eventType}:${emittedAt}`,
      eventType,
      runId,
      tenantId: meta.tenantId,
      projectId: meta.projectId,
      environmentId: meta.environmentId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      logicalAttemptId: meta.logicalAttemptId,
      engineAttemptId: 1,
      payloadVersion: 1,
      emittedAt,
      idempotencyKey: `${runId}:${eventType}:${emittedAt}`,
    },
  ]);
}

function readStoreWithSnapshot(
  store: InMemoryTxStore,
  snapshot: WorkflowSnapshot,
  config?: {
    snapshotStale?: boolean;
    throwOnListEvents?: boolean;
  }
): IRunStateStoreRead & Partial<IRunSnapshotStalenessQuery> {
  return {
    getRunMetadataByRunId(tenantId, runId) {
      return store.getRunMetadataByRunId(tenantId, runId);
    },
    listEvents(tenantId, runId, options) {
      if (config?.throwOnListEvents) {
        throw new Error('LIST_EVENTS_NOT_EXPECTED');
      }
      return store.listEvents(tenantId, runId, options);
    },
    listRuns(options) {
      return store.listRuns(options);
    },
    async getSnapshot() {
      return snapshot;
    },
    async isSnapshotStale() {
      return config?.snapshotStale ?? false;
    },
  };
}

describe('SignalTransitionGuard', () => {
  it('allows PAUSE from event-authoritative running state without persisting a transient lifecycle event', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-pause-1');
    await appendRunStarted(store, 'guard-pause-1');
    const meta = await store.getRunMetadataByRunId('t', 'guard-pause-1');
    if (!meta) throw new Error('expected run metadata');
    const persistedSnapshot = await store.getSnapshot('t', 'guard-pause-1');
    if (!persistedSnapshot) throw new Error('expected workflow snapshot');

    const beforeEventTypes = (await store.listEvents('t', 'guard-pause-1')).map((e) => e.eventType);
    const guard = new SignalTransitionGuard({
      stateStoreRead: readStoreWithSnapshot(
        store,
        {
          ...persistedSnapshot,
          status: 'PENDING',
          paused: false,
        },
        { snapshotStale: true }
      ),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:00.000Z'),
    });

    const result = await guard.assertAllowed(
      meta,
      { signalId: 'sig-guard-pause-1', type: 'PAUSE' },
      'RunPaused'
    );

    expect(result).toBe('allowed');
    const afterEventTypes = (await store.listEvents('t', 'guard-pause-1')).map((e) => e.eventType);
    expect(afterEventTypes).toEqual(beforeEventTypes);
  });

  it('returns already_applied for PAUSE once the runtime has emitted RunPaused', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-pause-2');
    await appendRunStarted(store, 'guard-pause-2');
    await appendRunLifecycleEvent(store, 'guard-pause-2', 'RunPaused', '2026-04-07T00:00:01.000Z');
    const meta = await store.getRunMetadataByRunId('t', 'guard-pause-2');
    if (!meta) throw new Error('expected run metadata');

    const guard = new SignalTransitionGuard({
      stateStoreRead: store,
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:02.000Z'),
    });

    await expect(
      guard.assertAllowed(meta, { signalId: 'sig-guard-pause-2', type: 'PAUSE' }, 'RunPaused')
    ).resolves.toBe('already_applied');
  });

  it('returns already_applied for RESUME after the runtime has already emitted RunResumed', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-resume-1');
    await appendRunStarted(store, 'guard-resume-1');
    await appendRunLifecycleEvent(store, 'guard-resume-1', 'RunPaused', '2026-04-07T00:00:01.000Z');
    await appendRunLifecycleEvent(
      store,
      'guard-resume-1',
      'RunResumed',
      '2026-04-07T00:00:02.000Z'
    );
    const meta = await store.getRunMetadataByRunId('t', 'guard-resume-1');
    if (!meta) throw new Error('expected run metadata');

    const guard = new SignalTransitionGuard({
      stateStoreRead: store,
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:03.000Z'),
    });

    await expect(
      guard.assertAllowed(meta, { signalId: 'sig-guard-resume-1', type: 'RESUME' }, 'RunResumed')
    ).resolves.toBe('already_applied');
  });

  it('allows a new PAUSE after a runtime-owned resume cycle', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-pause-cycle-1');
    await appendRunStarted(store, 'guard-pause-cycle-1');
    await appendRunLifecycleEvent(
      store,
      'guard-pause-cycle-1',
      'RunPaused',
      '2026-04-07T00:00:01.000Z'
    );
    await appendRunLifecycleEvent(
      store,
      'guard-pause-cycle-1',
      'RunResumed',
      '2026-04-07T00:00:02.000Z'
    );
    const meta = await store.getRunMetadataByRunId('t', 'guard-pause-cycle-1');
    if (!meta) throw new Error('expected run metadata');

    const guard = new SignalTransitionGuard({
      stateStoreRead: store,
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:03.000Z'),
    });

    await expect(
      guard.assertAllowed(meta, { signalId: 'sig-guard-pause-3', type: 'PAUSE' }, 'RunPaused')
    ).resolves.toBe('allowed');
  });

  it('returns already_applied for PAUSE when snapshot is stale but latest runtime event is RunPaused', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-pause-stale-1');
    await appendRunStarted(store, 'guard-pause-stale-1');
    await appendRunLifecycleEvent(
      store,
      'guard-pause-stale-1',
      'RunPaused',
      '2026-04-07T00:00:01.000Z'
    );
    const meta = await store.getRunMetadataByRunId('t', 'guard-pause-stale-1');
    if (!meta) throw new Error('expected run metadata');

    const persistedSnapshot = await store.getSnapshot('t', 'guard-pause-stale-1');
    if (!persistedSnapshot) throw new Error('expected workflow snapshot');

    const guard = new SignalTransitionGuard({
      stateStoreRead: readStoreWithSnapshot(
        store,
        {
          ...persistedSnapshot,
          status: 'PENDING',
          paused: false,
        },
        { snapshotStale: true }
      ),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:02.000Z'),
    });

    await expect(
      guard.assertAllowed(meta, { signalId: 'sig-guard-pause-stale-1', type: 'PAUSE' }, 'RunPaused')
    ).resolves.toBe('already_applied');
  });

  it('returns already_applied for RESUME when snapshot is stale but latest runtime event is RunResumed', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-resume-stale-1');
    await appendRunStarted(store, 'guard-resume-stale-1');
    await appendRunLifecycleEvent(
      store,
      'guard-resume-stale-1',
      'RunPaused',
      '2026-04-07T00:00:01.000Z'
    );
    await appendRunLifecycleEvent(
      store,
      'guard-resume-stale-1',
      'RunResumed',
      '2026-04-07T00:00:02.000Z'
    );
    const meta = await store.getRunMetadataByRunId('t', 'guard-resume-stale-1');
    if (!meta) throw new Error('expected run metadata');

    const persistedSnapshot = await store.getSnapshot('t', 'guard-resume-stale-1');
    if (!persistedSnapshot) throw new Error('expected workflow snapshot');

    const guard = new SignalTransitionGuard({
      stateStoreRead: readStoreWithSnapshot(
        store,
        {
          ...persistedSnapshot,
          status: 'PAUSED',
          paused: true,
        },
        { snapshotStale: true }
      ),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:03.000Z'),
    });

    await expect(
      guard.assertAllowed(
        meta,
        { signalId: 'sig-guard-resume-stale-1', type: 'RESUME' },
        'RunResumed'
      )
    ).resolves.toBe('already_applied');
  });

  it('uses the snapshot fast path when the snapshot is marked fresh', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-fast-path-1');
    await appendRunStarted(store, 'guard-fast-path-1');
    const meta = await store.getRunMetadataByRunId('t', 'guard-fast-path-1');
    if (!meta) throw new Error('expected run metadata');
    const persistedSnapshot = await store.getSnapshot('t', 'guard-fast-path-1');
    if (!persistedSnapshot) throw new Error('expected workflow snapshot');

    const guard = new SignalTransitionGuard({
      stateStoreRead: readStoreWithSnapshot(store, persistedSnapshot, {
        snapshotStale: false,
        throwOnListEvents: true,
      }),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:00.000Z'),
    });

    await expect(
      guard.assertAllowed(meta, { signalId: 'sig-guard-fast-path-1', type: 'PAUSE' }, 'RunPaused')
    ).resolves.toBe('allowed');
  });

  it('rejects RESUME on a fresh RUNNING snapshot when no runtime resume event exists', async () => {
    const store = new InMemoryTxStore();
    await bootstrapQueuedRun(store, 'guard-resume-invalid-fresh-1');
    await appendRunStarted(store, 'guard-resume-invalid-fresh-1');
    const meta = await store.getRunMetadataByRunId('t', 'guard-resume-invalid-fresh-1');
    if (!meta) throw new Error('expected run metadata');
    const persistedSnapshot = await store.getSnapshot('t', 'guard-resume-invalid-fresh-1');
    if (!persistedSnapshot) throw new Error('expected workflow snapshot');

    const guard = new SignalTransitionGuard({
      stateStoreRead: readStoreWithSnapshot(store, persistedSnapshot, {
        snapshotStale: false,
      }),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-04-07T00:00:00.000Z'),
    });

    await expect(
      guard.assertAllowed(
        meta,
        { signalId: 'sig-guard-resume-invalid-fresh-1', type: 'RESUME' },
        'RunResumed'
      )
    ).rejects.toBeInstanceOf(InvalidStateTransitionError);
  });
});
