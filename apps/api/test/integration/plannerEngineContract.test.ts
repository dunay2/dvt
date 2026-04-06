import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  RUN_EVENT_PAYLOAD_VERSION,
  type PlanRef,
  type ResolvedRunContext,
  type RunContext,
} from '@dvt/contracts';
import {
  AllowAllAuthorizer,
  IdempotencyKeyBuilder,
  PlanRefPolicy,
  RunAccessPolicy,
  SequenceClock,
  SnapshotProjector,
  StartRunAdmissionGuard,
  StartRunApplicationService,
  WorkflowEngine,
  WorkflowEngineCoreService,
  type EngineRunRef,
  type ExecutionPlan,
  type IProviderAdapter,
  type RunEventInput,
} from '@dvt/engine';
import { InMemoryStartRunIntentStore, InMemoryTxStore, MockAdapter } from '@dvt/engine/testing';
import { createNoopObservability } from '@dvt/observability';
import { PlannerFacade } from '@dvt/planner';
import { describe, it, expect } from 'vitest';

import { GraphSourceArtifactResolver } from '../../src/infrastructure/planner/ManifestArtifactResolver.js';

const PLANNER_MANIFEST_FIXTURE_URL = new URL(
  '../fixtures/planner/basic-manifest.json',
  import.meta.url
);

