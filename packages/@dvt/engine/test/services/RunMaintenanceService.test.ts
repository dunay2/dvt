import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunMaintenanceService } from '../../src/services/RunMaintenanceService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

describe('RunMaintenanceService', () => {
  function makePlanRef(): PlanRef {
    return {
      uri: 'https://example.com/plan',
      sha256: 'deadbeef',
      schemaVersion: 'v1.1',
      planId: 'p',
      planVersion: '1.0',
    };
  }

  function makeContext(runId = 'r1'): RunContext {
    return {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId,
      targetAdapter: 'temporal',
    };
  }

  function makeTemporalAdapter(): IProviderAdapter {
    return {
      provider: 'temporal',
      async startRun(_planRef: PlanRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async cancelRun() {},
      async getRunStatus(runRef) {
        return { runId: runRef.runId, status: 'RUNNING' } as any;
      },
      async signal() {},
    };
  }

  function createFixture(): {
    engine: WorkflowEngine;
    service: RunMaintenanceService;
    store: InMemoryTxStore;
    intentStore: InMemoryStartRunIntentStore;
    clock: SequenceClock;
    idempotency: IdempotencyKeyBuilder;
  } {
    const store = new InMemoryTxStore();
    const intentStore = new InMemoryStartRunIntentStore();
    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const authorizer = new AllowAllAuthorizer();
    const idempotency = new IdempotencyKeyBuilder();

    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      ['temporal', makeTemporalAdapter()],
    ]);

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector: new SnapshotProjector(),
      idempotency,
      clock,
      authorizer,
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      intentStore,
      observability: createNoopObservability(),
      adapters,
    });

    const service = new RunMaintenanceService({
      stateStore: store,
      intentStore,
      adapters,
      authorizer,
      clock,
      idempotency,
      observability: createNoopObservability(),
    });

    return { engine, service, store, intentStore, clock, idempotency };
  }

  describe('detectStuckRuns', () => {
    it('returns empty transitioned when no runs are PENDING', async () => {
      const { service } = createFixture();
      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });
      expect(result.transitioned).toEqual([]);
      expect(result.inspected).toBe(0);
    });

    it('returns empty transitioned when PENDING run is younger than threshold', async () => {
      const { engine, service } = createFixture();
      await engine.startRun(makePlanRef(), makeContext('young-1'));
      const result = await service.detectStuckRuns({
        thresholdMs: 999_999,
        tenantId: 't',
      });
      expect(result.transitioned).toEqual([]);
    });

    it('marks a PENDING run as RunFailed when it exceeds the threshold', async () => {
      const { engine, service, store } = createFixture();
      await engine.startRun(makePlanRef(), makeContext('stuck-1'));

      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });

      expect(result.transitioned).toEqual(['stuck-1']);
      const events = await store.listEvents('t', 'stuck-1');
      const failedEvent = events.find((e) => e.eventType === 'RunFailed');
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.payload).toMatchObject({ reason: 'QUEUED_TIMEOUT' });
    });

    it('transitions snapshot to FAILED after detection', async () => {
      const { engine, service, store } = createFixture();
      const runRef = await engine.startRun(makePlanRef(), makeContext('stuck-snap-1'));

      expect((await engine.getRunStatus(runRef)).status).toBe('PENDING');

      await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });

      const snap = await store.getSnapshot('t', 'stuck-snap-1');
      expect(snap?.status).toBe('FAILED');
    });

    it('only marks PENDING runs — ignores RUNNING/COMPLETED runs', async () => {
      const { engine, service } = createFixture();
      await engine.startRun(makePlanRef(), makeContext('pending-only-1'));
      await engine.startRun(makePlanRef(), makeContext('pending-only-2'));

      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });
      expect(result.transitioned.sort()).toEqual(['pending-only-1', 'pending-only-2'].sort());
    });

    it('respects tenantId filter — does not mark other tenants runs', async () => {
      const { engine, service } = createFixture();

      const ctxA: RunContext = { ...makeContext('run-t-a'), tenantId: 'tenant-a' };
      const ctxB: RunContext = { ...makeContext('run-t-b'), tenantId: 'tenant-b' };
      await engine.startRun(makePlanRef(), ctxA);
      await engine.startRun(makePlanRef(), ctxB);

      const result = await service.detectStuckRuns({
        thresholdMs: 0,
        tenantId: 'tenant-a',
      });

      expect(result.transitioned).toEqual(['run-t-a']);
    });

    it('respects limit — scans at most N candidates per call', async () => {
      const { engine, service } = createFixture();
      await engine.startRun(makePlanRef(), makeContext('limit-1'));
      await engine.startRun(makePlanRef(), makeContext('limit-2'));
      await engine.startRun(makePlanRef(), makeContext('limit-3'));

      const result = await service.detectStuckRuns({
        thresholdMs: 0,
        tenantId: 't',
        limit: 1,
      });
      expect(result.transitioned).toHaveLength(1);
      expect(result.inspected).toBe(1);
    });

    it('skips runs with missing createdAt (backward compat)', async () => {
      const { service, store } = createFixture();
      await store.bootstrapRunTx({
        metadata: {
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          runId: 'no-created-at',
          planId: 'plan',
          planVersion: '1',
          logicalAttemptId: 1,
          provider: 'temporal',
          providerWorkflowId: 'wf-no-created-at',
          providerRunId: 'no-created-at',
          // createdAt intentionally absent
        },
        firstEvents: [],
      });

      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });
      expect(result.transitioned).not.toContain('no-created-at');
      expect(result.skipped).toBe(1);
    });

    it('dryRun does not append events', async () => {
      const { engine, service, store } = createFixture();
      await engine.startRun(makePlanRef(), makeContext('dry-1'));

      const result = await service.detectStuckRuns({
        thresholdMs: 0,
        tenantId: 't',
        dryRun: true,
      });

      expect(result.transitioned).toEqual([]);
      expect(result.inspected).toBe(1);

      // Verify no RunFailed event was appended
      const events = await store.listEvents('t', 'dry-1');
      const failedEvent = events.find((e) => e.eventType === 'RunFailed');
      expect(failedEvent).toBeUndefined();
    });

    it('returns structured result with inspected and skipped counts', async () => {
      const { engine, service, store } = createFixture();
      await engine.startRun(makePlanRef(), makeContext('counted-1'));

      // Add a run without createdAt
      await store.bootstrapRunTx({
        metadata: {
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          runId: 'no-ts',
          planId: 'plan',
          planVersion: '1',
          logicalAttemptId: 1,
          provider: 'temporal',
          providerWorkflowId: 'wf-no-ts',
          providerRunId: 'no-ts',
        },
        firstEvents: [],
      });

      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });

      expect(result.tenantId).toBe('t');
      expect(result.inspected).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.transitioned).toEqual(['counted-1']);
    });
  });

  describe('detectStuckCancellingRuns', () => {
    /**
     * Helper: creates a run in CANCELLING state (RUNNING + cancelling = true).
     *
     * Steps:
     *   1. engine.startRun() — PENDING with RunQueued
     *   2. Manually append RunStarted — transitions to RUNNING
     *   3. engine.cancelRun() — emits RunCancelRequested, sets cancelling = true
     */
    async function makeCancellingRun(
      fixture: ReturnType<typeof createFixture>,
      runId: string,
      tenantId = 't'
    ): Promise<EngineRunRef> {
      const ctx = makeContext(runId);
      ctx.tenantId = tenantId;
      const runRef = await fixture.engine.startRun(makePlanRef(), ctx);

      // Transition to RUNNING
      await fixture.store.appendAndEnqueueTx(runId, [
        {
          eventId: fixture.idempotency.eventId(),
          eventType: 'RunStarted' as const,
          emittedAt: fixture.clock.nowIsoUtc(),
          tenantId,
          projectId: 'p',
          environmentId: 'dev',
          runId,
          planId: 'p',
          planVersion: '1.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: fixture.idempotency.runEventKey({
            eventType: 'RunStarted',
            runId,
            logicalAttemptId: 1,
            planId: 'p',
            planVersion: '1.0',
          }),
        },
      ]);

      // Cancel — emits RunCancelRequested, sets cancelling = true
      await fixture.engine.cancelRun(runRef);

      return runRef;
    }

    it('returns empty when no RUNNING runs exist', async () => {
      const fixture = createFixture();
      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
      });
      expect(result.transitioned).toEqual([]);
      expect(result.inspected).toBe(0);
    });

    it('ignores RUNNING runs that are NOT cancelling', async () => {
      const fixture = createFixture();
      await fixture.engine.startRun(makePlanRef(), makeContext('running-1'));

      // Transition to RUNNING without cancelling
      await fixture.store.appendAndEnqueueTx('running-1', [
        {
          eventId: fixture.idempotency.eventId(),
          eventType: 'RunStarted' as const,
          emittedAt: fixture.clock.nowIsoUtc(),
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          runId: 'running-1',
          planId: 'p',
          planVersion: '1.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: fixture.idempotency.runEventKey({
            eventType: 'RunStarted',
            runId: 'running-1',
            logicalAttemptId: 1,
            planId: 'p',
            planVersion: '1.0',
          }),
        },
      ]);

      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
      });
      expect(result.transitioned).toEqual([]);
      expect(result.inspected).toBe(1);
    });

    it('ignores CANCELLING runs younger than threshold', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'young-cancel-1');

      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 999_999,
        tenantId: 't',
      });
      expect(result.transitioned).toEqual([]);
    });

    it('marks CANCELLING run as FAILED when it exceeds threshold', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'stuck-cancel-1');

      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
      });
      expect(result.transitioned).toEqual(['stuck-cancel-1']);
    });

    it('emits RunFailed with CANCELLATION_TIMEOUT reason', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'cancel-timeout-1');

      await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
      });

      const events = await fixture.store.listEvents('t', 'cancel-timeout-1');
      const failedEvent = events.find((e) => e.eventType === 'RunFailed');
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.payload).toMatchObject({ reason: 'CANCELLATION_TIMEOUT' });
    });

    it('transitions snapshot to FAILED after detection', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'cancel-snap-1');

      // Verify it's RUNNING + cancelling before
      const snapBefore = await fixture.store.getSnapshot('t', 'cancel-snap-1');
      expect(snapBefore?.status).toBe('RUNNING');
      expect(snapBefore?.cancelling).toBe(true);

      await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
      });

      const snapAfter = await fixture.store.getSnapshot('t', 'cancel-snap-1');
      expect(snapAfter?.status).toBe('FAILED');
    });

    it('respects tenantId filter — does not mark other tenants', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'cancel-ta', 'tenant-a');
      await makeCancellingRun(fixture, 'cancel-tb', 'tenant-b');

      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 'tenant-a',
      });

      expect(result.transitioned).toEqual(['cancel-ta']);
    });

    it('dryRun does not append events', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'dry-cancel-1');

      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
        dryRun: true,
      });

      expect(result.transitioned).toEqual([]);
      expect(result.inspected).toBe(1);

      // Verify no RunFailed event was appended
      const events = await fixture.store.listEvents('t', 'dry-cancel-1');
      const failedEvent = events.find((e) => e.eventType === 'RunFailed');
      expect(failedEvent).toBeUndefined();
    });

    it('respects limit option', async () => {
      const fixture = createFixture();
      await makeCancellingRun(fixture, 'cancel-lim-1');
      await makeCancellingRun(fixture, 'cancel-lim-2');
      await makeCancellingRun(fixture, 'cancel-lim-3');

      const result = await fixture.service.detectStuckCancellingRuns({
        thresholdMs: 0,
        tenantId: 't',
        limit: 1,
      });

      // limit applies to the RUNNING query; only 1 candidate inspected
      expect(result.inspected).toBe(1);
    });
  });
});
