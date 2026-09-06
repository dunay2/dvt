import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import {
  RUN_EVENT_PAYLOAD_VERSION,
  asIsoUtcString,
  asNonBlankString,
  asSha256HexString,
  asStepId,
  parseExecutionPlan,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  type PlanRef,
  type ResolvedRunContext,
  type RunContext,
  type RunExecutionContext,
} from '@dvt/contracts';
import {
  type EngineRunRef,
  type EventInput,
  type ExecutionPlan,
  type IProviderAdapter,
  type IRunExecutionContextBindingPolicy,
  type IRunExecutionContextResolver,
} from '@dvt/engine';
import {
  AllowAllAuthorizer,
  buildRunCommandService,
  buildRunRecoveryService,
  buildRunSignalService,
  buildRunStatusQueryService,
  buildStartRunApplicationService,
  buildWorkflowEngineFacade,
  buildWorkflowEngineUseCases,
  IdempotencyKeyBuilder,
  PlanRefPolicy,
  RunAccessPolicy,
  SequenceClock,
  SnapshotProjector,
  StartRunAdmissionGuard,
} from '@dvt/engine/runtime';
import {
  InMemoryProviderAdapter,
  InMemoryStartRunIntentStore,
  InMemoryTxStore,
} from '@dvt/engine/testing';
import { createNoopObservability } from '@dvt/observability';
import { PlannerFacade } from '@dvt/planner';
import { describe, it, expect } from 'vitest';

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
      schemaVersion: '1.0',
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
    uri: asNonBlankString(uri),
    sha256: asSha256HexString(sha256Hex(bytes)),
    schemaVersion: asNonBlankString(plan.metadata.schemaVersion),
    planId: asNonBlankString(plan.metadata.planId),
    planVersion: asNonBlankString(plan.metadata.planVersion),
    sizeBytes: bytes.byteLength,
  };
}

function makeRunContext(runId: string): RunContext {
  return {
    tenantId: asNonBlankString('test-tenant'),
    projectId: asNonBlankString('test-project'),
    environmentId: asNonBlankString('dev'),
    runId: asNonBlankString(runId),
    targetAdapter: 'temporal',
  };
}

function makeResolvedRunContext(runId: string): ResolvedRunContext {
  return {
    ...makeRunContext(runId),
    logicalAttemptId: 1,
    originRunId: asNonBlankString(runId),
  };
}

interface EngineTestStack {
  engine: ReturnType<typeof buildWorkflowEngineFacade>;
  store: InMemoryTxStore;
  clock: SequenceClock;
  idempotency: IdempotencyKeyBuilder;
}

function createStack(
  enginePlan: ExecutionPlan,
  options?: {
    runExecutionContextResolver?: IRunExecutionContextResolver;
    runExecutionContextBindingPolicy?: IRunExecutionContextBindingPolicy;
  }
): EngineTestStack {
  const store = new InMemoryTxStore();
  const projector = new SnapshotProjector();
  const idempotency = new IdempotencyKeyBuilder();
  const clock = new SequenceClock(asIsoUtcString('2026-03-01T00:00:00.000Z'));

  const inMemoryAdapter = new InMemoryProviderAdapter({
    stateStore: store,
    stateStoreWrite: store,
    clock,
    projector,
  });
  const policy = new RunAccessPolicy({
    authorizer: new AllowAllAuthorizer(),
    planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
  });
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
    ['temporal', inMemoryAdapter],
  ]);
  const planFetcher = {
    getStoredPlanValidationRecord: async () => undefined,
    fetchStoredPlanArtifact: async () => ({
      bytes: Buffer.from(JSON.stringify(enginePlan), 'utf8'),
      executionPolicy: {},
    }),
    fetchStoredPlanArtifactForValidation: async () => ({
      bytes: Buffer.from(JSON.stringify(enginePlan), 'utf8'),
      executionPolicy: {},
    }),
  };
  const startRunApplicationService = buildStartRunApplicationService({
    guard: new StartRunAdmissionGuard({
      policy,
      stateStoreRead: store,
      adapters,
      ...(options?.runExecutionContextResolver === undefined
        ? {}
        : { runExecutionContextResolver: options.runExecutionContextResolver }),
      ...(options?.runExecutionContextBindingPolicy === undefined
        ? {}
        : { runExecutionContextBindingPolicy: options.runExecutionContextBindingPolicy }),
    }),
    stateStoreRead: store,
    stateStoreWrite: store,
    idempotency,
    clock,
    intentStore: new InMemoryStartRunIntentStore(),
    observability: createNoopObservability(),
    planFetcher,
  });
  const runCommandService = buildRunCommandService({
    stateStoreRead: store,
    idempotency,
    policy,
    adapters,
    observability: createNoopObservability(),
    clock,
  });
  const runSignalService = buildRunSignalService({
    stateStoreRead: store,
    stateStoreWrite: store,
    idempotency,
    policy,
    adapters,
    observability: createNoopObservability(),
    clock,
  });
  const runStatusQueryService = buildRunStatusQueryService({
    stateStoreRead: store,
    projector,
    policy,
    observability: createNoopObservability(),
    clock,
  });
  const runRecoveryService = buildRunRecoveryService({
    stateStoreRead: store,
    stateStoreWrite: store,
    projector,
    policy,
    planFetcher,
    adapters,
    observability: createNoopObservability(),
    clock,
    idempotency,
    startRunApplicationService,
    ...(options?.runExecutionContextResolver === undefined
      ? {}
      : { runExecutionContextResolver: options.runExecutionContextResolver }),
    ...(options?.runExecutionContextBindingPolicy === undefined
      ? {}
      : { runExecutionContextBindingPolicy: options.runExecutionContextBindingPolicy }),
  });
  const workflowUseCases = buildWorkflowEngineUseCases({
    observability: createNoopObservability(),
    startRunApplicationService,
    runRecoveryService,
    runCommandService,
    runSignalService,
    runStatusQueryService,
  });
  const engine = buildWorkflowEngineFacade({
    ...workflowUseCases,
    adapters,
  });

  return { engine, store, clock, idempotency };
}

