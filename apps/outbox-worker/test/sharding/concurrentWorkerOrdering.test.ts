/**
 * G5.5C - Concurrent-worker ordering proof.
 *
 * Validates ADR-0009 INV-OUTBOX-002: concurrent workers cannot reorder events
 * for the same tenantId/runId stream.
 *
 * The proof relies on the tenant-aware shard model selected in ADR-0033:
 *   shard_id = stableHash(tenantId) % shardCount
 *
 * Because shard assignment is deterministic and worker shard ownership is
 * disjoint, any given tenant belongs to exactly one worker at a time. That
 * exclusivity is sufficient to guarantee per-tenant/run ordering without any
 * cross-worker coordination.
 *
 * Tests use InMemoryOutboxStorage (same shard routing logic as the Postgres
 * adapter) and OutboxWorker directly so the proof stays at the
 * storage/worker boundary and does not require a live database.
 */

import { asIsoUtcString, type EventEnvelope } from '@dvt/contracts';
import { OutboxWorker } from '@dvt/delivery';
import { InMemoryEventBus, InMemoryOutboxStorage } from '@dvt/delivery/testing';
import { describe, it, expect } from 'vitest';

function makeEvent(
  runId: string,
  eventId: string,
  idempotencyKey: string,
  runSeq: number,
  tenantId = 'tenant-1'
): EventEnvelope {
  return {
    eventId,
    eventType: 'RunQueued',
    runId,
    tenantId,
    projectId: 'project-1',
    environmentId: 'dev',
    planId: 'plan-1',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: asIsoUtcString('2026-03-12T00:00:00.000Z'),
    persistedAt: asIsoUtcString('2026-03-12T00:00:00.000Z'),
    idempotencyKey,
    payloadVersion: 1,
    runSeq,
  };
}

function makeRunEvents(runId: string, runSeqs: number[], tenantId = 'tenant-1'): EventEnvelope[] {
  return runSeqs.map((seq) =>
    makeEvent(
      runId,
      `evt-${tenantId}-${runId}-${seq}`,
      `key-${tenantId}-${runId}-${seq}`,
      seq,
      tenantId
    )
  );
}

async function discoverShard(tenantId: string, runId: string, shardCount: number): Promise<number> {
  const probe = new InMemoryOutboxStorage({ shardCount });
  await probe.enqueueTx(runId, [makeEvent(runId, 'probe-evt', 'probe-key', 1, tenantId)]);

  for (let shard = 0; shard < shardCount; shard += 1) {
    const records = await probe.listPendingForClaim(1, { shardIds: [shard] });
    if (records.length > 0) {
      return shard;
    }
  }

  throw new Error(`no shard found for tenantId=${tenantId} with shardCount=${shardCount}`);
}

