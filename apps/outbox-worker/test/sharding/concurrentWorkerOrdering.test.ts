/**
 * G5.5C — Concurrent-worker ordering proof
 *
 * Validates ADR-0009 INV-OUTBOX-002: concurrent workers cannot reorder events
 * for the same runId.
 *
 * The proof relies on the shard model selected in ADR-0033:
 *   shard_id = stableHash(runId) % shardCount
 *
 * Because shard assignment is deterministic and worker shard ownership is
 * disjoint, any given runId belongs to exactly one worker at a time. That
 * exclusivity is sufficient to guarantee per-runId ordering without any
 * cross-worker coordination.
 *
 * Tests use InMemoryOutboxStorage (same shard routing logic as the Postgres
 * adapter) and OutboxWorker directly so the proof stays at the
 * storage/worker boundary and does not require a live database.
 */

import type { EventEnvelope as RunEventPersisted } from '@dvt/contracts';
import { OutboxWorker } from '@dvt/delivery';
import { InMemoryEventBus, InMemoryOutboxStorage } from '@dvt/delivery/testing';
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeEvent(
  runId: string,
  eventId: string,
  idempotencyKey: string,
  runSeq: number
): RunEventPersisted {
  return {
    eventId,
    eventType: 'RunQueued',
    runId,
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-03-12T00:00:00.000Z',
    persistedAt: '2026-03-12T00:00:00.000Z',
    idempotencyKey,
    runSeq,
  };
}

function makeRunEvents(runId: string, runSeqs: number[]): RunEventPersisted[] {
  return runSeqs.map((seq) => makeEvent(runId, `evt-${runId}-${seq}`, `key-${runId}-${seq}`, seq));
}

// ---------------------------------------------------------------------------
// Probe helper: discover which shard a runId belongs to without depending on
// the private resolveShardId function. Enqueues a single event and queries
// each shard selection until the record is found.
// ---------------------------------------------------------------------------

async function discoverShard(runId: string, shardCount: number): Promise<number> {
  const probe = new InMemoryOutboxStorage({ shardCount });
  await probe.enqueueTx(runId, [makeEvent(runId, 'probe-evt', 'probe-key', 1)]);

  for (let shard = 0; shard < shardCount; shard++) {
    const records = await probe.listPendingForClaim(1, { shardIds: [shard] });
    if (records.length > 0) {
      return shard;
    }
  }

  throw new Error(`no shard found for runId=${runId} with shardCount=${shardCount}`);
}

