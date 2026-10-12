/**
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @ownedConcern Intent lifecycle, exclusive acquisition, authority rotation and public-query isolation.
 * @decision Check typed outcomes and state non-mutation for every rejected transition.
 * @consequence In-memory storage exercises the same ownership protocol as PostgreSQL.
 */
import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  IntentActiveConflictError,
  IntentNotFoundError,
} from '../../src/contracts/intentErrors.js';
import type {
  CreateIntentInput,
  StartRunIntent,
  StartRunIntentClaimResult,
  StartRunIntentMutationResult,
  StartRunIntentStatus,
} from '../../src/ports/IStartRunIntentStore.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';

const NOW = '2026-03-01T00:00:00.000Z';
const command = (id = 'one'): CreateIntentInput => ({
  intentId: id,
  tenantId: 'tenant',
  runId: id,
  provider: 'temporal',
  createdAt: NOW,
});
const runRef: EngineRunRef = {
  provider: 'temporal',
  tenantId: 'tenant',
  workflowId: 'workflow',
  runId: 'provider-run',
  namespace: 'default',
};
async function claim(
  store: InMemoryStartRunIntentStore,
  id = 'one'
): Promise<Extract<StartRunIntentClaimResult, { kind: 'acquired' }>> {
  const result = await store.claimIntent(command(id));
  if (result.kind !== 'acquired') throw new Error('Expected acquisition');
  return result;
}
const fresh = (): InMemoryStartRunIntentStore =>
  new InMemoryStartRunIntentStore({ nowIsoUtc: () => NOW });