function plannerOutputToEnginePlan(plannerPlan: {
  metadata: {
    planId: string;
    planVersion: '1.0';
    inputHashSha256: string;
    createdAtIso: string;
  };
  steps: ExecutionPlan['steps'];
}): ExecutionPlan {
  return {
    metadata: {
      planId: plannerPlan.metadata.planId,
      planVersion: plannerPlan.metadata.planVersion,
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
      inputHashSha256: plannerPlan.metadata.inputHashSha256,
      createdAtIso: plannerPlan.metadata.createdAtIso,
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

function makeResolvedRunContext(runId: string): ResolvedRunContext {
  return {
    ...makeRunContext(runId),
    logicalAttemptId: 1,
    originRunId: runId,
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

  const mockAdapter = new MockAdapter({
    stateStore: store,
    stateStoreWrite: store,
    clock,
    projector,
    planFetcher: { fetch: async () => enginePlan },
  });
  const policy = new RunAccessPolicy({
    authorizer: new AllowAllAuthorizer(),
    planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
  });
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([['mock', mockAdapter]]);

  const engine = new WorkflowEngine({
    startRunApplicationService: new StartRunApplicationService({
      policy,
      guard: new StartRunAdmissionGuard({
        policy,
        stateStoreRead: store,
        adapters,
      }),
      stateStoreRead: store,
      stateStoreWrite: store,
      idempotency,
      clock,
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
    }),
    core: new WorkflowEngineCoreService({
      stateStoreRead: store,
      stateStoreWrite: store,
      projector,
      idempotency,
      policy,
      adapters,
      observability: createNoopObservability(),
      clock,
    }),
    stateStoreRead: store,
    stateStoreWrite: store,
    projector,
    idempotency,
    clock,
    observability: createNoopObservability(),
    adapters,
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
    payloadVersion: RUN_EVENT_PAYLOAD_VERSION,
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
    payloadVersion: RUN_EVENT_PAYLOAD_VERSION,
  };
}

describe('planner -> engine contract', () => {
  it('PlannerFacade resolves manifestRef through the real API artifact resolver', async () => {
    const planner = new PlannerFacade({
      graphSourceResolver: new GraphSourceArtifactResolver({ nodeEnv: 'test' }),
    });
    const bytes = readFileSync(PLANNER_MANIFEST_FIXTURE_URL);

    const { plan } = await planner.buildPlan({
      manifestRef: {
        uri: PLANNER_MANIFEST_FIXTURE_URL.href,
        sha256: sha256Hex(bytes),
      },
      selection: {
        selectedNodeIds: ['model.analytics.order_items'],
        includeUpstream: true,
      },
    });

    expect(plan.steps.map((step) => step.stepId)).toEqual([
      'model.analytics.orders',
      'model.analytics.order_items',
    ]);
  });

  it('full lifecycle with 3-step DAG', async () => {
    const planner = new PlannerFacade();
    const { plan: plannerPlan } = await planner.buildPlan({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [
          { nodeId: 'staging.orders', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'mart.revenue', stepKind: 'DBT_MODEL', dependsOn: ['staging.orders'] },
          {
            nodeId: 'test.revenue_not_null',
            stepKind: 'DBT_TEST',
            dependsOn: ['mart.revenue'],
          },
        ],
      },
      selection: {
        selectedNodeIds: ['test.revenue_not_null'],
        includeUpstream: true,
      },
    });

    expect(plannerPlan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
    expect(plannerPlan.metadata.planVersion).toBe('1.0');
    expect(plannerPlan.steps.length).toBe(3);

    const stepIds = plannerPlan.steps.map((step) => step.stepId);
    const indexOf = (stepId: string): number => stepIds.indexOf(stepId);
    expect(indexOf('staging.orders') < indexOf('mart.revenue')).toBe(true);
    expect(indexOf('mart.revenue') < indexOf('test.revenue_not_null')).toBe(true);

    const enginePlan = plannerOutputToEnginePlan(plannerPlan);
    expect(enginePlan.metadata.schemaVersion).toBe('v1.2');
    expect(enginePlan.metadata.contractVersion).toBe('1.0.0');
    expect(enginePlan.metadata.planId).toBe(plannerPlan.metadata.planId);

    const planRef = makePlanRefFromEnginePlan(
      'https://plans.example.com/revenue-dag.json',
      enginePlan
    );
    const runId = 'integration-run-1';
    const runContext = makeRunContext(runId);

    const { engine, store, clock, idempotency } = createStack(enginePlan);
    const runRef = await engine.startRun(planRef, runContext);

    const afterStart = await engine.getRunStatus(runRef);
    expect(afterStart.status).toBe('PENDING');

    const initialEvents = await store.listEvents('test-tenant', runId);
    expect(initialEvents.length).toBe(1);
    expect(initialEvents[0]?.eventType).toBe('RunQueued');

    const eventMeta = {
      runId,
      planId: enginePlan.metadata.planId,
      planVersion: enginePlan.metadata.planVersion,
    };

    await store.appendAndEnqueueTx(runId, [
      makeRunEvent(idempotency, clock, eventMeta, 'RunStarted'),
    ]);

    const afterRunStarted = await engine.getRunStatus(runRef);
    expect(afterRunStarted.status).toBe('RUNNING');

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
    expect(finalSnapshot.status).toBe('COMPLETED');
    expect(finalSnapshot.hash).toMatch(/^[a-f0-9]{64}$/);

    const persistedSnapshot = await store.getSnapshot('test-tenant', runId);
    expect(persistedSnapshot).toBeTruthy();
    expect(persistedSnapshot!.status).toBe('COMPLETED');

    for (const step of plannerPlan.steps) {
      expect(persistedSnapshot!.steps[step.stepId]?.status).toBe('COMPLETED');
      expect(persistedSnapshot!.steps[step.stepId]?.attempts).toBe(1);
    }

    const allEvents = await store.listEvents('test-tenant', runId);
    expect(allEvents.length).toBe(9);
  });

  it('planner planId is deterministic for identical input', async () => {
    const planner = new PlannerFacade();
    const input = {
      graphSource: {
        kind: 'generic-graph-v1' as const,
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [
          { nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: [] as readonly string[] },
          { nodeId: 'b', stepKind: 'DBT_MODEL', dependsOn: ['a'] as readonly string[] },
        ],
      },
      selection: { selectedNodeIds: ['b'], includeUpstream: true },
    };

    const { plan: plan1 } = await planner.buildPlan(input);
    const { plan: plan2 } = await planner.buildPlan(input);

    expect(plan1.metadata.planId).toBe(plan2.metadata.planId);
    expect(plan1.metadata.inputHashSha256).toBe(plan2.metadata.inputHashSha256);
  });

  it('planner plan identity is stable for provenance-only graphSource changes', async () => {
    const planner = new PlannerFacade();

    const baseNodes = [{ nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: [] as readonly string[] }];

    const { plan: first } = await planner.buildPlan({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: baseNodes,
      },
      selection: { selectedNodeIds: ['a'] },
    });

    const { plan: second } = await planner.buildPlan({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'imported',
        sourceVersion: '2026-04-06',
        nodes: [
          {
            nodeId: 'a',
            stepKind: 'DBT_MODEL',
            dependsOn: [],
            metadata: { displayName: 'Only metadata changed', sourceRef: 'src://different' },
          },
        ],
      },
      selection: { selectedNodeIds: ['a'] },
    });

    expect(first.metadata.planId).toBe(second.metadata.planId);
    expect(first.metadata.inputHashSha256).toBe(second.metadata.inputHashSha256);
  });

  it('planner step fields remain compatible with engine step consumption', async () => {
    const planner = new PlannerFacade();
    const { plan } = await planner.buildPlan({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [
          { nodeId: 'step-a', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'step-b', stepKind: 'DBT_TEST', dependsOn: ['step-a'] },
        ],
      },
      selection: { selectedNodeIds: ['step-b'], includeUpstream: true },
    });

    for (const step of plan.steps) {
      expect(typeof step.stepId).toBe('string');
      expect(typeof step.kind).toBe('string');
      expect(Array.isArray(step.dependsOn)).toBe(true);
      for (const dependency of step.dependsOn) {
        expect(typeof dependency).toBe('string');
      }
    }

    const enginePlan = plannerOutputToEnginePlan(plan);
    const store = new InMemoryTxStore();
    const projector = new SnapshotProjector();
    const clock = new SequenceClock('2026-03-01T00:00:00.000Z');
    const mock = new MockAdapter({
      stateStore: store,
      stateStoreWrite: store,
      clock,
      projector,
      planFetcher: { fetch: async () => enginePlan },
    });

    const planRef = makePlanRefFromEnginePlan('https://example.com/plan.json', enginePlan);
    const runRef = await mock.startRun(planRef, makeResolvedRunContext('compat-run'));
    expect(runRef.provider).toBe('mock');
  });

  it('canonical plan preserves planner planId and step order without a bridge', async () => {
    const planner = new PlannerFacade();
    const { plan: plannerPlan } = await planner.buildPlan({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [
          { nodeId: 'x', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'y', stepKind: 'DBT_MODEL', dependsOn: ['x'] },
          { nodeId: 'z', stepKind: 'DBT_MODEL', dependsOn: ['x', 'y'] },
        ],
      },
      selection: { selectedNodeIds: ['z'], includeUpstream: true },
    });

    const enginePlan: ExecutionPlan = plannerPlan;

    expect(enginePlan.metadata.planId).toBe(plannerPlan.metadata.planId);
    expect(enginePlan.steps.length).toBe(plannerPlan.steps.length);

    for (let index = 0; index < plannerPlan.steps.length; index += 1) {
      expect(enginePlan.steps[index]?.stepId).toBe(plannerPlan.steps[index]?.stepId);
      expect(enginePlan.steps[index]?.kind).toBe(plannerPlan.steps[index]?.kind);
    }
  });

  it('planner output already satisfies the engine-visible canonical metadata', async () => {
    const planner = new PlannerFacade();
    const { plan } = await planner.buildPlan({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [{ nodeId: 'solo', stepKind: 'DBT_MODEL', dependsOn: [] }],
      },
      selection: { selectedNodeIds: ['solo'] },
    });

    const metadata = plan.metadata as Record<string, unknown>;
    expect(metadata['schemaVersion']).toBe('v1.2');
    expect(metadata['contractVersion']).toBe('1.0.0');
    expect(metadata['planId']).not.toBe(undefined);
    expect(metadata['planVersion']).not.toBe(undefined);
    expect(metadata['inputHashSha256']).not.toBe(undefined);
    expect(metadata['createdAtIso']).not.toBe(undefined);
  });
});
