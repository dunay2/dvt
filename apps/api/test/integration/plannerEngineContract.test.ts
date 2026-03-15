import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type { PlanRef, RunContext } from '@dvt/contracts';
import {
  AllowAllAuthorizer,
  IdempotencyKeyBuilder,
  PlanRefPolicy,
  RunAccessPolicy,
  SequenceClock,
  SnapshotProjector,
  WorkflowEngine,
  type ExecutionPlan,
  type RunEventInput,
} from '@dvt/engine';
import { InMemoryStartRunIntentStore, InMemoryTxStore, MockAdapter } from '@dvt/engine/testing';
import type { IObservability } from '@dvt/observability';
import observabilityPkg from '@dvt/observability';
import { Planner, type ExecutionPlanV2 } from '@dvt/planner';

function plannerOutputToEnginePlan(plannerPlan: ExecutionPlanV2): ExecutionPlan {
  return {
    metadata: {
      planId: plannerPlan.metadata.planId,
      planVersion: plannerPlan.metadata.planVersion,
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
      inputHashSha256: plannerPlan.metadata.inputHashSha256,
    },
    steps: plannerPlan.steps.map((step) => ({
      stepId: step.stepId,
      kind: step.kind,
      dependsOn: [...step.dependsOn],
    })),
  };
}

function utf8(value: string): Uint8Array {
  return Buffer.from(value, 'utf8');
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
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

interface EngineTestStack {
  engine: WorkflowEngine;
  store: InMemoryTxStore;
  clock: SequenceClock;
  idempotency: IdempotencyKeyBuilder;
}

function createStack(enginePlan: ExecutionPlan): EngineTestStack {
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const clock = new SequenceClock('2026-03-01T00:00:00.000Z');
  const { createNoopObservability } = observabilityPkg as {
    createNoopObservability: () => IObservability;
  };

  const mockAdapter = new MockAdapter({
    stateStore: store,
    projector,
    planFetcher: { fetch: async () => enginePlan },
  });

  const engine = new WorkflowEngine({
    stateStore: store,
    projector,
    idempotency,
    clock,
    policy: new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
    }),
    intentStore: new InMemoryStartRunIntentStore(),
    observability: createNoopObservability(),
    adapters: new Map([['mock', mockAdapter]]),
  });

  return { engine, store, clock, idempotency };
}

