/** @baseline ADR-0030 @ownedConcern Reconciliation decisions distinguish provider observations from canonical authority. */
import { describe, expect, it } from 'vitest';

import type { StartRunIntent } from '../../src/ports/IStartRunIntentStore.js';
import { decideStartRunIntentReconciliation } from '../../src/services/runMaintenance/decideStartRunIntentReconciliation.js';

const runRef = {
  provider: 'temporal' as const,
  tenantId: 'tenant',
  runId: 'run',
  namespace: 'default',
  workflowId: 'workflow',
};
const target = { runRef, executionId: 'execution' };
const now = '2026-09-30T00:00:00.000Z';
const intent: StartRunIntent = {
  intentId: 'intent',
  tenantId: 'tenant',
  runId: 'run',
  provider: 'temporal',
  status: 'PENDING',
  createdAt: now,
  updatedAt: now,
  revision: 1,
  providerOutcome: { kind: 'unknown', reasonCode: 'start_requested', since: now },
  compensation: { kind: 'not_required' },
  reconciliation: { kind: 'pending', attempts: 0, nextAttemptAt: now },
};

describe('Start reconciliation decision', () => {
  it.each(['metadata_failed', 'provider_failed', 'status_failed', 'provider_unsupported'] as const)(
    'defers %s without treating a failed read as absence',
    (reason) => {
      const observation = { kind: 'failed' as const, reason };
      expect(decideStartRunIntentReconciliation(intent, observation)).toEqual({
        kind: 'defer',
        reason,
      });
      expect(observation).toEqual({ kind: 'failed', reason });
    }
  );
  it.each([
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'PENDING',
    'APPROVED',
    'RUNNING',
    'PAUSED',
  ] as const)('keeps uncertainty for canonical %s', (canonical) => {
    const observation = {
      kind: 'known' as const,
      canonical,
      provider: { kind: 'missing_at_observation' as const },
    };
    const before = globalThis.structuredClone(observation);
    expect(decideStartRunIntentReconciliation(intent, observation)).toEqual({
      kind: 'defer',
      reason: 'provider_missing',
    });
    expect(observation).toEqual(before);
  });
  it('expires only an intent which has never authorized dispatch', () => {
    expect(
      decideStartRunIntentReconciliation(
        { ...intent, providerOutcome: { kind: 'not_requested' } },
        { kind: 'known', canonical: null, provider: { kind: 'missing_at_observation' } }
      )
    ).toEqual({ kind: 'expire' });
  });
  it.each([null, 'PENDING'] as const)(
    'uses canonical presence %s to distinguish adoption from compensation',
    (canonical) => {
      expect(
        decideStartRunIntentReconciliation(intent, {
          kind: 'known',
          canonical,
          provider: { kind: 'active', target },
        })
      ).toEqual(
        canonical === null
          ? { kind: 'cancel', target, reason: 'orphaned_provider' }
          : { kind: 'adopt', runRef }
      );
    }
  );
  it('never turns missing after authorization into failure, expiry or redispatch', () => {
    for (const canonical of [null, 'PENDING', 'FAILED'] as const) {
      expect(
        decideStartRunIntentReconciliation(intent, {
          kind: 'known',
          canonical,
          provider: { kind: 'missing_at_observation' },
        })
      ).toEqual({ kind: 'defer', reason: 'provider_missing' });
    }
  });
  it('does not adopt an active workflow into terminal canonical state', () => {
    expect(
      decideStartRunIntentReconciliation(intent, {
        kind: 'known',
        canonical: 'FAILED',
        provider: { kind: 'active', target },
      })
    ).toEqual({ kind: 'cancel', target, reason: 'terminal_canonical' });
  });
  it('keeps sticky compensation despite metadata becoming available', () => {
    expect(
      decideStartRunIntentReconciliation(
        { ...intent, compensation: { kind: 'required', reason: 'orphaned_provider', since: now } },
        { kind: 'known', canonical: 'RUNNING', provider: { kind: 'active', target } }
      )
    ).toEqual({ kind: 'cancel', target, reason: 'orphaned_provider' });
  });
  it.each(['completed', 'failed', 'timed_out', 'other'] as const)(
    'escalates %s orphans instead of reporting cancellation',
    (disposition) => {
      const provider = { kind: 'terminal' as const, target, disposition };
      expect(
        decideStartRunIntentReconciliation(intent, { kind: 'known', canonical: null, provider })
      ).toEqual({ kind: 'escalate', reason: 'terminal_orphan', observation: provider });
    }
  );
  it('does not cancel a replacement execution with the same workflow identity', () => {
    const provider = { kind: 'active' as const, target };
    expect(
      decideStartRunIntentReconciliation(
        {
          ...intent,
          compensation: {
            kind: 'required',
            reason: 'orphaned_provider',
            since: now,
            executionId: 'old',
          },
        },
        { kind: 'known', canonical: null, provider }
      )
    ).toEqual({ kind: 'escalate', reason: 'execution_changed', observation: provider });
  });
});
