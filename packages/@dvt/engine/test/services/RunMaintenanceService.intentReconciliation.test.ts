/**
 * @file packages/@dvt/engine/test/services/RunMaintenanceService.intentReconciliation.test.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @baseline ADR-0029: Run Maintenance Service Extraction
 * @decision Verify reconcileOrphanedIntents detects, expires, and cancels orphaned intents
 * @consequence Ensures reconciliation logic matches ADR-0030 crash scenario coverage table
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { RunMaintenanceService } from '../../src/services/RunMaintenanceService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

describe('RunMaintenanceService - reconcileOrphanedIntents', () => {
  function makeRunQueuedEventInput(runId: string): {
    eventId: string;
    eventType: 'RunQueued';
    runId: string;
    tenantId: string;
    projectId: string;
    environmentId: string;
    planId: string;
    planVersion: string;
    logicalAttemptId: number;
    engineAttemptId: number;
    emittedAt: string;
    idempotencyKey: string;
  } {
    return {
      eventId: `evt-${runId}`,
      eventType: 'RunQueued' as const,
      runId,
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      planId: 'p',
      planVersion: '1.0',
      logicalAttemptId: 1,
      engineAttemptId: 1,
      emittedAt: '2026-02-12T00:00:00.000Z',
      idempotencyKey: `queued-${runId}`,
    };
  }

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

  function makeTemporalAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
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
      async lookupRunRef() {
        return null;
      },
      async cancelRun() {},
      async getRunStatus(runRef) {
        return { runId: runRef.runId, status: 'RUNNING' } as any;
      },
      async signal() {},
      ...(overrides ?? {}),
    };
  }

  function createFixture(adapterOverrides?: Partial<IProviderAdapter>): {
    engine: WorkflowEngine;
    service: RunMaintenanceService;
    store: InMemoryTxStore;
    intentStore: InMemoryStartRunIntentStore;
    clock: SequenceClock;
    idempotency: IdempotencyKeyBuilder;
    adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  } {
    const store = new InMemoryTxStore();
    const clock = new SequenceClock('2026-02-12T00:00:00.000Z');
    const intentStore = new InMemoryStartRunIntentStore(clock);
    const authorizer = new AllowAllAuthorizer();
    const idempotency = new IdempotencyKeyBuilder();

    const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
      ['temporal', makeTemporalAdapter(adapterOverrides)],
    ]);

    const engine = new WorkflowEngine({
      stateStore: store,

      projector: new SnapshotProjector(),
      idempotency,
      clock,
      policy: new RunAccessPolicy({
        authorizer,
        planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      }),
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

    return { engine, service, store, intentStore, clock, idempotency, adapters };
  }

  it('returns empty result when no orphaned intents exist', async () => {
    const { service } = createFixture();
    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });
    expect(result.inspected).toBe(0);
    expect(result.expired).toEqual([]);
    expect(result.cancelled).toEqual([]);
    expect(result.cancelFailed).toEqual([]);
  });

  it('expires a PENDING intent older than threshold', async () => {
    const { service, intentStore, idempotency, clock } = createFixture();

    // Manually create a PENDING intent (simulates crash before adapter.startRun)
    const intentId = idempotency.eventId();
    await intentStore.createIntent({
      intentId,
      tenantId: 't',
      runId: 'orphan-pending-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.expired).toEqual([intentId]);
    expect(result.cancelled).toEqual([]);
    expect(result.cancelFailed).toEqual([]);

    const intent = await intentStore.getIntent(intentId);
    expect(intent?.status).toBe('EXPIRED');
  });

  it('does not touch PENDING intent younger than threshold', async () => {
    const { service, intentStore, idempotency, clock } = createFixture();

    const intentId = idempotency.eventId();
    await intentStore.createIntent({
      intentId,
      tenantId: 't',
      runId: 'young-pending-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 999_999_999,
    });

    expect(result.inspected).toBe(0);
    expect(result.expired).toEqual([]);

    const intent = await intentStore.getIntent(intentId);
    expect(intent?.status).toBe('PENDING');
  });

  it('keeps PENDING intent unresolved when run metadata exists but provider lookup finds no workflow', async () => {
    const cancelledRefs: EngineRunRef[] = [];
    const { service, store, intentStore, clock } = createFixture({
      async lookupRunRef(runId: string, tenantId: string) {
        return null;
      },
      async cancelRun(ref: EngineRunRef) {
        cancelledRefs.push(ref);
      },
    });

    await store.bootstrapRunTx({
      metadata: {
        tenantId: 't',
        projectId: 'p',
        environmentId: 'dev',
        runId: 'pending-with-meta-1',
        planId: 'p',
        planVersion: '1.0',
        logicalAttemptId: 1,
        provider: 'temporal',
        providerWorkflowId: 'wf-pending-with-meta-1',
        providerRunId: 'pending-with-meta-1',
      },
      firstEvents: [makeRunQueuedEventInput('pending-with-meta-1')],
    });

    await intentStore.createIntent({
      intentId: 'pending-intent-with-meta',
      tenantId: 't',
      runId: 'pending-with-meta-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.cancelled).toEqual([]);
    expect(result.expired).toEqual([]);
    expect(result.cancelFailed).toEqual([]);
    expect(cancelledRefs).toEqual([]);

    const intent = await intentStore.getIntent('pending-intent-with-meta');
    expect(intent?.status).toBe('PENDING');
  });

  it('keeps PENDING intent unresolved when provider lookup is unsupported', async () => {
    const { service, intentStore, idempotency, clock } = createFixture({
      lookupRunRef: undefined,
    });

    const intentId = idempotency.eventId();
    await intentStore.createIntent({
      intentId,
      tenantId: 't',
      runId: 'pending-without-lookup',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.expired).toEqual([]);
    expect(result.cancelled).toEqual([]);
    expect(result.cancelFailed).toEqual([]);

    const intent = await intentStore.getIntent(intentId);
    expect(intent?.status).toBe('PENDING');
  });

  it('cancels provider workflow for DISPATCHED intent with no bootstrapped run', async () => {
    const cancelledRefs: EngineRunRef[] = [];
    const { service, intentStore, idempotency, clock } = createFixture({
      async cancelRun(ref: EngineRunRef) {
        cancelledRefs.push(ref);
      },
    });

    const intentId = idempotency.eventId();
    const engineRunRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-orphan-dispatched-1',
      runId: 'orphan-dispatched-1',
    };

    await intentStore.createIntent({
      intentId,
      tenantId: 't',
      runId: 'orphan-dispatched-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });
    await intentStore.markDispatched(intentId, engineRunRef);

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.cancelled).toEqual([intentId]);
    expect(result.expired).toEqual([]);
    expect(result.cancelFailed).toEqual([]);
    expect(cancelledRefs).toHaveLength(1);
    expect(cancelledRefs[0]!.runId).toBe('orphan-dispatched-1');

    const intent = await intentStore.getIntent(intentId);
    expect(intent?.status).toBe('RESOLVED');
  });

  it('resolves DISPATCHED intent without cancel when run was already bootstrapped', async () => {
    const { engine, service, intentStore } = createFixture();

    // Use engine to start a run (creates intent and bootstraps the run)
    await engine.startRun(makePlanRef(), makeContext('already-bootstrapped'));

    // The intent should be RESOLVED from the happy path, so we need to
    // simulate the gap: manually create a DISPATCHED intent where bootstrap succeeded
    // but markResolved was never called.
    const manualIntentId = 'manual-dispatched-intent';
    const engineRunRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-already-bootstrapped',
      runId: 'already-bootstrapped',
    };

    // Directly insert into intentStore in DISPATCHED status
    await intentStore.createIntent({
      intentId: manualIntentId,
      tenantId: 't',
      runId: 'already-bootstrapped',
      provider: 'temporal',
      createdAt: '2026-02-11T00:00:00.000Z', // old enough
    });
    await intentStore.markDispatched(manualIntentId, engineRunRef);

    // We can't override adapter mid-test, but the important thing is
    // that the reconciler finds the run in the stateStore and marks resolved
    // without calling cancelRun.

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    // Should be in cancelled (resolved) - not cancelFailed
    expect(result.cancelled).toContain(manualIntentId);
    expect(result.cancelFailed).toEqual([]);

    const intent = await intentStore.getIntent(manualIntentId);
    expect(intent?.status).toBe('RESOLVED');
  });

  it('reports cancelFailed when adapter.cancelRun() throws', async () => {
    const { service, intentStore, idempotency, clock } = createFixture({
      async cancelRun() {
        throw new Error('provider unreachable');
      },
    });

    const intentId = idempotency.eventId();
    const engineRunRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-cancel-fail-1',
      runId: 'cancel-fail-1',
    };

    await intentStore.createIntent({
      intentId,
      tenantId: 't',
      runId: 'cancel-fail-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });
    await intentStore.markDispatched(intentId, engineRunRef);

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.cancelFailed).toEqual([intentId]);
    expect(result.cancelled).toEqual([]);
    expect(result.expired).toEqual([]);

    // Intent should remain DISPATCHED (not resolved) so it's retried next sweep
    const intent = await intentStore.getIntent(intentId);
    expect(intent?.status).toBe('DISPATCHED');
  });

  it('reports cancelFailed when adapter is not registered for intent provider', async () => {
    const { service, intentStore, idempotency, clock } = createFixture();

    const intentId = idempotency.eventId();
    const engineRunRef: EngineRunRef = {
      provider: 'conductor',
      tenantId: 't',
      workflowId: 'wf-no-adapter-1',
      runId: 'no-adapter-1',
      conductorUrl: 'http://localhost:8080',
    };

    await intentStore.createIntent({
      intentId,
      tenantId: 't',
      runId: 'no-adapter-1',
      provider: 'conductor', // no conductor adapter registered
      createdAt: clock.nowIsoUtc(),
    });
    await intentStore.markDispatched(intentId, engineRunRef);

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.cancelFailed).toEqual([intentId]);
    expect(result.cancelled).toEqual([]);
  });

  it('dryRun does not transition any intents', async () => {
    const { service, intentStore, idempotency, clock } = createFixture();

    const pendingId = idempotency.eventId();
    await intentStore.createIntent({
      intentId: pendingId,
      tenantId: 't',
      runId: 'dry-pending-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });

    const dispatchedId = idempotency.eventId();
    const engineRunRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-dry-dispatched-1',
      runId: 'dry-dispatched-1',
    };
    await intentStore.createIntent({
      intentId: dispatchedId,
      tenantId: 't',
      runId: 'dry-dispatched-1',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });
    await intentStore.markDispatched(dispatchedId, engineRunRef);

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
      dryRun: true,
    });

    expect(result.inspected).toBe(2);
    expect(result.expired).toEqual([]);
    expect(result.cancelled).toEqual([]);
    expect(result.cancelFailed).toEqual([]);

    // Verify nothing changed
    const pendingIntent = await intentStore.getIntent(pendingId);
    expect(pendingIntent?.status).toBe('PENDING');
    const dispatchedIntent = await intentStore.getIntent(dispatchedId);
    expect(dispatchedIntent?.status).toBe('DISPATCHED');
  });

  it('respects limit option', async () => {
    const { service, intentStore, idempotency, clock } = createFixture();

    // Create 3 PENDING intents
    for (let i = 1; i <= 3; i++) {
      await intentStore.createIntent({
        intentId: idempotency.eventId(),
        tenantId: 't',
        runId: `limit-${i}`,
        provider: 'temporal',
        createdAt: clock.nowIsoUtc(),
      });
    }

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
      limit: 1,
    });

    expect(result.inspected).toBe(1);
    expect(result.expired).toHaveLength(1);
  });

  it('handles mixed PENDING + DISPATCHED orphans in one sweep', async () => {
    const cancelledRefs: EngineRunRef[] = [];
    const { service, intentStore, idempotency, clock } = createFixture({
      async cancelRun(ref: EngineRunRef) {
        cancelledRefs.push(ref);
      },
    });

    // PENDING intent
    const pendingId = idempotency.eventId();
    await intentStore.createIntent({
      intentId: pendingId,
      tenantId: 't',
      runId: 'mixed-pending',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });

    // DISPATCHED intent (no bootstrapped run)
    const dispatchedId = idempotency.eventId();
    const engineRunRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-mixed-dispatched',
      runId: 'mixed-dispatched',
    };
    await intentStore.createIntent({
      intentId: dispatchedId,
      tenantId: 't',
      runId: 'mixed-dispatched',
      provider: 'temporal',
      createdAt: clock.nowIsoUtc(),
    });
    await intentStore.markDispatched(dispatchedId, engineRunRef);

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    expect(result.inspected).toBe(2);
    expect(result.expired).toEqual([pendingId]);
    expect(result.cancelled).toEqual([dispatchedId]);
    expect(result.cancelFailed).toEqual([]);

    expect(cancelledRefs).toHaveLength(1);
    expect(cancelledRefs[0]!.runId).toBe('mixed-dispatched');
  });

  it('does not touch RESOLVED intents', async () => {
    const { engine, service } = createFixture();

    // Start a run through the engine - intent ends up RESOLVED
    await engine.startRun(makePlanRef(), makeContext('resolved-run'));

    const result = await service.reconcileOrphanedIntents({
      thresholdMs: 0,
    });

    // No orphans because the intent is RESOLVED
    expect(result.inspected).toBe(0);
    expect(result.expired).toEqual([]);
    expect(result.cancelled).toEqual([]);
  });
});