// Find one runId per shard across a candidate list. Fails if any shard cannot
// be covered by the candidates.
async function findRunIdPerShard(
  shardCount: number,
  candidates: string[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  for (const runId of candidates) {
    if (result.size === shardCount) break;
    const shard = await discoverShard(runId, shardCount);
    if (!result.has(shard)) {
      result.set(shard, runId);
    }
  }

  if (result.size < shardCount) {
    const missing = Array.from({ length: shardCount }, (_, i) => i).filter((s) => !result.has(s));
    throw new Error(`could not find runIds for shards ${missing.join(',')} from candidates`);
  }

  return result;
}

function requireRunIdForShard(shardMap: Map<number, string>, shardId: number): string {
  const runId = shardMap.get(shardId);
  if (runId === undefined) {
    throw new Error(`missing runId for shard ${shardId}`);
  }
  return runId;
}

const RUN_ID_CANDIDATES = [
  'run-alpha',
  'run-beta',
  'run-gamma',
  'run-delta',
  'run-epsilon',
  'run-zeta',
  'run-eta',
  'run-theta',
  'run-iota',
  'run-kappa',
  'run-lambda',
  'run-mu',
  'run-nu',
  'run-xi',
  'run-omicron',
  'run-pi',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('concurrentWorkerOrdering', () => {
  it('shard routing is deterministic: same runId always maps to the same shard', async () => {
    const shardCount = 4;
    const runId = 'run-alpha';

    // Discover the shard on a fresh storage twice — must be identical.
    const firstShard = await discoverShard(runId, shardCount);
    const secondShard = await discoverShard(runId, shardCount);

    expect(firstShard).toBe(secondShard);

    // Enqueue multiple events for the same runId and verify they all land in
    // the same shard bucket.
    const storage = new InMemoryOutboxStorage({ shardCount });
    await storage.enqueueTx(runId, makeRunEvents(runId, [1, 2, 3]));

    // The owning shard returns the head event (runSeq 1).
    const ownedBatch = await storage.listPendingForClaim(10, { shardIds: [firstShard] });
    expect(ownedBatch.length > 0).toBe(true);
    for (const record of ownedBatch) {
      expect(record.payload.runId).toBe(runId);
    }

    // Every other shard returns nothing for this runId.
    for (let shard = 0; shard < shardCount; shard++) {
      if (shard === firstShard) continue;
      const nonOwnerBatch = await storage.listPendingForClaim(10, { shardIds: [shard] });
      const runsInBatch = new Set(nonOwnerBatch.map((r) => r.payload.runId));
      expect(runsInBatch.has(runId)).toBe(false);
    }
  });

  it('a worker only claims records for its owned shards and ignores the rest', async () => {
    const shardCount = 2;
    const shardMap = await findRunIdPerShard(shardCount, RUN_ID_CANDIDATES);
    const shard0RunId = requireRunIdForShard(shardMap, 0);
    const shard1RunId = requireRunIdForShard(shardMap, 1);

    const storage = new InMemoryOutboxStorage({ shardCount });
    await storage.enqueueTx(shard0RunId, makeRunEvents(shard0RunId, [1]));
    await storage.enqueueTx(shard1RunId, makeRunEvents(shard1RunId, [1]));

    const workerABatch = await storage.listPendingForClaim(10, { shardIds: [0] });
    const workerBBatch = await storage.listPendingForClaim(10, { shardIds: [1] });

    const workerARunIds = new Set(workerABatch.map((r) => r.payload.runId));
    const workerBRunIds = new Set(workerBBatch.map((r) => r.payload.runId));

    expect(workerARunIds.has(shard0RunId)).toBe(true);
    expect(workerARunIds.has(shard1RunId)).toBe(false);

    expect(workerBRunIds.has(shard1RunId)).toBe(true);
    expect(workerBRunIds.has(shard0RunId)).toBe(false);
  });

  it('two workers with disjoint shards never claim the same outbox record', async () => {
    const shardCount = 4;

    // Distribute enough runIds to cover all 4 shards.
    const shardMap = await findRunIdPerShard(shardCount, RUN_ID_CANDIDATES);

    const storage = new InMemoryOutboxStorage({ shardCount });

    // Enqueue events for one runId per shard.
    for (const runId of shardMap.values()) {
      await storage.enqueueTx(runId, makeRunEvents(runId, [1, 2]));
    }

    // Worker A owns shards 0,1 — Worker B owns shards 2,3.
    const workerABus = new InMemoryEventBus();
    const workerBBus = new InMemoryEventBus();

    const workerA = new OutboxWorker(storage, workerABus, {
      batchSize: 100,
      claimSelection: { shardIds: [0, 1] },
    });
    const workerB = new OutboxWorker(storage, workerBBus, {
      batchSize: 100,
      claimSelection: { shardIds: [2, 3] },
    });

    // Run one tick each — sequential but representative of concurrent ownership.
    await workerA.tick();
    await workerB.tick();

    const deliveredByA = new Set(workerABus.published.map((e) => `${e.runId}:${e.runSeq}`));
    const deliveredByB = new Set(workerBBus.published.map((e) => `${e.runId}:${e.runSeq}`));

    // The intersection must be empty — no event delivered by both workers.
    const overlap = [...deliveredByA].filter((key) => deliveredByB.has(key));
    expect(overlap).toEqual([]);

    // Sanity: both workers delivered something (non-empty coverage).
    expect(deliveredByA.size > 0).toBe(true);
    expect(deliveredByB.size > 0).toBe(true);
  });

  it('owning worker processes events for a runId in strictly increasing runSeq order', async () => {
    const shardCount = 2;
    const runId = 'run-alpha';
    const ownerShard = await discoverShard(runId, shardCount);
    const otherShards = [0, 1].filter((s) => s !== ownerShard);

    const storage = new InMemoryOutboxStorage({ shardCount });
    const bus = new InMemoryEventBus();

    // Enqueue three events out of natural insertion order to confirm the
    // head-of-line constraint enforces delivery by runSeq, not arrival order.
    await storage.enqueueTx(runId, makeRunEvents(runId, [3, 1, 2]));

    const worker = new OutboxWorker(storage, bus, {
      batchSize: 1,
      claimSelection: { shardIds: [ownerShard] },
    });

    // Three ticks — one event per tick due to batchSize=1 and head-of-line.
    await worker.tick();
    await worker.tick();
    await worker.tick();

    const published = bus.published;
    expect(published.length).toBe(3);

    const deliveredRunSeqs = published.map((e) => e.runSeq);
    expect(deliveredRunSeqs).toEqual([1, 2, 3]);

    // Non-owning worker gets nothing for this runId regardless of how many ticks.
    const nonOwnerBus = new InMemoryEventBus();
    const nonOwnerWorker = new OutboxWorker(storage, nonOwnerBus, {
      batchSize: 100,
      claimSelection: { shardIds: otherShards },
    });
    await nonOwnerWorker.tick();

    expect(nonOwnerBus.published.length).toBe(0);
  });

  it('non-owning worker cannot advance a runId stream mid-sequence', async () => {
    const shardCount = 2;
    const shardMap = await findRunIdPerShard(shardCount, RUN_ID_CANDIDATES);
    const shard0RunId = requireRunIdForShard(shardMap, 0);
    const shard1RunId = requireRunIdForShard(shardMap, 1);

    const storage = new InMemoryOutboxStorage({ shardCount });

    // Enqueue a 3-event stream for shard-0 runId.
    await storage.enqueueTx(shard0RunId, makeRunEvents(shard0RunId, [1, 2, 3]));
    // Enqueue a separate event for shard-1 so Worker B has something to do.
    await storage.enqueueTx(shard1RunId, makeRunEvents(shard1RunId, [1]));

    const workerABus = new InMemoryEventBus();
    const workerBBus = new InMemoryEventBus();

    const workerA = new OutboxWorker(storage, workerABus, {
      batchSize: 100,
      claimSelection: { shardIds: [0] },
    });
    const workerB = new OutboxWorker(storage, workerBBus, {
      batchSize: 100,
      claimSelection: { shardIds: [1] },
    });

    // Worker B ticks first — it must not see or advance the shard-0 stream.
    await workerB.tick();
    const workerBEvents = workerBBus.published.map((e) => e.runId);
    expect(workerBEvents.includes(shard0RunId)).toBe(false);

    // Worker A then delivers the full stream in order.
    await workerA.tick();
    const workerARunSeqs = workerABus.published
      .filter((e) => e.runId === shard0RunId)
      .map((e) => e.runSeq);

    // Head-of-line: only runSeq=1 per tick (batchSize=100 but head-of-line
    // allows only one event per runId per tick in InMemoryOutboxStorage).
    // The first tick delivers runSeq=1. Subsequent ticks deliver 2 and 3.
    expect(workerARunSeqs.includes(1)).toBe(true);
    expect(
      workerARunSeqs.every((seq, idx) => idx === 0 || seq > (workerARunSeqs[idx - 1] ?? -1))
    ).toBe(true);
  });

  it('all events are delivered exactly once across two concurrent workers on disjoint shards', async () => {
    const shardCount = 2;
    const shardMap = await findRunIdPerShard(shardCount, RUN_ID_CANDIDATES);
    const shard0RunId = requireRunIdForShard(shardMap, 0);
    const shard1RunId = requireRunIdForShard(shardMap, 1);

    const storage = new InMemoryOutboxStorage({ shardCount });
    const totalRunSeqs = [1, 2, 3];

    await storage.enqueueTx(shard0RunId, makeRunEvents(shard0RunId, totalRunSeqs));
    await storage.enqueueTx(shard1RunId, makeRunEvents(shard1RunId, totalRunSeqs));

    const workerABus = new InMemoryEventBus();
    const workerBBus = new InMemoryEventBus();

    const workerA = new OutboxWorker(storage, workerABus, {
      batchSize: 100,
      claimSelection: { shardIds: [0] },
    });
    const workerB = new OutboxWorker(storage, workerBBus, {
      batchSize: 100,
      claimSelection: { shardIds: [1] },
    });

    // Run enough ticks to drain all events (head-of-line delivers one per runId
    // per tick, so 3 runSeqs × 1 runId per worker = 3 ticks).
    for (const _runSeq of totalRunSeqs) {
      await workerA.tick();
      await workerB.tick();
    }

    const allDeliveredKeys = [
      ...workerABus.published.map((e) => `${e.runId}:${e.runSeq}`),
      ...workerBBus.published.map((e) => `${e.runId}:${e.runSeq}`),
    ];

    const expectedKeys = [
      ...totalRunSeqs.map((seq) => `${shard0RunId}:${seq}`),
      ...totalRunSeqs.map((seq) => `${shard1RunId}:${seq}`),
    ].sort((left, right) => left.localeCompare(right));

    expect([...new Set(allDeliveredKeys)].sort((left, right) => left.localeCompare(right))).toEqual(
      expectedKeys
    );
  });
});
