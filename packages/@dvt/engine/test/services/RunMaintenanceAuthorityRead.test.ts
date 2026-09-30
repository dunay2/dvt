import { describe, expect, it, vi } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { RunMaintenanceService } from '../../src/services/RunMaintenanceService.js';
import {
  createWorkflowEngineFixture,
  makeDefaultExecutionPlan,
  makePlanRefForPlan,
  makeTemporalAdapter,
} from '../helpers/workflowEngine.fixture.js';

describe('maintenance authority read boundary', () => {
  it.each(['lookup', 'canonical_status', 'adoption'] as const)(
    'keeps pending intent and run unchanged when %s fails',
    async (boundary) => {
      const lookupRunRef = vi.fn();
      const cancelRun = vi.fn(async () => {});
      const adapter = makeTemporalAdapter({ lookupRunRef, cancelRun });
      const fixture = createWorkflowEngineFixture({ adapter });
      const context = {
        tenantId: 'tenant-pending',
        projectId: 'project',
        environmentId: 'test',
        runId: 'pending-run',
        targetAdapter: 'temporal' as const,
      };
      const runRef = await fixture.engine.startRun(
        makePlanRefForPlan(makeDefaultExecutionPlan()),
        context
      );
      const intent = await fixture.intentStore.createIntent({
        intentId: 'pending-intent',
        tenantId: context.tenantId,
        runId: context.runId,
        provider: 'temporal',
        createdAt: '2000-01-01T00:00:00.000Z',
      });
      const intentRef = { tenantId: intent.tenantId, intentId: intent.intentId };
      const getSnapshot = fixture.store.getSnapshot.bind(fixture.store);
      const snapshot = async (): Promise<unknown> => ({
        intent: await fixture.intentStore.getIntent(intentRef),
        metadata: await fixture.store.getRunMetadataByRunId(context.tenantId, context.runId),
        events: await fixture.store.listEvents(context.tenantId, context.runId),
        snapshot: await getSnapshot(context.tenantId, context.runId),
      });
      const before = globalThis.structuredClone(await snapshot());
      if (boundary === 'lookup') lookupRunRef.mockRejectedValue('lookup response lost');
      if (boundary === 'canonical_status') {
        lookupRunRef.mockResolvedValue(null);
        vi.spyOn(fixture.store, 'getSnapshot').mockRejectedValue(
          new Error('canonical read failed')
        );
      }
      if (boundary === 'adoption') {
        lookupRunRef.mockResolvedValue(runRef);
        vi.spyOn(fixture.store, 'saveProviderRef').mockRejectedValue(
          new Error('adoption write failed')
        );
      }
      const service = new RunMaintenanceService({
        stateStoreRead: fixture.store,
        stateStoreWrite: fixture.store,
        intentStore: fixture.intentStore,
        adapters: fixture.adapters,
        authorizer: new AllowAllAuthorizer(),
        clock: fixture.clock,
        idempotency: fixture.idempotency,
        observability: createNoopObservability(),
      });
      await expect(service.reconcileStartRunIntent(intentRef)).resolves.toEqual({
        kind: 'blocked',
      });
      expect(cancelRun).not.toHaveBeenCalled();
      expect(await snapshot()).toEqual(before);
    }
  );

  it.each([
    { mode: 'batch', fault: new Error('metadata unavailable'), throwingDiagnostics: false },
    { mode: 'single', fault: new Error('metadata unavailable'), throwingDiagnostics: false },
    { mode: 'batch', fault: 'non-Error rejection', throwingDiagnostics: true },
  ])(
    'defers $mode reconciliation without effects on failed reads',
    async ({ mode, fault, throwingDiagnostics }) => {
      const cancel = vi.fn(async () => {});
      const adapter = makeTemporalAdapter({ cancelRun: cancel });
      const fixture = createWorkflowEngineFixture({ adapter });
      const context = {
        tenantId: 'tenant-maintenance',
        projectId: 'project',
        environmentId: 'test',
        runId: 'maintenance-run',
        targetAdapter: 'temporal' as const,
      };
      const runRef = await fixture.engine.startRun(
        makePlanRefForPlan(makeDefaultExecutionPlan()),
        context
      );
      const intent = await fixture.intentStore.createIntent({
        intentId: 'maintenance-intent',
        tenantId: context.tenantId,
        runId: context.runId,
        provider: 'temporal',
        createdAt: '2000-01-01T00:00:00.000Z',
      });
      const intentRef = { tenantId: intent.tenantId, intentId: intent.intentId };
      await fixture.intentStore.markDispatched(intentRef, runRef);
      const readMetadata = fixture.store.getRunMetadataByRunId.bind(fixture.store);
      const snapshot = async (): Promise<unknown> => ({
        intent: await fixture.intentStore.getIntent(intentRef),
        metadata: await readMetadata(context.tenantId, context.runId),
        events: await fixture.store.listEvents(context.tenantId, context.runId),
        snapshot: await fixture.store.getSnapshot(context.tenantId, context.runId),
      });
      const before = globalThis.structuredClone(await snapshot());
      const observability = createNoopObservability();
      const warn = vi.spyOn(observability.logs, 'warn');
      if (throwingDiagnostics) {
        warn.mockImplementation(() => {
          throw new Error('log sink down');
        });
        vi.spyOn(observability.metrics, 'counter').mockImplementation(() => {
          throw new Error('metric sink down');
        });
      }
      vi.spyOn(fixture.store, 'getRunMetadataByRunId').mockRejectedValue(fault);
      const service = new RunMaintenanceService({
        stateStoreRead: fixture.store,
        stateStoreWrite: fixture.store,
        intentStore: fixture.intentStore,
        adapters: fixture.adapters,
        authorizer: new AllowAllAuthorizer(),
        clock: fixture.clock,
        idempotency: fixture.idempotency,
        observability,
      });

      if (mode === 'single') {
        await expect(service.reconcileStartRunIntent(intentRef)).resolves.toEqual({
          kind: 'blocked',
        });
      } else {
        await expect(service.reconcileOrphanedIntents({ thresholdMs: 1 })).resolves.toMatchObject({
          deferred: [intent.intentId],
          resolved: [],
          expired: [],
          cancelled: [],
          cancelFailed: [],
        });
      }
      expect(cancel).not.toHaveBeenCalled();
      expect(await snapshot()).toEqual(before);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({ reasonCode: 'metadata_read_failed' }),
        })
      );
    }
  );
});
