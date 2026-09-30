import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import type { StartRunIntentClaimReceipt } from '../../src/ports/IStartRunIntentStore.js';
import { StartRunCompensation } from '../../src/services/startRun/StartRunCompensation.js';
import { StartRunFailureDiagnostics } from '../../src/services/startRun/StartRunFailureDiagnostics.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';

const runRef: EngineRunRef = {
  provider: 'temporal',
  tenantId: 't',
  workflowId: 'actual-w',
  runId: 'r',
};
const traceContext = { tenantId: 't', projectId: 'p', environmentId: 'e', runId: 'r' };

async function fixture(): Promise<{
  store: InMemoryStartRunIntentStore;
  receipt: StartRunIntentClaimReceipt;
}> {
  const store = new InMemoryStartRunIntentStore();
  const claim = await store.claimIntent({
    intentId: 'i',
    tenantId: 't',
    runId: 'r',
    provider: 'temporal',
    createdAt: '2026-09-30T00:00:00Z',
  });
  if (claim.kind !== 'acquired') throw new Error('Missing acquisition');
  await store.authorizeDispatch(claim.receipt);
  await store.markDispatched(claim.receipt, runRef);
  return { store, receipt: claim.receipt };
}

describe('durable start compensation', () => {
  it.each(['bootstrap', 'provider_ref_reconciliation'] as const)(
    'records sticky compensation with the exact receipt after %s failure',
    async (reason) => {
      const { store, receipt } = await fixture();
      const record = vi.spyOn(store, 'recordReconciliation');
      const resolve = vi.spyOn(store, 'markResolved');
      const diagnostics = { compensationFailed: vi.fn() };
      await new StartRunCompensation({ intentStore: store, diagnostics }).compensate({
        runRef,
        receipt,
        traceContext,
        reason,
      });
      expect(record).toHaveBeenCalledWith(receipt, {
        kind: 'require_compensation',
        reason: reason === 'bootstrap' ? 'bootstrap_failed' : 'provider_ref_failed',
      });
      expect(await store.getIntent(receipt)).toMatchObject({
        status: 'DISPATCHED',
        providerOutcome: { kind: 'started', runRef },
        compensation: { kind: 'required' },
      });
      expect(resolve).not.toHaveBeenCalled();
      expect(diagnostics.compensationFailed).not.toHaveBeenCalled();
    }
  );

  it.each(['bootstrap', 'provider_ref_reconciliation'] as const)(
    'does not replace the original failure when persistence and diagnostics fail after %s',
    async (reason) => {
      const { store, receipt } = await fixture();
      const before = await store.getIntent(receipt);
      vi.spyOn(store, 'recordReconciliation').mockRejectedValue('response lost');
      const observability = createNoopObservability();
      const error = vi.spyOn(observability.logs, 'error').mockImplementation(() => {
        throw new Error('sink down');
      });
      const diagnostics = new StartRunFailureDiagnostics({
        observability,
        clock: { nowIsoUtc: () => '2026-09-30T00:00:00Z' },
      });
      await expect(
        new StartRunCompensation({ intentStore: store, diagnostics }).compensate({
          runRef,
          receipt,
          traceContext,
          reason,
        })
      ).resolves.toBeUndefined();
      expect(await store.getIntent(receipt)).toEqual(before);
      expect(error).toHaveBeenCalled();
    }
  );
});