function makeDbtBindingPolicy(): IRunExecutionContextBindingPolicy {
  return {
    pluginRequirements: [
      {
        pluginId: 'dbt',
        stepKinds: ['DBT_MODEL', 'DBT_TEST', 'DBT_SNAPSHOT'],
        assertPluginContextAllowed() {},
      },
    ],
  };
}

function makeRunExecutionContextRef(
  planRef: PlanRef,
  runId: string
): ReturnType<typeof parseRunExecutionContextRef> {
  return parseRunExecutionContextRef({
    uri: `dvt-runctx://test-tenant/${runId}/context.json`,
    sha256: asNonBlankString('c'.repeat(64)),
    schemaVersion: asNonBlankString('v1.0'),
    planId: planRef.planId,
    planVersion: planRef.planVersion,
  });
}

function makeDbtRunExecutionContext(planRef: PlanRef, context: RunContext): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    planSha256: planRef.sha256,
    tenantId: context.tenantId,
    projectId: context.projectId,
    environmentId: context.environmentId,
    targetAdapter: context.targetAdapter,
    createdAtIso: '2026-04-14T00:00:00.000Z',
    createdBy: 'planner-engine-contract-test',
    pluginContexts: {
      dbt: {
        credentialRef: 'env:DBT_PROFILES_DIR',
        projectBundleRef: {
          uri: `s3://bundle-bucket/tenants/${context.tenantId}/${'d'.repeat(64)}`,
          kind: 'dbt-project-bundle',
          sha256: 'd'.repeat(64),
          tenantId: context.tenantId,
        },
      },
    },
  });
}

function makeRunEvent(
  idempotency: IdempotencyKeyBuilder,
  clock: SequenceClock,
  meta: { runId: string; planId: string; planVersion: string },
  eventType: 'RunStarted' | 'RunCompleted' | 'RunFailed'
): EventInput {
  return {
    eventId: idempotency.eventId(),
    eventType,
    emittedAt: clock.nowIsoUtc(),
    tenantId: asNonBlankString('test-tenant'),
    projectId: asNonBlankString('test-project'),
    environmentId: asNonBlankString('dev'),
    runId: asNonBlankString(meta.runId),
    planId: asNonBlankString(meta.planId),
    planVersion: asNonBlankString(meta.planVersion),
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
): EventInput {
  return {
    eventId: idempotency.eventId(),
    eventType,
    emittedAt: clock.nowIsoUtc(),
    tenantId: asNonBlankString('test-tenant'),
    projectId: asNonBlankString('test-project'),
    environmentId: asNonBlankString('dev'),
    runId: asNonBlankString(meta.runId),
    planId: asNonBlankString(meta.planId),
    planVersion: asNonBlankString(meta.planVersion),
    engineAttemptId: 1,
    logicalAttemptId: 1,
    stepId: asStepId(stepId),
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

    const enginePlan = parseExecutionPlan(plannerPlan);
    expect(enginePlan.metadata.schemaVersion).toBe('1.0');
    expect(enginePlan.metadata.contractVersion).toBe('1.0.0');
    expect(enginePlan.metadata.planId).toBe(plannerPlan.metadata.planId);

    const planRef = makePlanRefFromEnginePlan(
      'https://plans.example.com/revenue-dag.json',
      enginePlan
    );
    const runId = 'integration-run-1';
    const runExecutionContextRef = makeRunExecutionContextRef(planRef, runId);
    const runContext = {
      ...makeRunContext(runId),
      runExecutionContextRef,
    };
    const runExecutionContext = makeDbtRunExecutionContext(planRef, runContext);

    const { engine, store, clock, idempotency } = createStack(enginePlan, {
      runExecutionContextResolver: {
        async resolve(ref) {
          expect(ref).toEqual(runExecutionContextRef);
          return runExecutionContext;
        },
      },
      runExecutionContextBindingPolicy: makeDbtBindingPolicy(),
    });
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
    const clock = new SequenceClock(asIsoUtcString('2026-03-01T00:00:00.000Z'));
    const inMemoryAdapter = new InMemoryProviderAdapter({
      stateStore: store,
      stateStoreWrite: store,
      clock,
      projector,
    });

    const planRef = makePlanRefFromEnginePlan('https://example.com/plan.json', enginePlan);
    const runRef = await inMemoryAdapter.startRun(planRef, makeResolvedRunContext('compat-run'));
    expect(runRef.provider).toBe('temporal');
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

    const enginePlan = parseExecutionPlan(plannerPlan);

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
    expect(() => parseExecutionPlan(plan)).not.toThrow();
    expect(metadata['schemaVersion']).toBe('1.0');
    expect(metadata['contractVersion']).toBe('1.0.0');
    expect(metadata['planId']).not.toBe(undefined);
    expect(metadata['planVersion']).not.toBe(undefined);
    expect(metadata['inputHashSha256']).not.toBe(undefined);
    expect(metadata['createdAtIso']).not.toBe(undefined);
  });
});
