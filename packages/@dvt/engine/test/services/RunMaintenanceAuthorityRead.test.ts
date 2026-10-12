import { describe, expect, it, vi } from 'vitest';

import { startRunMaintenanceFixture } from '../helpers/startRunMaintenance.fixture.js';

type Store = Awaited<ReturnType<typeof startRunMaintenanceFixture>>['store'];
type CanonicalState = {
  metadata: Awaited<ReturnType<Store['getRunMetadataByRunId']>>;
  events: Awaited<ReturnType<Store['listEvents']>>;
  snapshot: Awaited<ReturnType<Store['getSnapshot']>>;
};

describe('maintenance authority read boundary', () => {
  it.each(['provider', 'canonical_status', 'adoption'] as const)(
    'keeps canonical state unchanged and records a retry when %s fails',
    async (boundary) => {
      const fixture = await startRunMaintenanceFixture();
      const { service, store, intentStore, adapter, receipt, context } = fixture;
      const readSnapshot = store.getSnapshot.bind(store);
      const canonical = async (): Promise<CanonicalState> => ({
        metadata: await store.getRunMetadataByRunId(context.tenantId, context.runId),
        events: await store.listEvents(context.tenantId, context.runId),
        snapshot: await readSnapshot(context.tenantId, context.runId),
      });
      const before = globalThis.structuredClone(await canonical());
      const cancel = vi.spyOn(adapter, 'cancelRun');
      const start = vi.spyOn(adapter, 'startRun');
      const observe = vi.spyOn(adapter, 'observeStartRun');
      if (boundary === 'provider') observe.mockRejectedValue('response lost');
      if (boundary === 'canonical_status')
        vi.spyOn(store, 'getSnapshot').mockRejectedValue(new Error('read failed'));
      if (boundary === 'adoption')
        vi.spyOn(store, 'applyStartRunWrite').mockRejectedValue(new Error('write failed'));
      expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'blocked' });
      expect(await canonical()).toEqual(before);
      expect(cancel).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
      if (boundary === 'canonical_status') expect(observe).not.toHaveBeenCalled();
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: boundary === 'adoption' ? 'DISPATCHED' : 'PENDING',
        compensation: { kind: 'not_required' },
        reconciliation: {
          kind: 'pending',
          attempts: 1,
          reason:
            boundary === 'provider'
              ? 'provider_failed'
              : boundary === 'canonical_status'
                ? 'status_failed'
                : 'adoption_failed',
        },
      });
    }
  );

  it.each([
    { mode: 'batch', fault: new Error('metadata unavailable'), throwingDiagnostics: false },
    { mode: 'single', fault: new Error('metadata unavailable'), throwingDiagnostics: false },
    { mode: 'batch', fault: 'non-Error rejection', throwingDiagnostics: true },
  ])(
    'defers $mode reconciliation after failed metadata reads',
    async ({ mode, fault, throwingDiagnostics }) => {
      const { service, store, intentStore, adapter, receipt, context, observability } =
        await startRunMaintenanceFixture({ outcome: 'started' });
      const readMetadata = store.getRunMetadataByRunId.bind(store);
      const canonical = async (): Promise<CanonicalState> => ({
        metadata: await readMetadata(context.tenantId, context.runId),
        events: await store.listEvents(context.tenantId, context.runId),
        snapshot: await store.getSnapshot(context.tenantId, context.runId),
      });
      const before = globalThis.structuredClone(await canonical());
      const cancel = vi.spyOn(adapter, 'cancelRun');
      const observe = vi.spyOn(adapter, 'observeStartRun');
      const start = vi.spyOn(adapter, 'startRun');
      const warn = vi.spyOn(observability.logs, 'warn');
      if (throwingDiagnostics) {
        warn.mockImplementation(() => {
          throw new Error('sink down');
        });
        vi.spyOn(observability.metrics, 'counter').mockImplementation(() => {
          throw new Error('sink down');
        });
      }
      vi.spyOn(store, 'getRunMetadataByRunId').mockRejectedValue(fault);
      if (mode === 'single')
        expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'blocked' });
      else
        expect(await service.reconcileOrphanedIntents({ thresholdMs: 1 })).toEqual({
          inspected: 1,
          deferred: [receipt.intentId],
          resolved: [],
          expired: [],
          cancelled: [],
          cancelFailed: [],
          escalated: [],
        });
      expect(await canonical()).toEqual(before);
      expect(cancel).not.toHaveBeenCalled();
      expect(observe).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: 'DISPATCHED',
        reconciliation: { kind: 'pending', attempts: 1, reason: 'metadata_failed' },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({ reasonCode: 'metadata_failed' }),
        })
      );
    }
  );
});
