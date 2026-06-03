import { describe, expect, it } from 'vitest';

import type { EventEnvelope } from '../../src/contracts/runEvents.js';
import { applyRunEvent } from '../../src/core/SnapshotProjector.js';
import type { RunBootstrapInput } from '../../src/ports/IRunStateStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { createDefaultWorkflowSnapshot } from '../../src/state/runEventWritePolicy.js';

import { makeBootstrap } from './runBootstrapTestSupport.js';

type InMemoryTxStoreInternals = {
  runState: {
    eventsByRunId: Map<string, EventEnvelope[]>;
    snapshotByRunId: Map<string, ReturnType<typeof createDefaultWorkflowSnapshot>>;
    snapshotLastRunSeqByRunId: Map<string, number>;
  };
};

function makeRunStarted(
  runId: string,
  emittedAt: string
): RunBootstrapInput['firstEvents'][number] {
  return {
    eventId: `${runId}:started`,
    eventType: 'RunStarted' as const,
    runId,
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    planId: 'plan-minimal',
    planVersion: '1.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt,
    idempotencyKey: `${runId}:started`,
    payloadVersion: 1 as const,
  };
}

describe('InMemoryTxStore.rebuildSnapshot', () => {
  it('replays only the event delta when a compatible checkpoint exists', async () => {
    const runId = 'run-delta';
    const store = new InMemoryTxStore();

    await store.bootstrapRunTx(makeBootstrap(runId, { createdAt: '2026-04-16T00:00:00.000Z' }));
    await store.appendAndEnqueueTx(runId, [makeRunStarted(runId, '2026-04-16T00:00:01.000Z')]);

    const internals = store as unknown as InMemoryTxStoreInternals;
    const events = internals.runState.eventsByRunId.get(runId) ?? [];
    const checkpointSnapshot = createDefaultWorkflowSnapshot(runId);
    applyRunEvent(checkpointSnapshot, events[0]);
    internals.runState.snapshotByRunId.set(runId, checkpointSnapshot);
    internals.runState.snapshotLastRunSeqByRunId.set(runId, events[0]?.runSeq ?? 0);

    const rebuilt = await store.rebuildSnapshot('t1', runId);

    expect(rebuilt.status).toBe('RUNNING');
    expect(internals.runState.snapshotLastRunSeqByRunId.get(runId)).toBe(2);
  });

  it('falls back to full replay when checkpoint schema is incompatible', async () => {
    const runId = 'run-full-fallback';
    const store = new InMemoryTxStore();

    await store.bootstrapRunTx(makeBootstrap(runId, { createdAt: '2026-04-16T00:00:00.000Z' }));
    await store.appendAndEnqueueTx(runId, [makeRunStarted(runId, '2026-04-16T00:00:01.000Z')]);

    const internals = store as unknown as InMemoryTxStoreInternals;
    const incompatibleSnapshot = createDefaultWorkflowSnapshot(runId);
    incompatibleSnapshot.schemaVersion = 0;
    internals.runState.snapshotByRunId.set(runId, incompatibleSnapshot);
    internals.runState.snapshotLastRunSeqByRunId.set(runId, 1);

    const rebuilt = await store.rebuildSnapshot('t1', runId);

    expect(rebuilt.schemaVersion).toBe(1);
    expect(rebuilt.status).toBe('RUNNING');
    expect(internals.runState.snapshotLastRunSeqByRunId.get(runId)).toBe(2);
  });
});
