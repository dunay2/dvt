import { describe, expect, it } from 'vitest';

import { ENGINE_ERROR_CODE } from '../../src/contracts/errors.js';
import type { RunEventInput } from '../../src/contracts/runEvents.js';
import type { RunBootstrapInput } from '../../src/ports/IRunStateStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { resolveOutboxShardId } from '../../src/state/outboxSharding.js';

function makeBootstrap(runId: string, tenantId = 't1'): RunBootstrapInput {
  return {
    metadata: {
      tenantId,
      projectId: 'p1',
      environmentId: 'dev',
      runId,
      planId: 'plan-minimal',
      planVersion: '1.0',
      logicalAttemptId: 1,
      providerRef: {
        provider: 'temporal',
        tenantId,
        namespace: 'default',
        workflowId: `wf-${runId}`,
        runId: `pr-${runId}`,
      },
    },
    firstEvents: [
      {
        eventId: `${runId}:queued`,
        eventType: 'RunQueued',
        runId,
        tenantId,
        projectId: 'p1',
        environmentId: 'dev',
        planId: 'plan-minimal',
        planVersion: '1.0',
        logicalAttemptId: 1,
        engineAttemptId: 1,
        emittedAt: '2026-03-11T00:00:00.000Z',
        idempotencyKey: `${runId}:queued`,
        payloadVersion: 1,
      },
    ],
  };
}

function makeStarted(runId: string, idempotencyKey: string, tenantId = 't1'): RunEventInput {
  return {
    eventId: idempotencyKey,
    eventType: 'RunStarted' as const,
    runId,
    tenantId,
    projectId: 'p1',
    environmentId: 'dev',
    planId: 'plan-minimal',
    planVersion: '1.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-11T00:00:00.000Z',
    idempotencyKey,
    payloadVersion: 1,
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
  it('filters pending claims by configured shard ownership', async () => {
    const shardCount = 2;
    const store = new InMemoryTxStore({ outboxShardCount: shardCount });
    const shard0RunId = findRunIdForShard(0, shardCount);
    const shard1RunId = findRunIdForShard(1, shardCount);

    await store.bootstrapRunTx(makeBootstrap(shard0RunId));
    await store.bootstrapRunTx(makeBootstrap(shard1RunId));

    const shard0Pending = await store.listPendingForClaim(10, { shardIds: [0] });
    expect(shard0Pending).toHaveLength(1);
    expect(shard0Pending[0]?.payload.runId).toBe(shard0RunId);

    const shard1Pending = await store.listPendingForClaim(10, { shardIds: [1] });
    expect(shard1Pending).toHaveLength(1);
    expect(shard1Pending[0]?.payload.runId).toBe(shard1RunId);
  });

  it('matches PostgreSQL signed 64-bit shard routing when the hash high bit is set', async () => {
    const store = new InMemoryTxStore({ outboxShardCount: 3 });

    await store.bootstrapRunTx(makeBootstrap('run-3'));

    const shard1Pending = await store.listPendingForClaim(10, { shardIds: [1] });
    expect(shard1Pending).toHaveLength(1);
    expect(shard1Pending[0]?.payload.runId).toBe('run-3');

    const shard2Pending = await store.listPendingForClaim(10, { shardIds: [2] });
    expect(shard2Pending).toHaveLength(0);
  });

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

    const deadLetters = await store.listDeadLetter(10, 't1');
    const deadLetter = deadLetters.find((record) => record.runId === 'run-dlq');
    const replayCandidate = requireDefined(deadLetter, 'expected run-dlq dead letter');
    expect(replayCandidate.payload).toEqual(pendingHead.payload);

    const moved = await store.replayDeadLetters({ tenantId: 't1', runId: 'run-dlq' });
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

  it('listDeadLetter scopes results to the requesting tenant', async () => {
    const store = new InMemoryTxStore();

    await store.bootstrapRunTx(makeBootstrap('run-t1', 't1'));
    await store.bootstrapRunTx(makeBootstrap('run-t2', 't2'));

    const [t1Head] = await store.listPending(10);
    const pendingT1Head = requireDefined(t1Head, 'expected t1 head');
    for (let i = 0; i < 10; i += 1) {
      await store.markFailed(pendingT1Head.id, `err-${i}`);
    }

    const t1DeadLetters = await store.listDeadLetter(10, 't1');
    expect(t1DeadLetters).toHaveLength(1);
    expect(t1DeadLetters[0]?.runId).toBe('run-t1');

    const t2DeadLetters = await store.listDeadLetter(10, 't2');
    expect(t2DeadLetters).toHaveLength(0);
  });

  it('rejects append when event tenantId does not match run tenant metadata', async () => {
    const store = new InMemoryTxStore();
    const runId = 'run-tenant-mismatch-append-tx';
    await store.bootstrapRunTx(makeBootstrap(runId, 't1'));

    await expect(
      store.appendAndEnqueueTx(runId, [makeStarted(runId, `${runId}:started`, 't2')])
    ).rejects.toMatchObject({
      name: 'InvalidRunEventInputError',
      code: ENGINE_ERROR_CODE.INVALID_RUN_EVENT_INPUT,
    });

    const events = await store.listEvents('t1', runId);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('RunQueued');
  });

  it('replayDeadLetters only restores dead letters belonging to the requesting tenant', async () => {
    const store = new InMemoryTxStore();

    await store.bootstrapRunTx(makeBootstrap('run-t1', 't1'));
    await store.bootstrapRunTx(makeBootstrap('run-t2', 't2'));

    const allPending = await store.listPending(10);
    const t1Head = allPending.find((r) => r.payload.runId === 'run-t1');
    const pendingT1Head = requireDefined(t1Head, 'expected t1 head');
    for (let i = 0; i < 10; i += 1) {
      await store.markFailed(pendingT1Head.id, `err-${i}`);
    }

    // t2 requests replay — should not affect t1's dead letter
    const movedByT2 = await store.replayDeadLetters({ tenantId: 't2' });
    expect(movedByT2).toBe(0);

    // t1's dead letter is still present
    const t1DeadLetters = await store.listDeadLetter(10, 't1');
    expect(t1DeadLetters).toHaveLength(1);

    // t1 replays its own dead letter
    const movedByT1 = await store.replayDeadLetters({ tenantId: 't1' });
    expect(movedByT1).toBe(1);

    const t1DeadLettersAfter = await store.listDeadLetter(10, 't1');
    expect(t1DeadLettersAfter).toHaveLength(0);
  });
});

function findRunIdForShard(targetShardId: number, shardCount: number): string {
  for (let index = 0; index < 256; index += 1) {
    const candidate = `run-shard-${targetShardId}-${index}`;
    if (resolveOutboxShardId(candidate, shardCount) === targetShardId) {
      return candidate;
    }
  }
  throw new Error(`Unable to find run id for shard ${targetShardId}`);
}
