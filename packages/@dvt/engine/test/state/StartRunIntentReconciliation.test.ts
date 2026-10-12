/**
 * @baseline ADR-0030: Durable uncertainty and confirmed compensation
 * @ownedConcern Exercise the same receipt-fenced reconciliation state machine used by persistent storage.
 */
import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';

const initialTime = '2026-09-30T00:00:00.000Z';
const ref: EngineRunRef = {
  provider: 'temporal',
  tenantId: 'tenant',
  runId: 'run',
  workflowId: 'workflow',
  namespace: 'default',
};

async function fixture(): Promise<{
  store: InMemoryStartRunIntentStore;
  receipt: import('../../src/ports/IStartRunIntentStore.js').StartRunIntentClaimReceipt;
  advance: () => void;
}> {
  let time = initialTime;
  const store = new InMemoryStartRunIntentStore({ nowIsoUtc: () => time });
  const claim = await store.claimIntent({
    intentId: 'intent',
    tenantId: ref.tenantId,
    runId: ref.runId,
    provider: ref.provider,
    createdAt: time,
  });
  if (claim.kind !== 'acquired') throw new Error('Expected acquisition');
  await store.authorizeDispatch(claim.receipt);
  await store.markDispatched(claim.receipt, ref);
  return {
    store,
    receipt: claim.receipt,
    advance: () => {
      time = '2026-10-01T00:00:00.000Z';
    },
  };
}

describe('Durable start reconciliation', () => {
  it('refuses canonical provider adoption once compensation is required', async () => {
    const { store, receipt } = await fixture();
    const canonical = new InMemoryTxStore({ startRunIntents: store });
    await store.recordReconciliation(receipt, {
      kind: 'require_compensation',
      reason: 'bootstrap_failed',
    });
    const before = await store.getIntent(receipt);
    expect(
      await canonical.applyStartRunWrite(receipt, { kind: 'bind_provider', providerRef: ref })
    ).toBe('invalid_state');
    expect(await store.getIntent(receipt)).toEqual(before);
  });
  it('keeps cancellation acknowledgement unresolved until exact execution termination is observed', async () => {
    const { store, receipt } = await fixture();
    expect(
      await store.recordReconciliation(receipt, {
        kind: 'require_compensation',
        reason: 'orphaned_provider',
      })
    ).toBe('applied');
    expect(
      await store.recordReconciliation(receipt, {
        kind: 'authorize_cancel',
        executionId: 'execution-a',
      })
    ).toBe('applied');
    expect(await store.markResolved(receipt)).toBe('invalid_state');
    const before = await store.getIntent(receipt);
    expect(before).toMatchObject({
      status: 'DISPATCHED',
      compensation: { kind: 'required', executionId: 'execution-a' },
      reconciliation: { kind: 'pending', attempts: 1 },
    });
    expect(
      await store.recordReconciliation(receipt, {
        kind: 'confirm_compensation',
        executionId: 'execution-b',
        disposition: 'cancelled',
      })
    ).toBe('conflict');
    expect(await store.getIntent(receipt)).toEqual(before);
    expect(
      await store.recordReconciliation(receipt, {
        kind: 'confirm_compensation',
        executionId: 'execution-a',
        disposition: 'cancelled',
      })
    ).toBe('applied');
    expect(await store.getIntent(receipt)).toMatchObject({
      status: 'RESOLVED',
      compensation: { kind: 'confirmed', executionId: 'execution-a', disposition: 'cancelled' },
    });
  });

  it('rejects stale compensation, scheduling and confirmation without changing durable state', async () => {
    const { store, receipt, advance } = await fixture();
    const intent = await store.getIntent(receipt);
    if (!intent) throw new Error('Missing intent');
    advance();
    expect(
      (
        await store.reclaimIntent({
          ...receipt,
          expectedRevision: intent.revision,
          minimumAgeMs: 0,
        })
      ).kind
    ).toBe('acquired');
    const before = await store.getIntent(receipt);
    expect(
      await store.recordReconciliation(receipt, {
        kind: 'require_compensation',
        reason: 'orphaned_provider',
      })
    ).toBe('not_owner');
    expect(
      await store.recordReconciliation(receipt, { kind: 'defer', reason: 'provider_missing' })
    ).toBe('not_owner');
    expect(
      await store.recordReconciliation(receipt, {
        kind: 'authorize_cancel',
        executionId: 'execution',
      })
    ).toBe('not_owner');
    expect(await store.getIntent(receipt)).toEqual(before);
  });

  it('backs off unknown observations and escalates durably without making them success or absence', async () => {
    const store = new InMemoryStartRunIntentStore({ nowIsoUtc: () => initialTime });
    const claim = await store.claimIntent({
      intentId: 'intent',
      tenantId: ref.tenantId,
      runId: ref.runId,
      provider: ref.provider,
      createdAt: initialTime,
    });
    if (claim.kind !== 'acquired') throw new Error('Expected acquisition');
    await store.authorizeDispatch(claim.receipt);
    await store.recordReconciliation(claim.receipt, { kind: 'defer', reason: 'provider_missing' });
    expect(await store.listOrphaned(0, Date.parse(initialTime) + 1)).toEqual([]);
    const pending = await store.getIntent(claim.receipt);
    if (!pending) throw new Error('Missing intent');
    expect(
      (
        await store.reclaimIntent({
          ...claim.receipt,
          expectedRevision: pending.revision,
          minimumAgeMs: 0,
        })
      ).kind
    ).toBe('not_acquired');
    for (let attempt = 1; attempt < 8; attempt += 1) {
      await store.recordReconciliation(claim.receipt, {
        kind: 'defer',
        reason: 'provider_missing',
      });
    }
    expect(await store.getIntent(claim.receipt)).toMatchObject({
      status: 'PENDING',
      providerOutcome: { kind: 'unknown' },
      reconciliation: { kind: 'escalated', attempts: 8, reason: 'provider_missing' },
    });
    expect(await store.markExpired(claim.receipt)).toBe('invalid_state');
    expect(await store.markResolved(claim.receipt)).toBe('invalid_state');
    expect(await store.listOrphaned(0, Date.parse(initialTime) + 86_400_000)).toEqual([]);
  });
});