async function findTenantIdPerShard(
  shardCount: number,
  candidates: string[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  for (const tenantId of candidates) {
    if (result.size === shardCount) break;
    const shard = await discoverShard(tenantId, 'probe-run', shardCount);
    if (!result.has(shard)) {
      result.set(shard, tenantId);
    }
  }

  if (result.size < shardCount) {
    const missing = Array.from({ length: shardCount }, (_, i) => i).filter((s) => !result.has(s));
    throw new Error(`could not find tenantIds for shards ${missing.join(',')} from candidates`);
  }

  return result;
}

function requireTenantIdForShard(shardMap: Map<number, string>, shardId: number): string {
  const tenantId = shardMap.get(shardId);
  if (tenantId === undefined) {
    throw new Error(`missing tenantId for shard ${shardId}`);
  }
  return tenantId;
}

const TENANT_ID_CANDIDATES = [
  'tenant-alpha',
  'tenant-beta',
  'tenant-gamma',
  'tenant-delta',
  'tenant-epsilon',
  'tenant-zeta',
  'tenant-eta',
  'tenant-theta',
  'tenant-iota',
  'tenant-kappa',
  'tenant-lambda',
  'tenant-mu',
  'tenant-nu',
  'tenant-xi',
  'tenant-omicron',
  'tenant-pi',
];

describe('concurrentWorkerOrdering', () => {
  it('shard routing is deterministic: same tenant always maps to the same shard', async () => {
    const shardCount = 4;
    const tenantId = 'tenant-alpha';
    const runId = 'run-alpha';

    const firstShard = await discoverShard(tenantId, runId, shardCount);
    const secondShard = await discoverShard(tenantId, 'run-beta', shardCount);

    expect(firstShard).toBe(secondShard);

    const storage = new InMemoryOutboxStorage({ shardCount });
    await storage.enqueueTx(runId, makeRunEvents(runId, [1, 2, 3], tenantId));

    const ownedBatch = await storage.listPendingForClaim(10, { shardIds: [firstShard] });
    expect(ownedBatch.length > 0).toBe(true);
    for (const record of ownedBatch) {
      expect(record.payload.runId).toBe(runId);
      expect(record.payload.tenantId).toBe(tenantId);
    }

    for (let shard = 0; shard < shardCount; shard += 1) {
      if (shard === firstShard) continue;
      const nonOwnerBatch = await storage.listPendingForClaim(10, { shardIds: [shard] });
      const runsInBatch = new Set(nonOwnerBatch.map((r) => r.payload.runId));
      expect(runsInBatch.has(runId)).toBe(false);
    }
  });

  it('a worker only claims records for its owned shards and ignores the rest', async () => {
    const shardCount = 2;
    const shardMap = await findTenantIdPerShard(shardCount, TENANT_ID_CANDIDATES);
    const shard0TenantId = requireTenantIdForShard(shardMap, 0);
    const shard1TenantId = requireTenantIdForShard(shardMap, 1);
    const shard0RunId = 'run-shard-0';
    const shard1RunId = 'run-shard-1';

    const storage = new InMemoryOutboxStorage({ shardCount });
    await storage.enqueueTx(shard0RunId, makeRunEvents(shard0RunId, [1], shard0TenantId));
    await storage.enqueueTx(shard1RunId, makeRunEvents(shard1RunId, [1], shard1TenantId));

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
    const shardMap = await findTenantIdPerShard(shardCount, TENANT_ID_CANDIDATES);
    const storage = new InMemoryOutboxStorage({ shardCount });

    for (const [shardId, tenantId] of shardMap.entries()) {
      const runId = `run-for-shard-${shardId}`;
      await storage.enqueueTx(runId, makeRunEvents(runId, [1, 2], tenantId));
    }

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

    await workerA.tick();
    await workerB.tick();

    const deliveredByA = new Set(workerABus.published.map((e) => `${e.runId}:${e.runSeq}`));
    const deliveredByB = new Set(workerBBus.published.map((e) => `${e.runId}:${e.runSeq}`));
    const overlap = [...deliveredByA].filter((key) => deliveredByB.has(key));

    expect(overlap).toEqual([]);
    expect(deliveredByA.size > 0).toBe(true);
    expect(deliveredByB.size > 0).toBe(true);
  });

  it('owning worker processes events for a runId in strictly increasing runSeq order', async () => {
    const shardCount = 2;
    const tenantId = 'tenant-alpha';
    const runId = 'run-alpha';
    const ownerShard = await discoverShard(tenantId, runId, shardCount);
    const otherShards = [0, 1].filter((s) => s !== ownerShard);

    const storage = new InMemoryOutboxStorage({ shardCount });
    const bus = new InMemoryEventBus();

    await storage.enqueueTx(runId, makeRunEvents(runId, [3, 1, 2], tenantId));

    const worker = new OutboxWorker(storage, bus, {
      batchSize: 1,
      claimSelection: { shardIds: [ownerShard] },
    });

    await worker.tick();
    await worker.tick();
    await worker.tick();

    const published = bus.published;
    expect(published.length).toBe(3);
    expect(published.map((e) => e.runSeq)).toEqual([1, 2, 3]);

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
    const shardMap = await findTenantIdPerShard(shardCount, TENANT_ID_CANDIDATES);
    const shard0TenantId = requireTenantIdForShard(shardMap, 0);
    const shard1TenantId = requireTenantIdForShard(shardMap, 1);
    const shard0RunId = 'run-shard-0';
    const shard1RunId = 'run-shard-1';

    const storage = new InMemoryOutboxStorage({ shardCount });
    await storage.enqueueTx(shard0RunId, makeRunEvents(shard0RunId, [1, 2, 3], shard0TenantId));
    await storage.enqueueTx(shard1RunId, makeRunEvents(shard1RunId, [1], shard1TenantId));

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

    await workerB.tick();
    expect(workerBBus.published.map((e) => e.runId).includes(shard0RunId)).toBe(false);

    await workerA.tick();
    const workerARunSeqs = workerABus.published
      .filter((e) => e.runId === shard0RunId)
      .map((e) => e.runSeq);

    expect(workerARunSeqs.includes(1)).toBe(true);
    expect(
      workerARunSeqs.every((seq, idx) => idx === 0 || seq > (workerARunSeqs[idx - 1] ?? -1))
    ).toBe(true);
  });

  it('all events are delivered exactly once across two concurrent workers on disjoint shards', async () => {
    const shardCount = 2;
    const shardMap = await findTenantIdPerShard(shardCount, TENANT_ID_CANDIDATES);
    const shard0TenantId = requireTenantIdForShard(shardMap, 0);
    const shard1TenantId = requireTenantIdForShard(shardMap, 1);
    const shard0RunId = 'run-shard-0';
    const shard1RunId = 'run-shard-1';

    const storage = new InMemoryOutboxStorage({ shardCount });
    const totalRunSeqs = [1, 2, 3];

    await storage.enqueueTx(shard0RunId, makeRunEvents(shard0RunId, totalRunSeqs, shard0TenantId));
    await storage.enqueueTx(shard1RunId, makeRunEvents(shard1RunId, totalRunSeqs, shard1TenantId));

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