function makeRunEvent(
  idempotency: IdempotencyKeyBuilder,
  clock: SequenceClock,
  meta: { runId: string; planId: string; planVersion: string },
  eventType: 'RunStarted' | 'RunCompleted' | 'RunFailed'
): RunEventInput {
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

function makeStepEvent(
  idempotency: IdempotencyKeyBuilder,
  clock: SequenceClock,
  meta: { runId: string; planId: string; planVersion: string },
  stepId: string,
  eventType: 'StepStarted' | 'StepCompleted' | 'StepFailed'
): RunEventInput {
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

await test('planner -> engine: full lifecycle with 3-step DAG', async () => {
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

  assert.match(plannerPlan.metadata.planId, /^[a-f0-9]{64}$/);
  assert.equal(plannerPlan.metadata.planVersion, '2.3');
  assert.equal(plannerPlan.steps.length, 3);

  const stepIds = plannerPlan.steps.map((step) => step.stepId);
  const indexOf = (stepId: string): number => stepIds.indexOf(stepId);
  assert.ok(indexOf('staging.orders') < indexOf('mart.revenue'));
  assert.ok(indexOf('mart.revenue') < indexOf('test.revenue_not_null'));

  const enginePlan = plannerOutputToEnginePlan(plannerPlan);
  assert.equal(enginePlan.metadata.schemaVersion, 'v1.2');
  assert.equal(enginePlan.metadata.contractVersion, '1.0.0');
  assert.equal(enginePlan.metadata.planId, plannerPlan.metadata.planId);

  const planRef = makePlanRefFromEnginePlan(
    'https://plans.example.com/revenue-dag.json',
    enginePlan
  );
  const runId = 'integration-run-1';
  const runContext = makeRunContext(runId);

  const { engine, store, clock, idempotency } = createStack(enginePlan);
  const runRef = await engine.startRun(planRef, runContext);

  const afterStart = await engine.getRunStatus(runRef);
  assert.equal(afterStart.status, 'PENDING');

  const initialEvents = await store.listEvents('test-tenant', runId);
  assert.equal(initialEvents.length, 1);
  assert.equal(initialEvents[0]?.eventType, 'RunQueued');

  const eventMeta = {
    runId,
    planId: enginePlan.metadata.planId,
    planVersion: enginePlan.metadata.planVersion,
  };

  await store.appendAndEnqueueTx(runId, [
    makeRunEvent(idempotency, clock, eventMeta, 'RunStarted'),
  ]);

  const afterRunStarted = await engine.getRunStatus(runRef);
  assert.equal(afterRunStarted.status, 'RUNNING');

  for (const step of plannerPlan.steps) {
    await store.appendAndEnqueueTx(runId, [
      makeStepEvent(idempotency, clock, eventMeta, step.stepId, 'StepStarted'),
    ]);
    await store.appendAndEnqueueTx(runId, [
      makeStepEvent(idempotency, clock, eventMeta, step.stepId, 'StepCompleted'),
    ]);
  }

  await store.appendAndEnqueueTx(runId, [
    makeRunEvent(idempotency, clock, eventMeta, 'RunCompleted'),
  ]);

  const finalSnapshot = await engine.getRunStatus(runRef);
  assert.equal(finalSnapshot.status, 'COMPLETED');
  assert.match(finalSnapshot.hash, /^[a-f0-9]{64}$/);

  const persistedSnapshot = await store.getSnapshot('test-tenant', runId);
  assert.ok(persistedSnapshot);
  assert.equal(persistedSnapshot.status, 'COMPLETED');

  for (const step of plannerPlan.steps) {
    assert.equal(persistedSnapshot.steps[step.stepId]?.status, 'COMPLETED');
    assert.equal(persistedSnapshot.steps[step.stepId]?.attempts, 1);
  }

  const allEvents = await store.listEvents('test-tenant', runId);
  assert.equal(allEvents.length, 9);
});

await test('planner planId is deterministic for identical input', async () => {
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

  assert.equal(plan1.metadata.planId, plan2.metadata.planId);
  assert.equal(plan1.metadata.inputHashSha256, plan2.metadata.inputHashSha256);
});

await test('planner step fields remain compatible with engine step consumption', async () => {
  const planner = new Planner();
  const { plan } = await planner.buildPlan({
    nodes: [
      { nodeId: 'step-a', resourceType: 'model', dependsOn: [] },
      { nodeId: 'step-b', resourceType: 'test', dependsOn: ['step-a'] },
    ],
    selection: { selectedNodeIds: ['step-b'], includeUpstream: true },
  });

  for (const step of plan.steps) {
    assert.equal(typeof step.stepId, 'string');
    assert.equal(typeof step.kind, 'string');
    assert.equal(Array.isArray(step.dependsOn), true);
    for (const dependency of step.dependsOn) {
      assert.equal(typeof dependency, 'string');
    }
  }

  const enginePlan = plannerOutputToEnginePlan(plan);
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const mock = new MockAdapter({
    stateStore: store,
    projector,
    planFetcher: { fetch: async () => enginePlan },
  });

  const planRef = makePlanRefFromEnginePlan('https://example.com/plan.json', enginePlan);
  const runRef = await mock.startRun(planRef, makeRunContext('compat-run'));
  assert.equal(runRef.provider, 'mock');
});

await test('bridge preserves planner planId and step order', async () => {
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

  assert.equal(enginePlan.metadata.planId, plannerPlan.metadata.planId);
  assert.equal(enginePlan.steps.length, plannerPlan.steps.length);

  for (let index = 0; index < plannerPlan.steps.length; index += 1) {
    assert.equal(enginePlan.steps[index]?.stepId, plannerPlan.steps[index]?.stepId);
    assert.equal(enginePlan.steps[index]?.kind, plannerPlan.steps[index]?.kind);
  }
});

await test('planner output still documents current schema drift against engine metadata', async () => {
  const planner = new Planner();
  const { plan } = await planner.buildPlan({
    nodes: [{ nodeId: 'solo', resourceType: 'model', dependsOn: [] }],
    selection: { selectedNodeIds: ['solo'] },
  });

  const metadata = plan.metadata as Record<string, unknown>;
  assert.equal(metadata['schemaVersion'], undefined);
  assert.equal(metadata['contractVersion'], undefined);
  assert.notEqual(metadata['planId'], undefined);
  assert.notEqual(metadata['planVersion'], undefined);
  assert.notEqual(metadata['inputHashSha256'], undefined);
  assert.notEqual(metadata['createdAtIso'], undefined);
});