describe('InMemoryStartRunIntentStore', () => {
  it('creates PENDING and returns one receipt; queries and losing callers cannot acquire', async () => {
    const store = fresh();
    const winner = await claim(store);
    expect(winner.intent).toEqual({
      ...command(),
      status: 'PENDING',
      providerOutcome: { kind: 'not_requested' },
      compensation: { kind: 'not_required' },
      reconciliation: { kind: 'pending', attempts: 0, nextAttemptAt: NOW },
      updatedAt: NOW,
      revision: 0,
    });
    expect(await store.claimIntent(command())).toEqual({ kind: 'existing', intent: winner.intent });
    expect(await store.getIntent(command())).not.toHaveProperty('token');
    const results = await Promise.all([
      store.claimIntent(command('race')),
      store.claimIntent(command('race')),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual(['acquired', 'existing']);
  });

  it('rejects a conflicting identity instead of changing or exposing an existing intent', async () => {
    const store = fresh();
    await claim(store);
    await expect(store.claimIntent({ ...command(), runId: 'different' })).rejects.toBeInstanceOf(
      IntentActiveConflictError
    );
    await expect(store.claimIntent({ ...command(), tenantId: 'other' })).rejects.toBeInstanceOf(
      IntentNotFoundError
    );
    expect(await store.getIntent({ ...command(), tenantId: 'other' })).toBeNull();
  });

  it.each(['PENDING', 'DISPATCHED', 'RESOLVED', 'EXPIRED'] as const)(
    'enforces active run uniqueness for %s',
    async (status) => {
      const store = fresh();
      const owner = await claim(store);
      if (status === 'DISPATCHED' || status === 'RESOLVED') {
        await store.authorizeDispatch(owner.receipt);
        await store.markDispatched(owner.receipt, runRef);
      }
      if (status === 'RESOLVED') await store.markResolved(owner.receipt);
      if (status === 'EXPIRED') await store.markExpired(owner.receipt);
      const next = store.claimIntent({ ...command(), intentId: 'different-intent' });
      if (status === 'PENDING' || status === 'DISPATCHED')
        await expect(next).rejects.toBeInstanceOf(IntentActiveConflictError);
      else expect((await next).kind).toBe('acquired');
    }
  );

  const transitions = [
    ['PENDING', 'DISPATCHED', 'invalid_state'],
    ['PENDING', 'RESOLVED', 'invalid_state'],
    ['PENDING', 'EXPIRED', 'applied'],
    ['unknown', 'DISPATCHED', 'applied'],
    ['unknown', 'RESOLVED', 'invalid_state'],
    ['unknown', 'EXPIRED', 'invalid_state'],
    ['DISPATCHED', 'DISPATCHED', 'already_applied'],
    ['DISPATCHED', 'RESOLVED', 'applied'],
    ['DISPATCHED', 'EXPIRED', 'invalid_state'],
    ['RESOLVED', 'DISPATCHED', 'already_applied'],
    ['RESOLVED', 'RESOLVED', 'already_applied'],
    ['RESOLVED', 'EXPIRED', 'invalid_state'],
    ['EXPIRED', 'DISPATCHED', 'invalid_state'],
    ['EXPIRED', 'RESOLVED', 'invalid_state'],
    ['EXPIRED', 'EXPIRED', 'already_applied'],
  ] as const;
  it.each(transitions)('%s → %s returns %s', async (from, target, outcome) => {
    const store = fresh();
    const owner = await claim(store);
    const transition = (
      status: StartRunIntentStatus | 'unknown'
    ): Promise<StartRunIntentMutationResult> => {
      if (status === 'unknown') return store.authorizeDispatch(owner.receipt);
      if (status === 'DISPATCHED') return store.markDispatched(owner.receipt, runRef);
      if (status === 'RESOLVED') return store.markResolved(owner.receipt);
      return store.markExpired(owner.receipt);
    };
    if (from === 'RESOLVED' || from === 'DISPATCHED') await transition('unknown');
    if (from === 'RESOLVED') await transition('DISPATCHED');
    if (from !== 'PENDING') await transition(from);
    const before = await store.getIntent(command());
    expect(await transition(target)).toBe(outcome);
    if (outcome !== 'applied') expect(await store.getIntent(command())).toEqual(before);
    else
      expect(await store.getIntent(command())).toMatchObject({
        status: target,
        revision: (before?.revision ?? 0) + 1,
      });
  });

  it('distinguishes conflicting provider references, missing intents and wrong owners', async () => {
    const store = fresh();
    const owner = await claim(store);
    await store.authorizeDispatch(owner.receipt);
    await store.markDispatched(owner.receipt, runRef);
    const before = await store.getIntent(command());
    expect(await store.markDispatched(owner.receipt, { ...runRef, workflowId: 'different' })).toBe(
      'conflict'
    );
    expect(await store.markResolved({ ...owner.receipt, token: 'wrong' })).toBe('not_owner');
    expect(await store.markResolved({ ...owner.receipt, runId: 'wrong' })).toBe('not_owner');
    expect(await store.markResolved({ ...owner.receipt, tenantId: 'other' })).toBe('missing');
    expect(await store.markResolved({ ...owner.receipt, intentId: 'absent' })).toBe('missing');
    expect(await store.getIntent(command())).toEqual(before);
  });

  it('does not expose mutable intent or provider state', async () => {
    const store = fresh();
    const owner = await claim(store);
    owner.intent.status = 'EXPIRED';
    await store.authorizeDispatch(owner.receipt);
    const ref = { ...runRef };
    await store.markDispatched(owner.receipt, ref);
    ref.workflowId = 'tampered';
    const read = await store.getIntent(command());
    if (read?.providerOutcome.kind !== 'started') throw new Error('Missing run reference');
    read.providerOutcome.runRef.workflowId = 'tampered';
    expect(await store.getIntent(command())).toMatchObject({
      status: 'DISPATCHED',
      providerOutcome: { kind: 'started', runRef },
    });
  });

  it('uses store time, revision CAS and rotated tokens to reject stale owners', async () => {
    let now = NOW;
    const store = new InMemoryStartRunIntentStore({ nowIsoUtc: () => now });
    const owner = await claim(store);
    const reclaim = { ...command(), expectedRevision: 0, minimumAgeMs: 60_000 };
    expect(await store.reclaimIntent(reclaim)).toEqual({ kind: 'not_acquired' });
    now = '2026-03-01T00:01:00.000Z';
    const results = await Promise.all([store.reclaimIntent(reclaim), store.reclaimIntent(reclaim)]);
    expect(results.map((result) => result.kind).sort()).toEqual(['acquired', 'not_acquired']);
    const before = await store.getIntent(command());
    expect(await store.markResolved(owner.receipt)).toBe('not_owner');
    expect(await store.markDispatched(owner.receipt, runRef)).toBe('not_owner');
    expect(await store.markExpired(owner.receipt)).toBe('not_owner');
    expect(await store.getIntent(command())).toEqual(before);
    await expect(store.reclaimIntent({ ...reclaim, minimumAgeMs: -1 })).rejects.toThrow(
      'INVALID_INTENT_RECLAIM_AGE'
    );
  });

  it('lists only aged active intents, ordered and bounded; reclaim resets the age', async () => {
    let now = NOW;
    const store = new InMemoryStartRunIntentStore({ nowIsoUtc: () => now });
    const pending = await claim(store, 'a-pending');
    const dispatched = await claim(store, 'b-dispatched');
    await store.authorizeDispatch(dispatched.receipt);
    await store.markDispatched(dispatched.receipt, runRef);
    const resolved = await claim(store, 'resolved');
    await store.authorizeDispatch(resolved.receipt);
    await store.markDispatched(resolved.receipt, runRef);
    await store.markResolved(resolved.receipt);
    await store.markExpired((await claim(store, 'expired')).receipt);
    now = '2026-03-01T00:10:00.000Z';
    await claim(store, 'young');
    const list = (): Promise<StartRunIntent[]> => store.listOrphaned(60_000, Date.parse(now));
    expect((await list()).map((intent) => intent.intentId)).toEqual(['a-pending', 'b-dispatched']);
    expect(await store.listOrphaned(60_000, Date.parse(now), 1)).toHaveLength(1);
    await store.reclaimIntent({ ...pending.receipt, expectedRevision: 0, minimumAgeMs: 60_000 });
    expect((await list()).map((intent) => intent.intentId)).toEqual(['b-dispatched']);
    expect(await store.getIntent({ ...command(), intentId: 'absent' })).toBeNull();
  });
});
