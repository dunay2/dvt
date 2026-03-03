/**
 * @file packages/@dvt/engine/test/contracts/planner-engine-contract.test.ts
 *
 * Cross-package integration test: Planner → Engine → MockAdapter → Snapshot.
 *
 * This test is the only reliable way to detect schema drift between planner
 * output (ExecutionPlanV2) and engine consumption (ExecutionPlan). It should
 * run in CI on every @dvt/contracts or @dvt/planner change.
 *
 * Flow:
 *   1. Build a plan via @dvt/planner (Planner.buildPlan)
 *   2. Bridge planner output to engine-consumable shape (explicit adapter fn)
 *   3. Construct a PlanRef from the bridged plan
 *   4. Start a run via WorkflowEngine + MockAdapter
 *   5. Manually emit lifecycle events (RunStarted, Step*, RunCompleted)
 *   6. Assert final snapshot matches expected state
 *
 * The bridge function (plannerOutputToEnginePlan) documents the current
 * structural gap between planner and engine types. ADR-0028 tracks the
 * unification that will eliminate this bridge.
 */
import { createNoopObservability } from '@dvt/observability';
import { Planner } from '@dvt/planner';
import type { ExecutionPlanV2 } from '@dvt/planner';
import { describe, expect, it } from 'vitest';

import { MockAdapter } from '../../src/adapters/mock/MockAdapter.js';
import type { ExecutionPlan } from '../../src/contracts/executionPlan.js';
import type { EngineRunRef, PlanRef, RunContext } from '../../src/contracts/types.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { sha256Hex } from '../../src/utils/sha256.js';

import { utf8 } from './helpers.js';

// ---------------------------------------------------------------------------
// Bridge: PlannerV2 output → Engine ExecutionPlan
// ---------------------------------------------------------------------------

/**
 * Adapts @dvt/planner output to @dvt/engine's ExecutionPlan consumption type.
 *
 * This function exists because the two types are structurally divergent today:
 *
 *   - Planner emits `createdAtIso` but not `schemaVersion` or `contractVersion`
 *   - Engine requires `schemaVersion` and `contractVersion` but not `createdAtIso`
 *   - Planner steps have `kind` and `dependsOn` as required; engine has them optional
 *   - MockAdapter rejects step fields beyond { stepId, kind, dependsOn }
 *
 * ADR-0028 tracks the unification that will eliminate this bridge.
 * When ADR-0028 is implemented this function should be replaced with a
 * direct type assertion.
 */
function plannerOutputToEnginePlan(plannerPlan: ExecutionPlanV2): ExecutionPlan {
  return {
    metadata: {
      planId: plannerPlan.metadata.planId,
      planVersion: plannerPlan.metadata.planVersion,
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
      inputHashSha256: plannerPlan.metadata.inputHashSha256,
    },
    steps: plannerPlan.steps.map((s) => ({
      stepId: s.stepId,
      kind: s.kind,
      dependsOn: [...s.dependsOn],
    })),
  };
}

function makePlanRefFromEnginePlan(uri: string, plan: ExecutionPlan): PlanRef {
  const bytes = utf8(JSON.stringify(plan));
  return {
    uri,
    sha256: sha256Hex(bytes),
    schemaVersion: plan.metadata.schemaVersion,
    planId: plan.metadata.planId,
    planVersion: plan.metadata.planVersion,
    sizeBytes: bytes.byteLength,
  };
}

