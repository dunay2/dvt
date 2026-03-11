import { describe, expect, it } from 'vitest';

import type { RunEventInput } from '../../src/contracts/runEvents.js';
import type { RunBootstrapInput } from '../../src/ports/IRunStateStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

function makeBootstrap(runId: string): RunBootstrapInput {
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
        emittedAt: '2026-03-11T00:00:00.000Z',
        idempotencyKey: `${runId}:queued`,
      },
    ],
  };
}

function makeStarted(runId: string, idempotencyKey: string): RunEventInput {
  return {
    eventId: idempotencyKey,
    eventType: 'RunStarted' as const,
    runId,
    tenantId: 't1',
    projectId: 'p1',
    environmentId: 'dev',
    planId: 'plan-minimal',
    planVersion: '1.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-11T00:00:00.000Z',
    idempotencyKey,
  };
}

function requireDefined<T>(value: T | undefined, message: string): T {
  expect(value, message).toBeDefined();
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

describe('InMemoryTxStore outbox semantics', () => {
  it('blocks later same-run records while a failed head is waiting on backoff', async () => {
    const now = { value: 0 };
    const store = new InMemoryTxStore({ outboxNowMs: () => now.value });

    await store.bootstrapRunTx(makeBootstrap('run-ordered'));
    await store.appendAndEnqueueTx('run-ordered', [
      makeStarted('run-ordered', 'run-ordered:started'),
    ]);

    const [head] = await store.listPending(10);
    const pendingHead = requireDefined(head, 'expected run-ordered head');
    expect(pendingHead.payload.runSeq).toBe(1);

    await store.markFailed(pendingHead.id, 'synthetic failure');

    const pendingDuringBackoff = await store.listPending(10);
    expect(pendingDuringBackoff).toHaveLength(0);

    now.value = 1_001;
    const pendingAfterBackoff = await store.listPending(10);
    expect(pendingAfterBackoff).toHaveLength(1);
    expect(pendingAfterBackoff[0]?.payload.runId).toBe('run-ordered');
    expect(pendingAfterBackoff[0]?.payload.runSeq).toBe(1);
  });

  it('keeps other runs drainable while one run is blocked on retry backoff', async () => {
    const now = { value: 0 };
    const store = new InMemoryTxStore({ outboxNowMs: () => now.value });

    await store.bootstrapRunTx(makeBootstrap('run-a'));
    await store.appendAndEnqueueTx('run-a', [makeStarted('run-a', 'run-a:started')]);
    await store.bootstrapRunTx(makeBootstrap('run-b'));

    const initialPending = await store.listPending(10);
    const runAHead = initialPending.find((record) => record.payload.runId === 'run-a');
    const pendingRunAHead = requireDefined(runAHead, 'expected run-a head');
    expect(pendingRunAHead.payload.runSeq).toBe(1);

    await store.markFailed(pendingRunAHead.id, 'synthetic failure');

    const pendingDuringBackoff = await store.listPending(10);
    expect(pendingDuringBackoff.map((record) => record.payload.runId)).toEqual(['run-b']);
    expect(pendingDuringBackoff[0]?.payload.runSeq).toBe(1);
  });

  it('dead-letters block the run and replay restores the original envelope before unblocking', async () => {
    const store = new InMemoryTxStore();

    await store.bootstrapRunTx(makeBootstrap('run-dlq'));
    await store.appendAndEnqueueTx('run-dlq', [makeStarted('run-dlq', 'run-dlq:started')]);

    const initialPending = await store.listPending(10);
    const head = initialPending.find((record) => record.payload.runId === 'run-dlq');
    const pendingHead = requireDefined(head, 'expected run-dlq head');
    expect(pendingHead.payload.runSeq).toBe(1);

    for (let i = 0; i < 10; i += 1) {
      await store.markFailed(pendingHead.id, `dlq-${i}`);
    }

    const pendingWhileBlocked = await store.listPending(10);
    expect(
      pendingWhileBlocked.find((record) => record.payload.runId === 'run-dlq')
    ).toBeUndefined();

    const deadLetters = await store.listDeadLetter(10);
    const deadLetter = deadLetters.find((record) => record.runId === 'run-dlq');
    const replayCandidate = requireDefined(deadLetter, 'expected run-dlq dead letter');
    expect(replayCandidate.payload).toEqual(pendingHead.payload);

    const moved = await store.replayDeadLetters({ runId: 'run-dlq' });
    expect(moved).toBe(1);

    const pendingAfterReplay = await store.listPending(10);
    const replayedHead = pendingAfterReplay.find((record) => record.payload.runId === 'run-dlq');
    const replayedPendingHead = requireDefined(replayedHead, 'expected replayed run-dlq head');
    expect(replayedPendingHead.payload).toEqual(pendingHead.payload);
    expect(replayedPendingHead.attempts).toBe(0);
    expect(replayedPendingHead.lastError).toBeUndefined();
    expect(replayedPendingHead.nextAttemptAt).toBeUndefined();

    await store.markDelivered([replayedPendingHead.id]);

    const afterHeadDelivered = await store.listPending(10);
    const next = afterHeadDelivered.find((record) => record.payload.runId === 'run-dlq');
    expect(next?.payload.runSeq).toBe(2);
  });
});
