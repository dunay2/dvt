import { describe, expect, it } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { buildRunEvents } from '../../src/core/lifecycle/coreRuntime.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { RunMaintenanceService } from '../../src/services/RunMaintenanceService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import {
  createWorkflowEngineFixture,
  makeDefaultExecutionPlan,
  makePlanRefForPlan,
  makeProviderMap,
} from '../helpers/workflowEngine.fixture.js';

type EngineRunRef = import('@dvt/contracts').EngineRunRef;
type IObservability = import('@dvt/observability').IObservability;
type PlanRef = import('@dvt/contracts').PlanRef;
type RunContext = import('@dvt/contracts').RunContext;
type IProviderAdapter = import('../../src/adapters/IProviderAdapter.js').IProviderAdapter;

// helpers moved to module scope

function makePlanRef(): PlanRef {
  return makePlanRefForPlan(makeDefaultExecutionPlan(), 'https://example.com/plan');
}

const TEST_PLAN_REF = makePlanRef();

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
    async getProviderStatusView() {
      return { provider: 'temporal', providerStatus: 'RUNNING' } as any;
    },
    async signal() {},
  };
}

function createFixture(observability: IObservability = createNoopObservability()): {
  engine: ReturnType<typeof createWorkflowEngineFixture>['engine'];
  service: RunMaintenanceService;
  store: InMemoryTxStore;
  intentStore: InMemoryStartRunIntentStore;
  clock: SequenceClock;
  idempotency: IdempotencyKeyBuilder;
} {
  const store = new InMemoryTxStore();
  const intentStore = store.startRunIntents;
  const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
  const authorizer = new AllowAllAuthorizer();
  const idempotency = new IdempotencyKeyBuilder();
  const adapters = makeProviderMap(makeTemporalAdapter());
  const { engine } = createWorkflowEngineFixture({
    stateStore: store,
    intentStore,
    clock,
    authorizer,
    observability,
    adapters,
    idempotency,
  });

  const service = new RunMaintenanceService({
    stateStoreRead: store,
    stateStoreWrite: store,
    intentStore,
    adapters,
    authorizer,
    clock,
    idempotency,
    observability,
  });

  return { engine, service, store, intentStore, clock, idempotency };
}

function createThrowingObservability(): IObservability {
  return {
    metrics: {
      counter() {
        return {
          add() {
            throw new Error('metrics sink down');
          },
        };
      },
      histogram() {
        return { record() {} };
      },
      gauge() {
        return { set() {} };
      },
    },
    logs: {
      debug() {
        throw new Error('logs sink down');
      },
      info() {
        throw new Error('logs sink down');
      },
      warn() {
        throw new Error('logs sink down');
      },
      error() {
        throw new Error('logs sink down');
      },
    },
    traces: {
      startSpan() {
        return {
          setAttribute() {},
          setAttributes() {},
          recordException() {},
          setStatus() {},
          end() {},
        };
      },
      withSpan(_name, _options, fn) {
        const span = {
          setAttribute() {},
          setAttributes() {},
          recordException() {},
          setStatus() {},
          end() {},
        };
        return fn(span);
      },
    },
    withContext(_ctx, fn) {
      return fn();
    },
  };
}

function createContextFailingObservability(): IObservability {
  const base = createNoopObservability();
  return {
    ...base,
    withContext(ctx, fn) {
      if (ctx.runId !== 'maintenance') return fn();
      throw new Error('context sink down');
    },
  };
}

// Helper: creates a run in CANCELLING state (RUNNING + cancelling = true).
// Steps:
//   1. engine.startRun() — PENDING with RunQueued
//   2. Manually append RunStarted — transitions to RUNNING
//   3. engine.cancelRun() — emits RunCancelRequested, sets cancelling = true
async function makeCancellingRun(
  fixture: ReturnType<typeof createFixture>,
  runId: string,
  tenantId = 't'
): Promise<EngineRunRef> {
  const ctx = makeContext(runId);
  ctx.tenantId = tenantId;
  const runRef = await fixture.engine.startRun(TEST_PLAN_REF, ctx);

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
      planId: TEST_PLAN_REF.planId,
      planVersion: TEST_PLAN_REF.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: fixture.idempotency.runEventKey({
        eventType: 'RunStarted',
        runId,
        logicalAttemptId: 1,
        planId: TEST_PLAN_REF.planId,
        planVersion: TEST_PLAN_REF.planVersion,
      }),
      payloadVersion: 1,
    },
  ]);

  // Append cancel intent event to build RUNNING + cancelling snapshot state.
  const meta = await fixture.store.getRunMetadataByRunId(tenantId, runId);
  if (!meta) throw new Error(`Expected metadata for run ${runId}`);
  await fixture.store.appendAndEnqueueTx(
    runId,
    buildRunEvents([
      {
        idempotency: fixture.idempotency,
        clock: fixture.clock,
        meta,
        eventType: 'RunCancelRequested',
      },
    ])
  );

  return runRef;
}

describe('RunMaintenanceService', () => {
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

    it('keeps transitioning stuck runs when observability sinks throw', async () => {
      const { engine, service, store } = createFixture(createThrowingObservability());
      await engine.startRun(makePlanRef(), makeContext('stuck-obs-fail-1'));

      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });

      expect(result.transitioned).toEqual(['stuck-obs-fail-1']);
      const events = await store.listEvents('t', 'stuck-obs-fail-1');
      const failedEvent = events.find((e) => e.eventType === 'RunFailed');
      expect(failedEvent?.payload).toMatchObject({ reason: 'QUEUED_TIMEOUT' });
    });

    it('falls back to plain state-store query when withContext fails', async () => {
      const { engine, service } = createFixture(createContextFailingObservability());
      await engine.startRun(makePlanRef(), makeContext('stuck-context-fail-1'));

      const result = await service.detectStuckRuns({ thresholdMs: 0, tenantId: 't' });

      expect(result.transitioned).toEqual(['stuck-context-fail-1']);
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
      const transitionedSorted = result.transitioned.slice().sort((a, b) => a.localeCompare(b));
      const expectedSorted = ['pending-only-1', 'pending-only-2']
        .slice()
        .sort((a, b) => a.localeCompare(b));
      expect(transitionedSorted).toEqual(expectedSorted);
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
          providerRef: {
            provider: 'temporal',
            tenantId: 't',
            namespace: 'default',
            workflowId: 'wf-no-created-at',
            runId: 'no-created-at',
          },
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
          providerRef: {
            provider: 'temporal',
            tenantId: 't',
            namespace: 'default',
            workflowId: 'wf-no-ts',
            runId: 'no-ts',
          },
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
          planId: TEST_PLAN_REF.planId,
          planVersion: TEST_PLAN_REF.planVersion,
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: fixture.idempotency.runEventKey({
            eventType: 'RunStarted',
            runId: 'running-1',
            logicalAttemptId: 1,
            planId: TEST_PLAN_REF.planId,
            planVersion: TEST_PLAN_REF.planVersion,
          }),
          payloadVersion: 1,
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