function makeRunContext(runId: string): RunContext {
  return {
    tenantId: 'test-tenant',
    projectId: 'test-project',
    environmentId: 'dev',
    runId,
    targetAdapter: 'mock',
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Planner → Engine cross-package contract test', () => {
  /**
   * Creates the full infrastructure stack: store, projector, clock,
   * idempotency, MockAdapter, WorkflowEngine.
   */
  function createStack(enginePlan: ExecutionPlan) {
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const idempotency = new IdempotencyKeyBuilder();
    const clock = new SequenceClock('2026-03-01T00:00:00.000Z');

    const mockAdapter = new MockAdapter({
      stateStore: store,
      projector,
      planFetcher: { fetch: async () => enginePlan },
    });

    const engine = new WorkflowEngine({
      stateStore: store,
      outbox: store,
      projector,
      idempotency,
      clock,
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
      adapters: new Map([['mock', mockAdapter]]),
    });

    return { engine, store, clock, idempotency };
  }

  /**
   * Helper: append a run-level event directly to the store.
   * Simulates what an adapter workflow would emit.
   */
  function makeRunEvent(
    idempotency: IdempotencyKeyBuilder,
    clock: SequenceClock,
    meta: { runId: string; planId: string; planVersion: string },
    eventType: 'RunStarted' | 'RunCompleted' | 'RunFailed'
  ) {
    return {
      eventId: idempotency.eventId(),
      eventType,
      emittedAt: clock.nowIsoUtc(),
      tenantId: 'test-tenant',
      projectId: 'test-project',
      environmentId: 'dev',
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      idempotencyKey: idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: 1,
        planId: meta.planId,
        planVersion: meta.planVersion,
      }),
    };
  }

  /**
   * Helper: append a step-level event directly to the store.
   */
  function makeStepEvent(
    idempotency: IdempotencyKeyBuilder,
    clock: SequenceClock,
    meta: { runId: string; planId: string; planVersion: string },
    stepId: string,
    eventType: 'StepStarted' | 'StepCompleted' | 'StepFailed'
  ) {
    return {
      eventId: idempotency.eventId(),
      eventType,
      emittedAt: clock.nowIsoUtc(),
      tenantId: 'test-tenant',
      projectId: 'test-project',
      environmentId: 'dev',
      runId: meta.runId,
      planId: meta.planId,
      planVersion: meta.planVersion,
      engineAttemptId: 1,
      logicalAttemptId: 1,
      stepId,
      idempotencyKey: idempotency.runEventKey({
        eventType,
        runId: meta.runId,
        logicalAttemptId: 1,
        planId: meta.planId,
        planVersion: meta.planVersion,
        stepId,
      }),
    };
  }

  it('planner → engine: full lifecycle with 3-step DAG', async () => {
    // ----------------------------------------------------------------
    // 1. Build plan via @dvt/planner
    // ----------------------------------------------------------------
    const planner = new Planner();
    const { plan: plannerPlan } = await planner.buildPlan({
      nodes: [
        { nodeId: 'staging.orders', resourceType: 'model', dependsOn: [] },
        { nodeId: 'mart.revenue', resourceType: 'model', dependsOn: ['staging.orders'] },
        { nodeId: 'test.revenue_not_null', resourceType: 'test', dependsOn: ['mart.revenue'] },
      ],
      selection: {
        selectedNodeIds: ['test.revenue_not_null'],
        includeUpstream: true,
      },
    });

    // Verify planner output structure
    expect(plannerPlan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
    expect(plannerPlan.metadata.planVersion).toBe('2.3');
    expect(plannerPlan.steps).toHaveLength(3);

    // Verify topological ordering: dependencies come before dependents
    const stepIds = plannerPlan.steps.map((s) => s.stepId);
    const indexOf = (id: string) => stepIds.indexOf(id);
    expect(indexOf('staging.orders')).toBeLessThan(indexOf('mart.revenue'));
    expect(indexOf('mart.revenue')).toBeLessThan(indexOf('test.revenue_not_null'));

    // ----------------------------------------------------------------
    // 2. Bridge planner output → engine plan
    // ----------------------------------------------------------------
    const enginePlan = plannerOutputToEnginePlan(plannerPlan);

    // Verify bridge added required engine fields
    expect(enginePlan.metadata.schemaVersion).toBe('v1.2');
    expect(enginePlan.metadata.contractVersion).toBe('1.0.0');

    // Verify planId preserved across bridge
    expect(enginePlan.metadata.planId).toBe(plannerPlan.metadata.planId);

    // ----------------------------------------------------------------
    // 3. Start run via engine + MockAdapter
    // ----------------------------------------------------------------
    const uri = 'https://plans.example.com/revenue-dag.json';
    const planRef = makePlanRefFromEnginePlan(uri, enginePlan);
    const runId = 'integration-run-1';
    const ctx = makeRunContext(runId);

    const { engine, store, clock, idempotency } = createStack(enginePlan);
    const runRef = await engine.startRun(planRef, ctx);

    // After startRun: engine emitted RunQueued, status is PENDING
    const afterStart = await engine.getRunStatus(runRef);
    expect(afterStart.status).toBe('PENDING');

    const events = await store.listEvents('test-tenant', runId);
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('RunQueued');

    // ----------------------------------------------------------------
    // 4. Simulate adapter lifecycle: RunStarted → Steps → RunCompleted
    // ----------------------------------------------------------------
    const eventMeta = {
      runId,
      planId: enginePlan.metadata.planId,
      planVersion: enginePlan.metadata.planVersion,
    };

    // RunStarted
    await store.appendAndEnqueueTx(runId, [
      makeRunEvent(idempotency, clock, eventMeta, 'RunStarted'),
    ]);

    const afterRunStarted = await engine.getRunStatus(runRef);
    expect(afterRunStarted.status).toBe('RUNNING');

    // Execute steps in topological order
    for (const step of plannerPlan.steps) {
      await store.appendAndEnqueueTx(runId, [
        makeStepEvent(idempotency, clock, eventMeta, step.stepId, 'StepStarted'),
      ]);
      await store.appendAndEnqueueTx(runId, [
        makeStepEvent(idempotency, clock, eventMeta, step.stepId, 'StepCompleted'),
      ]);
    }

    // RunCompleted
    await store.appendAndEnqueueTx(runId, [
      makeRunEvent(idempotency, clock, eventMeta, 'RunCompleted'),
    ]);

    // ----------------------------------------------------------------
    // 5. Assert final snapshot
    // ----------------------------------------------------------------
    const finalSnapshot = await engine.getRunStatus(runRef);

    expect(finalSnapshot.status).toBe('COMPLETED');
    expect(finalSnapshot.hash).toMatch(/^[a-f0-9]{64}$/);

    // Verify all steps completed
    const snap = await store.getSnapshot('test-tenant', runId);
    expect(snap).toBeDefined();
    expect(snap!.status).toBe('COMPLETED');

    for (const step of plannerPlan.steps) {
      expect(snap!.steps[step.stepId]?.status).toBe('COMPLETED');
      expect(snap!.steps[step.stepId]?.attempts).toBe(1);
    }

    // Verify event count: RunQueued + RunStarted + 3*(StepStarted+StepCompleted) + RunCompleted = 9
    const allEvents = await store.listEvents('test-tenant', runId);
    expect(allEvents).toHaveLength(9);
  });

  it('planner planId is deterministic — same input produces same plan', async () => {
    const planner = new Planner();
    const input = {
      nodes: [
        { nodeId: 'a', resourceType: 'model', dependsOn: [] as readonly string[] },
        { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] as readonly string[] },
      ],
      selection: { selectedNodeIds: ['b'], includeUpstream: true },
    };

    const { plan: plan1 } = await planner.buildPlan(input);
    const { plan: plan2 } = await planner.buildPlan(input);

    expect(plan1.metadata.planId).toBe(plan2.metadata.planId);
    expect(plan1.metadata.inputHashSha256).toBe(plan2.metadata.inputHashSha256);
  });

  it('planner step fields are compatible with engine step consumption', async () => {
    const planner = new Planner();
    const { plan } = await planner.buildPlan({
      nodes: [
        { nodeId: 'step-a', resourceType: 'model', dependsOn: [] },
        { nodeId: 'step-b', resourceType: 'test', dependsOn: ['step-a'] },
      ],
      selection: { selectedNodeIds: ['step-b'], includeUpstream: true },
    });

    // Verify planner always emits required fields per normative prose
    for (const step of plan.steps) {
      expect(step.stepId).toBeTypeOf('string');
      expect(step.kind).toBeTypeOf('string');
      expect(Array.isArray(step.dependsOn)).toBe(true);
      // dependsOn values must be strings
      for (const dep of step.dependsOn) {
        expect(dep).toBeTypeOf('string');
      }
    }

    // Bridge and verify MockAdapter accepts the plan
    const enginePlan = plannerOutputToEnginePlan(plan);
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const mock = new MockAdapter({
      stateStore: store,
      projector,
      planFetcher: { fetch: async () => enginePlan },
    });

    const planRef = makePlanRefFromEnginePlan('https://example.com/plan.json', enginePlan);
    const ctx = makeRunContext('compat-run');

    // Should not throw — planner output is compatible after bridge
    const runRef = await mock.startRun(planRef, ctx);
    expect(runRef.provider).toBe('mock');
  });

  it('bridge function preserves planId and step order from planner', async () => {
    const planner = new Planner();
    const { plan: plannerPlan } = await planner.buildPlan({
      nodes: [
        { nodeId: 'x', resourceType: 'model', dependsOn: [] },
        { nodeId: 'y', resourceType: 'model', dependsOn: ['x'] },
        { nodeId: 'z', resourceType: 'model', dependsOn: ['x', 'y'] },
      ],
      selection: { selectedNodeIds: ['z'], includeUpstream: true },
    });

    const enginePlan = plannerOutputToEnginePlan(plannerPlan);

    // planId preserved
    expect(enginePlan.metadata.planId).toBe(plannerPlan.metadata.planId);

    // Step count preserved
    expect(enginePlan.steps).toHaveLength(plannerPlan.steps.length);

    // Step order preserved
    for (let i = 0; i < plannerPlan.steps.length; i++) {
      expect(enginePlan.steps[i]!.stepId).toBe(plannerPlan.steps[i]!.stepId);
      expect(enginePlan.steps[i]!.kind).toBe(plannerPlan.steps[i]!.kind);
    }
  });

  it('documents schema fields the planner does NOT produce (drift detection)', async () => {
    const planner = new Planner();
    const { plan } = await planner.buildPlan({
      nodes: [{ nodeId: 'solo', resourceType: 'model', dependsOn: [] }],
      selection: { selectedNodeIds: ['solo'] },
    });

    // These assertions document the CURRENT drift between planner and engine.
    // When ADR-0028 is implemented, the planner will emit schemaVersion and
    // contractVersion will be retired. Update these assertions accordingly.
    const meta = plan.metadata as Record<string, unknown>;

    // Planner does NOT emit schemaVersion (required by engine)
    expect(meta['schemaVersion']).toBeUndefined();

    // Planner does NOT emit contractVersion (required by engine, to be retired per ADR-0028)
    expect(meta['contractVersion']).toBeUndefined();

    // Planner DOES emit these (required by normative prose)
    expect(meta['planId']).toBeDefined();
    expect(meta['planVersion']).toBeDefined();
    expect(meta['inputHashSha256']).toBeDefined();
    expect(meta['createdAtIso']).toBeDefined();
  });
});
