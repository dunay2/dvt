/**
 * @file packages/@dvt/engine/test/state/InMemoryStartRunIntentStore.test.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Validate intent state machine transitions, idempotency, and orphan listing
 * @consequence Ensures InMemoryStartRunIntentStore matches IStartRunIntentStore contract
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  IntentInvalidTransitionError,
  IntentNotFoundError,
} from '../../src/contracts/intentErrors.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';

function makeCreateInput(
  overrides?: Partial<Parameters<InMemoryStartRunIntentStore['createIntent']>[0]>
): Parameters<InMemoryStartRunIntentStore['createIntent']>[0] {
  return {
    intentId: 'intent-1',
    tenantId: 't1',
    runId: 'r1',
    provider: 'temporal' as const,
    createdAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeTemporalRunRef(runId = 'r1'): EngineRunRef {
  return {
    provider: 'temporal',
    tenantId: 't1',
    namespace: 'default',
    workflowId: `wf-${runId}`,
    runId,
  };
}

describe('InMemoryStartRunIntentStore', () => {
  it('createIntent creates intent with PENDING status', async () => {
    const store = new InMemoryStartRunIntentStore();
    const intent = await store.createIntent(makeCreateInput());

    expect(intent.status).toBe('PENDING');
    expect(intent.intentId).toBe('intent-1');
    expect(intent.tenantId).toBe('t1');
    expect(intent.runId).toBe('r1');
    expect(intent.provider).toBe('temporal');
    expect(intent.engineRunRef).toBeUndefined();
    expect(intent.createdAt).toBe('2026-03-01T00:00:00.000Z');
    expect(intent.updatedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('createIntent is idempotent on intentId', async () => {
    const store = new InMemoryStartRunIntentStore();
    const first = await store.createIntent(makeCreateInput());
    const second = await store.createIntent(makeCreateInput({ runId: 'r2' }));

    expect(second).toBe(first);
    expect(second.runId).toBe('r1');
  });

  it('markDispatched transitions PENDING to DISPATCHED and stores engineRunRef', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());

    const runRef = makeTemporalRunRef();
    await store.markDispatched('intent-1', runRef);

    const intent = await store.getIntent('intent-1');
    expect(intent?.status).toBe('DISPATCHED');
    expect(intent?.engineRunRef).toEqual(runRef);
  });

  it('markDispatched on non-PENDING intent throws IntentInvalidTransitionError', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markDispatched('intent-1', makeTemporalRunRef());

    await expect(store.markDispatched('intent-1', makeTemporalRunRef())).rejects.toThrow(
      IntentInvalidTransitionError
    );
  });

  it('markDispatched on non-existent intent throws IntentNotFoundError', async () => {
    const store = new InMemoryStartRunIntentStore();

    await expect(store.markDispatched('nonexistent', makeTemporalRunRef())).rejects.toThrow(
      IntentNotFoundError
    );
  });

  it('markResolved transitions DISPATCHED to RESOLVED', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markDispatched('intent-1', makeTemporalRunRef());
    await store.markResolved('intent-1');

    const intent = await store.getIntent('intent-1');
    expect(intent?.status).toBe('RESOLVED');
  });

  it('markResolved from PENDING is allowed (pre-adapter abort cleanup)', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markResolved('intent-1');

    const intent = await store.getIntent('intent-1');
    expect(intent?.status).toBe('RESOLVED');
  });

  it('markResolved from RESOLVED throws IntentInvalidTransitionError', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markResolved('intent-1');

    await expect(store.markResolved('intent-1')).rejects.toThrow(IntentInvalidTransitionError);
  });

  it('markResolved from EXPIRED throws IntentInvalidTransitionError', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markExpired('intent-1');

    await expect(store.markResolved('intent-1')).rejects.toThrow(IntentInvalidTransitionError);
  });

  it('markExpired transitions PENDING to EXPIRED', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markExpired('intent-1');

    const intent = await store.getIntent('intent-1');
    expect(intent?.status).toBe('EXPIRED');
  });

  it('markExpired from DISPATCHED throws IntentInvalidTransitionError', async () => {
    const store = new InMemoryStartRunIntentStore();
    await store.createIntent(makeCreateInput());
    await store.markDispatched('intent-1', makeTemporalRunRef());

    await expect(store.markExpired('intent-1')).rejects.toThrow(IntentInvalidTransitionError);
  });

  it('listOrphaned returns only PENDING and DISPATCHED intents older than threshold', async () => {
    const store = new InMemoryStartRunIntentStore();
    const oldTime = '2026-03-01T00:00:00.000Z';
    const recentTime = '2026-03-01T00:09:00.000Z';
    const nowMs = Date.parse('2026-03-01T00:10:00.000Z');
    const thresholdMs = 5 * 60 * 1000; // 5 minutes

    // Old PENDING — should be included
    await store.createIntent(makeCreateInput({ intentId: 'old-pending', createdAt: oldTime }));
    // Old DISPATCHED — should be included
    await store.createIntent(
      makeCreateInput({ intentId: 'old-dispatched', runId: 'r2', createdAt: oldTime })
    );
    await store.markDispatched('old-dispatched', makeTemporalRunRef('r2'));
    // Recent PENDING — too young
    await store.createIntent(
      makeCreateInput({ intentId: 'recent-pending', runId: 'r3', createdAt: recentTime })
    );
    // Old RESOLVED — terminal, not included
    await store.createIntent(
      makeCreateInput({ intentId: 'old-resolved', runId: 'r4', createdAt: oldTime })
    );
    await store.markResolved('old-resolved');
    // Old EXPIRED — terminal, not included
    await store.createIntent(
      makeCreateInput({ intentId: 'old-expired', runId: 'r5', createdAt: oldTime })
    );
    await store.markExpired('old-expired');

    const orphaned = await store.listOrphaned(thresholdMs, nowMs);
    expect(orphaned).toHaveLength(2);
    expect(orphaned.map((i) => i.intentId)).toEqual(['old-pending', 'old-dispatched']);
  });

  it('listOrphaned respects limit parameter', async () => {
    const store = new InMemoryStartRunIntentStore();
    const oldTime = '2026-03-01T00:00:00.000Z';
    const nowMs = Date.parse('2026-03-01T01:00:00.000Z');

    await store.createIntent(makeCreateInput({ intentId: 'i1', runId: 'r1', createdAt: oldTime }));
    await store.createIntent(makeCreateInput({ intentId: 'i2', runId: 'r2', createdAt: oldTime }));
    await store.createIntent(makeCreateInput({ intentId: 'i3', runId: 'r3', createdAt: oldTime }));

    const orphaned = await store.listOrphaned(60_000, nowMs, 2);
    expect(orphaned).toHaveLength(2);
  });

  it('listOrphaned orders by createdAt ascending', async () => {
    const store = new InMemoryStartRunIntentStore();
    const nowMs = Date.parse('2026-03-01T01:00:00.000Z');

    await store.createIntent(
      makeCreateInput({ intentId: 'i-late', runId: 'r1', createdAt: '2026-03-01T00:02:00.000Z' })
    );
    await store.createIntent(
      makeCreateInput({ intentId: 'i-early', runId: 'r2', createdAt: '2026-03-01T00:01:00.000Z' })
    );

    const orphaned = await store.listOrphaned(60_000, nowMs);
    expect(orphaned[0]?.intentId).toBe('i-early');
    expect(orphaned[1]?.intentId).toBe('i-late');
  });

  it('getIntent returns null for non-existent intentId', async () => {
    const store = new InMemoryStartRunIntentStore();
    const result = await store.getIntent('nonexistent');
    expect(result).toBeNull();
  });
});
