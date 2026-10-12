/** @baseline ADR-0030 @ownedConcern Exercise observation-only reconciliation through the public maintenance rail. */
import { describe, expect, it, vi } from 'vitest';

import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import {
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
} from '../../src/services/runMaintenance/RunMaintenanceDomainConstants.js';
import { StartRunEventFactory } from '../../src/services/startRun/StartRunEventFactory.js';
import { startRunMaintenanceFixture } from '../helpers/startRunMaintenance.fixture.js';

describe('Start intent maintenance lifecycle', () => {
  it('persists bounded backoff when canonical adoption rejects a changed state', async () => {
    const { service, store, intentStore, receipt, advance, adapter } =
      await startRunMaintenanceFixture();
    vi.spyOn(store, 'applyStartRunWrite').mockResolvedValue('invalid_state');
    const start = vi.spyOn(adapter, 'startRun');
    const cancel = vi.spyOn(adapter, 'cancelRun');
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const outcome = await service.reconcileOrphanedIntents({ thresholdMs: 0 });
      expect(attempt < 7 ? outcome.deferred : outcome.escalated).toEqual([receipt.intentId]);
      expect((await service.reconcileOrphanedIntents({ thresholdMs: 0 })).inspected).toBe(0);
      advance();
    }
    expect(await intentStore.getIntent(receipt)).toMatchObject({
      reconciliation: { kind: 'escalated', reason: 'adoption_failed' },
    });
    expect(start).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it.each(['unknown', 'started'] as const)(
    'adopts observed active execution after %s outcome without redispatch',
    async (outcome) => {
      const { service, intentStore, adapter, receipt, target, observability } =
        await startRunMaintenanceFixture({ outcome });
      const start = vi.spyOn(adapter, 'startRun');
      const cancel = vi.spyOn(adapter, 'cancelRun');
      const counter = vi.spyOn(observability.metrics, 'counter');
      expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'confirmed' });
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: 'RESOLVED',
        providerOutcome: { kind: 'started', runRef: target.runRef },
        compensation: { kind: 'not_required' },
      });
      expect(start).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
      expect(counter).toHaveBeenCalledWith(RUN_MAINTENANCE_METRIC.intentResolvedTotal, {
        provider: 'temporal',
      });
      expect(await service.reconcileOrphanedIntents({ thresholdMs: 0 })).toEqual({
        inspected: 0,
        expired: [],
        resolved: [],
        cancelled: [],
        cancelFailed: [],
        deferred: [],
        escalated: [],
      });
    }
  );

  it.each(['unknown', 'started'] as const)(
    'requires terminal observation after cancellation acknowledgement for %s',
    async (outcome) => {
      const { service, intentStore, adapter, receipt, target, advance } =
        await startRunMaintenanceFixture({ canonical: false, outcome });
      const start = vi.spyOn(adapter, 'startRun');
      const cancel = vi.spyOn(adapter, 'cancelRun');
      expect(await service.reconcileOrphanedIntents({ thresholdMs: 0 })).toMatchObject({
        cancelled: [],
        deferred: [receipt.intentId],
      });
      expect(cancel).toHaveBeenCalledExactlyOnceWith(target.runRef, target.executionId);
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: 'DISPATCHED',
        compensation: { kind: 'required', executionId: target.executionId },
        reconciliation: { kind: 'pending', attempts: 1 },
      });
      expect(await service.reconcileStartRunIntent({ ...receipt, minimumAgeMs: 0 })).toEqual({
        kind: 'blocked',
      });
      expect(cancel).toHaveBeenCalledTimes(1);
      advance();
      vi.spyOn(adapter, 'observeStartRun').mockResolvedValue({
        kind: 'terminal',
        target,
        disposition: 'cancelled',
      });
      expect(await service.reconcileOrphanedIntents({ thresholdMs: 0 })).toMatchObject({
        cancelled: [receipt.intentId],
        resolved: [],
      });
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: 'RESOLVED',
        compensation: { kind: 'confirmed', executionId: target.executionId },
      });
      expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'blocked' });
      expect(start).not.toHaveBeenCalled();
    }
  );

  it.each(['unknown', 'started'] as const)(
    'retains compensation and schedules retry when cancellation fails for %s',
    async (outcome) => {
      const { service, intentStore, adapter, receipt } = await startRunMaintenanceFixture({
        canonical: false,
        outcome,
      });
      vi.spyOn(adapter, 'cancelRun').mockRejectedValue('cancel response lost');
      expect(await service.reconcileOrphanedIntents({ thresholdMs: 0 })).toMatchObject({
        cancelFailed: [receipt.intentId],
        resolved: [],
        cancelled: [],
      });
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: 'DISPATCHED',
        compensation: { kind: 'required' },
        reconciliation: { kind: 'pending', attempts: 1, reason: 'cancel_failed' },
      });
    }
  );

  it('backs off missing observations, escalates and leaves subsequent sweeps inert', async () => {
    const { service, intentStore, adapter, receipt, advance, observability } =
      await startRunMaintenanceFixture();
    const start = vi.spyOn(adapter, 'startRun');
    const cancel = vi.spyOn(adapter, 'cancelRun');
    const observe = vi
      .spyOn(adapter, 'observeStartRun')
      .mockResolvedValue({ kind: 'missing_at_observation' });
    const warn = vi.spyOn(observability.logs, 'warn');
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await service.reconcileOrphanedIntents({ thresholdMs: 0 });
      expect(attempt < 7 ? result.deferred : result.escalated).toEqual([receipt.intentId]);
      expect((await service.reconcileOrphanedIntents({ thresholdMs: 0 })).inspected).toBe(0);
      advance();
    }
    expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'escalated' });
    expect(await intentStore.getIntent(receipt)).toMatchObject({
      status: 'PENDING',
      providerOutcome: { kind: 'unknown' },
      reconciliation: { kind: 'escalated', reason: 'provider_missing' },
    });
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          outcome: 'escalated',
          reasonCode: 'provider_missing',
        }),
      })
    );
    expect(observe).toHaveBeenCalledTimes(8);
    expect(start).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it.each(['unsupported', 'absent'] as const)(
    'defers an %s provider without reporting absence',
    async (kind) => {
      const { service, intentStore, adapter, adapters, receipt } =
        await startRunMaintenanceFixture();
      if (kind === 'absent') adapters.clear();
      else delete adapter.observeStartRun;
      expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'blocked' });
      expect(await intentStore.getIntent(receipt)).toMatchObject({
        status: 'PENDING',
        reconciliation: { reason: 'provider_unsupported' },
      });
    }
  );

  it('expires a never-authorized intent without running a provider command', async () => {
    const { service, adapter, receipt, intentStore } = await startRunMaintenanceFixture({
      canonical: false,
      outcome: 'not_requested',
    });
    vi.spyOn(adapter, 'observeStartRun').mockResolvedValue({ kind: 'missing_at_observation' });
    const cancel = vi.spyOn(adapter, 'cancelRun');
    expect((await service.reconcileOrphanedIntents({ thresholdMs: 0 })).expired).toEqual([
      receipt.intentId,
    ]);
    expect((await intentStore.getIntent(receipt))?.status).toBe('EXPIRED');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('does not adopt an active provider into a terminal recovery child', async () => {
    const { service, adapter, receipt, store, context, clock, intentStore } =
      await startRunMaintenanceFixture();
    const metadata = await store.getRunMetadataByRunId(context.tenantId, context.runId);
    if (!metadata) throw new Error('Missing canonical metadata');
    const factory = new StartRunEventFactory({ clock, idempotency: new IdempotencyKeyBuilder() });
    await store.appendAndEnqueueTx(context.runId, [
      factory.buildRunEvent(metadata, 'RunFailed', { reason: 'WORKFLOW_FAILURE' }),
    ]);
    const before = await store.listEvents(context.tenantId, context.runId);
    const start = vi.spyOn(adapter, 'startRun');
    expect(await service.reconcileStartRunIntent(receipt)).toEqual({ kind: 'blocked' });
    expect(await intentStore.getIntent(receipt)).toMatchObject({
      status: 'DISPATCHED',
      compensation: { kind: 'required', reason: 'terminal_canonical' },
    });
    expect(await store.listEvents(context.tenantId, context.runId)).toEqual(before);
    expect(start).not.toHaveBeenCalled();
  });

  it('skips young intents and keeps dry-run read-only', async () => {
    const { service, intentStore, adapter, receipt } = await startRunMaintenanceFixture();
    const before = await intentStore.getIntent(receipt);
    const observe = vi.spyOn(adapter, 'observeStartRun');
    expect((await service.reconcileOrphanedIntents({ thresholdMs: 999_999 })).inspected).toBe(0);
    expect(await service.reconcileOrphanedIntents({ thresholdMs: 0, dryRun: true })).toMatchObject({
      inspected: 1,
      deferred: [receipt.intentId],
    });
    expect(await intentStore.getIntent(receipt)).toEqual(before);
    expect(observe).not.toHaveBeenCalled();
  });

  it('bounds each sweep by its limit', async () => {
    const { service, intentStore, clock, advance } = await startRunMaintenanceFixture();
    for (const intentId of ['second', 'third'])
      await intentStore.claimIntent({
        intentId,
        runId: intentId,
        tenantId: 't',
        provider: 'temporal',
        createdAt: clock.nowIsoUtc(),
      });
    advance();
    expect(
      (await service.reconcileOrphanedIntents({ thresholdMs: 0, limit: 1, dryRun: true })).inspected
    ).toBe(1);
  });

  it('signals corrupt lifecycle state before attempting acquisition or a provider call', async () => {
    const { service, intentStore, adapter, receipt, observability } =
      await startRunMaintenanceFixture();
    const intent = await intentStore.getIntent(receipt);
    if (!intent) throw new Error('Missing intent');
    vi.spyOn(intentStore, 'listOrphaned').mockResolvedValue([
      { ...intent, status: 'UNKNOWN_STATUS' as typeof intent.status },
    ]);
    const reclaim = vi.spyOn(intentStore, 'reclaimIntent');
    const observe = vi.spyOn(adapter, 'observeStartRun');
    const warn = vi.spyOn(observability.logs, 'warn');
    const counter = vi.spyOn(observability.metrics, 'counter');
    expect((await service.reconcileOrphanedIntents({ thresholdMs: 0 })).inspected).toBe(1);
    expect(reclaim).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ msg: RUN_MAINTENANCE_MESSAGE.unexpectedIntentStatus })
    );
    expect(counter).toHaveBeenCalledWith(RUN_MAINTENANCE_METRIC.intentUnexpectedStatusTotal, {
      operation: 'reconcileOrphanedIntents',
    });
  });
});
