/**
 * @file packages/@dvt/engine/test/core/WorkflowEngine.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0015: getRunStatus read-model separation
 * @decision Verify engine lifecycle failure modes, observability, idempotency, and boundary validation
 * @consequence Regression coverage for core engine invariants
 * @version 1.0.0
 * @date 2026-03-03
 */
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  ContractValidationError,
  type ExecutionPlan,
  type EngineRunRef,
  type RunId,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  RecoverySourceNotTerminalError,
  RunAlreadyExistsError,
  InvalidSchemaVersionError,
} from '../../src/contracts/errors.js';
import { UnsupportedPlanVersionError } from '../../src/contracts/PlanAdmissionPolicy.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import type { IRunExecutionContextBindingPolicy } from '../../src/ports/IRunExecutionContextBindingPolicy.js';
import { RunHealthService } from '../../src/services/RunHealthService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import {
  createWorkflowEngineFixture,
  makeDefaultExecutionPlan,
  makePlanFetcherForPlan,
  makePlanRefForPlan,
} from '../helpers/workflowEngine.fixture.js';

import {
  createEngine,
  makeAdapters,
  makeContext,
  makePlanRef,
  makeTemporalAdapter,
  makeTrackingObservability,
} from './WorkflowEngine.helpers.js';

type StoreEventInput = Parameters<InMemoryTxStore['appendAndEnqueueTx']>[1][number];
const TEST_PLAN_REF = makePlanRef();
const WORKFLOW_ENGINE_SOURCE = readFileSync(
  new URL('../../src/core/WorkflowEngine.ts', import.meta.url),
  'utf8'
);

async function expectContractValidationFailure(
  promise: Promise<unknown>
): Promise<ContractValidationError> {
  try {
    await promise;
    throw new Error('Expected ContractValidationError');
  } catch (error) {
    expect(error).toBeInstanceOf(ContractValidationError);
    expect(error).toMatchObject({
      code: CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED,
      messageKey: CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED,
      messageParams: {},
      message: 'Validation failed',
    });
    return error as ContractValidationError;
  }
}

function makeRunEventInput(args: {
  runId: string;
  eventId: string;
  idempotencyKey: string;
  eventType?: 'RunQueued' | 'RunFailed' | 'RunStarted';
}): {
  eventId: string;
  eventType: 'RunQueued' | 'RunFailed' | 'RunStarted';
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
  payloadVersion: 1;
} {
  return {
    eventId: args.eventId,
    eventType: args.eventType ?? 'RunQueued',
    runId: args.runId,
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    planId: TEST_PLAN_REF.planId,
    planVersion: TEST_PLAN_REF.planVersion,
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-02-12T00:00:00.000Z',
    idempotencyKey: args.idempotencyKey,
    payloadVersion: 1,
  };
}

async function appendRunCompleted(store: InMemoryTxStore, runId: string): Promise<void> {
  const event: StoreEventInput = {
    eventId: `evt-${runId}-completed`,
    eventType: 'RunCompleted',
    runId,
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    planId: TEST_PLAN_REF.planId,
    planVersion: TEST_PLAN_REF.planVersion,
    logicalAttemptId: 1,
    engineAttemptId: 1,
    emittedAt: '2026-02-12T00:00:01.000Z',
    idempotencyKey: `idemp-${runId}-completed`,
    payloadVersion: 1,
  };

  await store.appendAndEnqueueTx(runId, [event]);
}

function makeRecoverableAdapters(): ReturnType<typeof makeAdapters> {
  return makeAdapters({
    estimateRunRef(context) {
      return {
        provider: 'temporal',
        tenantId: context.tenantId,
        namespace: 'default',
        workflowId: `wf-${context.runId}`,
        runId: context.runId,
      };
    },
  });
}

function makePluginBearingPlan(): ExecutionPlan {
  const basePlan = makeDefaultExecutionPlan();
  const steps: ExecutionPlan['steps'] = [
    {
      stepId: 'example-model-1',
      kind: 'EXAMPLE_MODEL',
      dependsOn: [],
    },
  ];
  const planId = sha256HexUtf8(
    jcsCanonicalize({
      metadata: {
        planVersion: basePlan.metadata.planVersion,
        inputHashSha256: basePlan.metadata.inputHashSha256,
      },
      steps,
    })
  );

  return {
    ...basePlan,
    metadata: {
      ...basePlan.metadata,
      planId,
    },
    steps,
  };
}

function makeExamplePluginBindingPolicy(
  assertAllowed: (pluginContext: unknown) => void = () => undefined
): IRunExecutionContextBindingPolicy {
  return {
    pluginRequirements: [
      {
        pluginId: 'example',
        stepKinds: ['EXAMPLE_MODEL', 'EXAMPLE_TEST', 'EXAMPLE_SNAPSHOT'],
        assertPluginContextAllowed({ pluginContext }) {
          assertAllowed(pluginContext);
        },
      },
    ],
  };
}

describe('WorkflowEngine (basic failure modes)', () => {
  it('exposes only the narrowed workflow facade at runtime', () => {
    const { engine } = createEngine({ adapters: makeAdapters() });

    expect(Reflect.has(engine as object, 'startRun')).toBe(true);
    expect(Reflect.has(engine as object, 'recoverRun')).toBe(true);
    expect(Reflect.has(engine as object, 'cancelRun')).toBe(true);
    expect(Reflect.has(engine as object, 'getRunStatus')).toBe(true);
    expect(Reflect.has(engine as object, 'signal')).toBe(true);
    expect(Reflect.has(engine as object, 'getRunEnrichment')).toBe(false);
    expect(Reflect.has(engine as object, 'healthCheck')).toBe(false);
  });

  it('keeps WorkflowEngine wired to delegated services instead of low-level collaborator regrowth', () => {
    expect(WORKFLOW_ENGINE_SOURCE).toContain('startRunUseCase: IWorkflowStartRunUseCase;');
    expect(WORKFLOW_ENGINE_SOURCE).toContain('recoverRunUseCase: IWorkflowRecoverRunUseCase;');
    expect(WORKFLOW_ENGINE_SOURCE).toContain('cancelRunUseCase: IWorkflowCancelRunUseCase;');
    expect(WORKFLOW_ENGINE_SOURCE).toContain('runStatusUseCase: IWorkflowRunStatusUseCase;');
    expect(WORKFLOW_ENGINE_SOURCE).toContain('signalRunUseCase: IWorkflowSignalRunUseCase;');

    expect(WORKFLOW_ENGINE_SOURCE).toContain('return this.recoverRunUseCase.recoverRun(');
    expect(WORKFLOW_ENGINE_SOURCE).toContain(
      'return this.runStatusUseCase.getRunStatus(engineRunRef);'
    );

    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('IStartRunApplicationService');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('IRunRecoveryService');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('IRunControlService');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('IRunStatusQueryService');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('IObservability');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('buildTraceContext');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('withSpan(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('getRunEnrichment(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('healthCheck(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('stateStoreRead');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('stateStoreWrite');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('intentStore');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('planFetcher');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('runExecutionContextResolver');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('new StartRunApplicationService(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('new RunHealthService(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('new RunEnrichmentService(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('buildRunControlService(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('buildRunRecoveryService(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('buildRunStatusQueryService(');
    expect(WORKFLOW_ENGINE_SOURCE).not.toContain('buildRunHealthService(');
  });

  it('startRun fails when no adapter registered for provider', async () => {
    const { engine } = createEngine();

    await expect(engine.startRun(makePlanRef(), makeContext())).rejects.toThrow(
      /engine\.error\.adapter_not_registered/
    );
  });

  it('startRun rejects invalid runtime boundary payloads', async () => {
    const { engine } = createEngine();

    const invalidPlanRef = {
      uri: '',
      sha256: 'deadbeef',
      schemaVersion: '1.0',
      planId: TEST_PLAN_REF.planId,
      planVersion: '1.0',
    } as any;

    const validContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId: 'r',
      targetAdapter: 'temporal',
    } as any;

    await expectContractValidationFailure(engine.startRun(invalidPlanRef, validContext));

    const invalidContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId: 'r',
      targetAdapter: 'unknown-provider',
    } as any;

    await expectContractValidationFailure(engine.startRun(makePlanRef(), invalidContext));

    const callerOwnedAttemptContext = {
      tenantId: 't',
      projectId: 'p',
      environmentId: 'dev',
      runId: 'r',
      targetAdapter: 'temporal',
      logicalAttemptId: 2,
    } as any;

    await expectContractValidationFailure(
      engine.startRun(makePlanRef(), callerOwnedAttemptContext)
    );
  });

  it('rejects runExecutionContextRef when no resolver is configured', async () => {
    const { engine } = createEngine({ adapters: makeAdapters() });
    const planRef = makePlanRef();
    const contextWithRunExecutionContextRef = {
      ...makeContext('ctx-no-resolver-1'),
      runExecutionContextRef: {
        uri: 'dvt-runctx://t/ctx-no-resolver-1',
        sha256: 'ctxsha',
        schemaVersion: 'v1.0',
        planId: planRef.planId,
        planVersion: planRef.planVersion,
      },
    };

    await expect(engine.startRun(planRef, contextWithRunExecutionContextRef)).rejects.toMatchObject(
      {
        code: 'RUN_EXECUTION_CONTEXT_REJECTED',
      }
    );
  });

  it('allows aligned runExecutionContextRef and forwards it to adapter context', async () => {
    const seenContexts: unknown[] = [];
    const planRef = makePlanRef();
    const { engine } = createEngine({
      adapters: makeAdapters({
        async startRun(_planRef, ctx) {
          seenContexts.push(ctx);
          return {
            provider: 'temporal',
            tenantId: ctx.tenantId,
            namespace: 'default',
            workflowId: `wf-${ctx.runId}`,
            runId: ctx.runId,
          } as EngineRunRef;
        },
      }),
      runExecutionContextResolver: {
        async resolve(ref) {
          return {
            schemaVersion: 'v1.0',
            planId: ref.planId,
            planVersion: ref.planVersion,
            planSha256: planRef.sha256,
            tenantId: 't',
            projectId: 'p',
            environmentId: 'dev',
            targetAdapter: 'temporal',
            createdAtIso: '2026-04-03T00:00:00.000Z',
            createdBy: 'test',
            pluginContexts: {
              example: {
                artifactRef: {
                  uri: `s3://bundle-bucket/tenants/t/${'b'.repeat(64)}`,
                  kind: 'example-plugin-artifact',
                  sha256: 'b'.repeat(64),
                  tenantId: 't',
                },
              },
            },
          };
        },
      },
      runExecutionContextBindingPolicy: makeExamplePluginBindingPolicy(),
    });

    const contextWithRunExecutionContextRef = {
      ...makeContext('ctx-ok-1'),
      runExecutionContextRef: {
        uri: 'dvt-runctx://t/ctx-ok-1',
        sha256: 'ctxsha',
        schemaVersion: 'v1.0',
        planId: planRef.planId,
        planVersion: planRef.planVersion,
      },
    };

    await expect(engine.startRun(planRef, contextWithRunExecutionContextRef)).resolves.toBeTruthy();
    expect(seenContexts).toHaveLength(1);
    expect(seenContexts[0]).toMatchObject({
      runExecutionContextRef: {
        uri: 'dvt-runctx://t/ctx-ok-1',
      },
    });
  });

  it('rejects plugin-bearing runs without runExecutionContextRef before adapter dispatch', async () => {
    const startRun = vi.fn(async () => {
      throw new Error('adapter should not be called');
    });
    const plan = makePluginBearingPlan();
    const planRef = makePlanRefForPlan(plan);
    const { engine } = createWorkflowEngineFixture({
      adapter: makeTemporalAdapter({ startRun }),
      planFetcher: makePlanFetcherForPlan(plan),
      runExecutionContextBindingPolicy: makeExamplePluginBindingPolicy(),
    });

    await expect(
      engine.startRun(planRef, makeContext('plugin-missing-runctx-1'))
    ).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
    });
    expect(startRun).not.toHaveBeenCalled();
  });

  it('rejects plugin-bearing runs when artifact locator is not allowed by admission binding policy', async () => {
    const startRun = vi.fn(async () => {
      throw new Error('adapter should not be called');
    });
    const plan = makePluginBearingPlan();
    const planRef = makePlanRefForPlan(plan);
    const runExecutionContextRef = {
      uri: 'dvt-runctx://t/plugin-store-mismatch-1',
      sha256: 'ctxsha',
      schemaVersion: 'v1.0',
      planId: planRef.planId,
      planVersion: planRef.planVersion,
    };
    const { engine } = createWorkflowEngineFixture({
      adapter: makeTemporalAdapter({ startRun }),
      planFetcher: makePlanFetcherForPlan(plan),
      runExecutionContextResolver: {
        async resolve() {
          return {
            schemaVersion: 'v1.0',
            planId: planRef.planId,
            planVersion: planRef.planVersion,
            planSha256: planRef.sha256,
            tenantId: 't',
            projectId: 'p',
            environmentId: 'dev',
            targetAdapter: 'temporal',
            createdAtIso: '2026-04-03T00:00:00.000Z',
            createdBy: 'test',
            pluginContexts: {
              example: {
                artifactRef: {
                  uri: `s3://foreign-bucket/tenants/t/${'b'.repeat(64)}`,
                  kind: 'example-plugin-artifact',
                  sha256: 'b'.repeat(64),
                  tenantId: 't',
                },
              },
            },
          };
        },
      },
      runExecutionContextBindingPolicy: makeExamplePluginBindingPolicy(() => {
        throw new Error(
          'plugin artifact bucket mismatch: expected=canonical-bucket actual=foreign-bucket'
        );
      }),
    });

    await expect(
      engine.startRun(planRef, {
        ...makeContext('plugin-store-mismatch-1'),
        runExecutionContextRef,
      })
    ).rejects.toMatchObject({
      code: 'RUN_EXECUTION_CONTEXT_REJECTED',
      messageParams: {
        reason: 'plugin artifact bucket mismatch: expected=canonical-bucket actual=foreign-bucket',
      },
    });
    expect(startRun).not.toHaveBeenCalled();
  });

  it('signal rejects invalid runtime boundary payloads', async () => {
    const { engine } = createEngine();

    const runRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'n',
      workflowId: 'w',
      runId: 'missing',
    } as any;

    const badSignal = {
      signalId: 's1',
      type: 'INVALID_SIGNAL',
    } as any;

    await expectContractValidationFailure(engine.signal(runRef, badSignal));
  });

  it('emits startRun success metrics via observability', async () => {
    const { obs, counters, histograms } = makeTrackingObservability();
    const { engine } = createEngine({ adapters: makeAdapters(), observability: obs });

    await engine.startRun(makePlanRef(), makeContext('obs-ok-1'));
    expect(counters).toContain('dvt.run.started_total');
    expect(histograms).toContain('dvt.run.start.duration_ms');
  });

  it('emits startRun failure counter via observability', async () => {
    const { obs, counters } = makeTrackingObservability();
    const adapters = makeAdapters({
      async startRun() {
        throw new Error('forced failure');
      },
    });
    const { engine } = createEngine({ adapters, observability: obs });

    await expect(engine.startRun(makePlanRef(), makeContext('obs-fail-1'))).rejects.toThrow(
      /forced failure/
    );
    expect(counters).toContain('dvt.run.start_failed_total');
  });

  it('constructor validates requiredProviders', () => {
    expect(() =>
      createEngine({
        requiredProviders: ['temporal'],
      })
    ).toThrow(/engine\.error\.adapter_not_registered/);
  });

  it.each([
    {
      name: 'invalid runId format',
      run: async (engine: WorkflowEngine): Promise<void> => {
        await expect(engine.startRun(makePlanRef(), makeContext('bad run id'))).rejects.toThrow(
          /engine\.error\.invalid_run_id/
        );
      },
    },
    {
      name: 'duplicate runId',
      run: async (engine: WorkflowEngine): Promise<void> => {
        await engine.startRun(makePlanRef(), makeContext('dup-1'));
        await expect(engine.startRun(makePlanRef(), makeContext('dup-1'))).rejects.toThrow(
          /engine\.error\.run_already_exists/
        );
      },
    },
    {
      name: 'unsupported planVersion',
      run: async (engine: WorkflowEngine): Promise<void> => {
        const unsupported = {
          ...makePlanRef(),
          planVersion: `${makePlanRef().planVersion}-unsupported`,
        };
        await expect(
          engine.startRun(unsupported, makeContext('unsupported-ver-1'))
        ).rejects.toThrow(UnsupportedPlanVersionError);
      },
    },
    {
      name: 'future schemaVersion on a supported planVersion',
      run: async (engine: WorkflowEngine): Promise<void> => {
        const unsupported = { ...makePlanRef(), schemaVersion: '1.future' };
        await expect(
          engine.startRun(unsupported, makeContext('unsupported-schema-1'))
        ).rejects.toThrow(InvalidSchemaVersionError);
      },
    },
  ])('startRun rejects $name', async ({ run }) => {
    const { engine } = createEngine({ adapters: makeAdapters() });
    await run(engine);
  });

  it('rejects unsupported schemaVersion before adapter dispatch', async () => {
    const startRun = vi.fn(async () => {
      throw new Error('adapter should not be called');
    });
    const { engine, store } = createEngine({
      adapters: makeAdapters({ startRun }),
    });
    const unsupported = { ...makePlanRef(), schemaVersion: '1.future' };

    await expect(
      engine.startRun(unsupported, makeContext('unsupported-schema-no-dispatch-1'))
    ).rejects.toThrow(InvalidSchemaVersionError);

    expect(startRun).not.toHaveBeenCalled();
    await expect(store.listEvents('t', 'unsupported-schema-no-dispatch-1')).resolves.toEqual([]);
  });

  it('startRun rejects and stores no events when adapter throws before bootstrap', async () => {
    // ADR-0014: Adapter is called first. If it throws, bootstrapRunTx is never called,
    // so no run metadata or events are stored.
    const adapters = makeAdapters({
      async startRun() {
        throw new Error('provider failure');
      },
    });

    const { engine, store } = createEngine({ adapters });

    await expect(engine.startRun(makePlanRef(), makeContext('fail-1'))).rejects.toThrow(
      /provider failure/
    );

    const events = await store.listEvents('t', 'fail-1');
    expect(events).toHaveLength(0);
  });

  it('pre-bootstraps RunQueued before adapter.startRun when estimateRunRef is available', async () => {
    const store = new InMemoryTxStore();
    let sawQueuedEventBeforeStart = false;
    const adapters = makeAdapters({
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async startRun(_planRef, ctx) {
        const events = await store.listEvents(ctx.tenantId, ctx.runId);
        sawQueuedEventBeforeStart = events.some((event) => event.eventType === 'RunQueued');
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
    });
    const intentStore = new InMemoryStartRunIntentStore();
    const { engine } = createEngine({ adapters, stateStore: store, intentStore });

    await engine.startRun(makePlanRef(), makeContext('pre-bootstrap-1'));

    expect(sawQueuedEventBeforeStart).toBe(true);
    const events = await store.listEvents('t', 'pre-bootstrap-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);
    const meta = await store.getRunMetadataByRunId('t', 'pre-bootstrap-1');
    expect(meta?.logicalAttemptId).toBe(1);
    expect(meta?.originRunId).toBe('pre-bootstrap-1');
    expect(meta?.parentRunId).toBeUndefined();
  });

  it('recoverRun reserves retry lineage for recovery runs', async () => {
    const { engine, store } = createEngine({ adapters: makeRecoverableAdapters() });
    const sourceRunId = 'recover-source-1';
    const recoveryRunId = 'recover-target-1';

    await engine.startRun(makePlanRef(), makeContext(sourceRunId));
    await appendRunCompleted(store, sourceRunId);

    await engine.recoverRun(sourceRunId, makePlanRef(), makeContext(recoveryRunId));

    const source = await store.getRunMetadataByRunId('t', sourceRunId);
    const recovery = await store.getRunMetadataByRunId('t', recoveryRunId);

    expect(source).not.toBeNull();
    expect(recovery).not.toBeNull();
    expect(source?.logicalAttemptId).toBe(1);
    expect(recovery?.logicalAttemptId).toBe(2);
    expect(recovery?.parentRunId).toBe(sourceRunId);
    expect(recovery?.originRunId).toBe(sourceRunId);
  });

  it('reuses one prepared recovery for concurrent deliveries of the same identity', async () => {
    const { engine, store } = createEngine({ adapters: makeRecoverableAdapters() });
    const sourceRunId = 'recover-concurrent-source-1';
    const recoveryRunId = 'recover-concurrent-target-1';

    await engine.startRun(makePlanRef(), makeContext(sourceRunId));
    await appendRunCompleted(store, sourceRunId);

    const results = await Promise.all([
      engine.recoverRun(sourceRunId, makePlanRef(), makeContext(recoveryRunId)),
      engine.recoverRun(sourceRunId, makePlanRef(), makeContext(recoveryRunId)),
    ]);

    expect(results[0]).toEqual(results[1]);
    const recovery = await store.getRunMetadataByRunId('t', recoveryRunId);
    expect(recovery?.logicalAttemptId).toBe(2);
    expect(recovery?.parentRunId).toBe(sourceRunId);
  });

  it('recoverRun rejects when sourceRunId equals recovery runId', async () => {
    const { engine, store } = createEngine({ adapters: makeRecoverableAdapters() });
    const runId = 'recover-same-id-1';

    await engine.startRun(makePlanRef(), makeContext(runId));

    await expect(engine.recoverRun(runId, makePlanRef(), makeContext(runId))).rejects.toThrow(
      ContractValidationError
    );

    const metadata = await store.getRunMetadataByRunId('t', runId);
    expect(metadata?.logicalAttemptId).toBe(1);
    expect(metadata?.parentRunId).toBeUndefined();
    expect(metadata?.originRunId).toBe(runId);
  });

  it('recoverRun rejects when source run is not terminal', async () => {
    const { engine, store } = createEngine({ adapters: makeRecoverableAdapters() });
    const sourceRunId = 'recover-running-source-1';
    const recoveryRunId = 'recover-running-target-1';

    await engine.startRun(makePlanRef(), makeContext(sourceRunId));

    await expect(
      engine.recoverRun(sourceRunId, makePlanRef(), makeContext(recoveryRunId))
    ).rejects.toBeInstanceOf(RecoverySourceNotTerminalError);

    const recovery = await store.getRunMetadataByRunId('t', recoveryRunId);
    expect(recovery).toBeNull();
  });

  it('recoverRun fails closed when retry reservation support is unavailable', async () => {
    const { engine, store } = createEngine({ adapters: makeRecoverableAdapters() });
    const rootRunId = 'recover-fallback-root-1';
    const firstRecoveryRunId = 'recover-fallback-child-1';
    const secondRecoveryRunId = 'recover-fallback-child-2';

    await engine.startRun(makePlanRef(), makeContext(rootRunId));
    await appendRunCompleted(store, rootRunId);
    await engine.recoverRun(rootRunId, makePlanRef(), makeContext(firstRecoveryRunId));

    (store as { bootstrapRecoveryRunTx?: unknown }).bootstrapRecoveryRunTx = undefined;
    await expect(
      engine.recoverRun(rootRunId, makePlanRef(), makeContext(secondRecoveryRunId))
    ).rejects.toThrow(/bootstrapRecoveryRunTx/);

    const secondRecovery = await store.getRunMetadataByRunId('t', secondRecoveryRunId);
    expect(secondRecovery).toBeNull();
  });

  it('recoverRun does not consume retry lineage on duplicate preflight rejection', async () => {
    const { engine, store } = createEngine({ adapters: makeRecoverableAdapters() });
    const sourceRunId = 'recover-preflight-source-1';
    const duplicateRecoveryRunId = 'recover-preflight-dup-1';
    const validRecoveryRunId = 'recover-preflight-valid-1';

    await engine.startRun(makePlanRef(), makeContext(sourceRunId));
    await appendRunCompleted(store, sourceRunId);
    await engine.startRun(makePlanRef(), makeContext(duplicateRecoveryRunId));

    await expect(
      engine.recoverRun(sourceRunId, makePlanRef(), makeContext(duplicateRecoveryRunId))
    ).rejects.toBeInstanceOf(RunAlreadyExistsError);

    await engine.recoverRun(sourceRunId, makePlanRef(), makeContext(validRecoveryRunId));

    const recovery = await store.getRunMetadataByRunId('t', validRecoveryRunId);
    expect(recovery?.logicalAttemptId).toBe(2);
    expect(recovery?.parentRunId).toBe(sourceRunId);
    expect(recovery?.originRunId).toBe(sourceRunId);
  });

  it('recoverRun reuses one logical attempt after pre-dispatch intent persistence fails', async () => {
    const intentStore = new InMemoryStartRunIntentStore();
    const adapters = makeRecoverableAdapters();
    const { engine, store } = createEngine({ adapters, intentStore });
    const sourceRunId = 'recover-resume-source-1';
    const recoveryRunId = 'recover-resume-target-1';

    await engine.startRun(makePlanRef(), makeContext(sourceRunId));
    await appendRunCompleted(store, sourceRunId);
    vi.spyOn(intentStore, 'createIntent').mockRejectedValueOnce(
      new Error('transient intent persistence failure')
    );

    await expect(
      engine.recoverRun(sourceRunId, makePlanRef(), makeContext(recoveryRunId))
    ).rejects.toThrow(/transient intent persistence failure/);

    await engine.recoverRun(sourceRunId, makePlanRef(), makeContext(recoveryRunId));

    const recovery = await store.getRunMetadataByRunId('t', recoveryRunId);
    expect(recovery?.logicalAttemptId).toBe(2);
    expect(recovery?.parentRunId).toBe(sourceRunId);
    expect(recovery?.originRunId).toBe(sourceRunId);
  });

  it('reconciles providerRef when estimateRunRef and startRun disagree on same-provider late-bound fields', async () => {
    const cancelRun = vi.fn(async () => {});
    const store = new InMemoryTxStore();

    const adapters = makeAdapters({
      cancelRun,
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: `actual-execution-id-for-${ctx.runId}`,
        } as EngineRunRef;
      },
    });

    const { engine } = createEngine({ adapters, stateStore: store });
    await expect(engine.startRun(makePlanRef(), makeContext('g7-reconcile-1'))).resolves.toEqual({
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-g7-reconcile-1',
      runId: 'actual-execution-id-for-g7-reconcile-1',
    });
    expect(cancelRun).not.toHaveBeenCalled();

    const meta = await store.getRunMetadataByRunId('t', 'g7-reconcile-1');
    expect(meta?.providerRef).toEqual({
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-g7-reconcile-1',
      runId: 'actual-execution-id-for-g7-reconcile-1',
    });
  });

  it('starts successfully when estimateRunRef and startRun return the same EngineRunRef', async () => {
    const cancelRun = vi.fn(async () => {});
    const store = new InMemoryTxStore();

    const adapters = makeAdapters({
      cancelRun,
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
    });

    const { engine } = createEngine({ adapters, stateStore: store });
    await expect(engine.startRun(makePlanRef(), makeContext('g7-same-id-1'))).resolves.toEqual({
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-g7-same-id-1',
      runId: 'g7-same-id-1',
    });

    expect(cancelRun).not.toHaveBeenCalled();
    const meta = await store.getRunMetadataByRunId('t', 'g7-same-id-1');
    expect(meta?.providerRef.runId).toBe('g7-same-id-1');
  });

  it('rejects startRun when adapter returns an unsupported provider discriminator', async () => {
    const cancelRun = vi.fn(async () => {});

    const adapters = makeAdapters({
      cancelRun,
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async startRun(_planRef, ctx) {
        return {
          provider: 'conductor',
          tenantId: ctx.tenantId,
          workflowId: `wf-${ctx.runId}`,
          runId: `actual-execution-id-for-${ctx.runId}`,
          conductorUrl: 'http://localhost:8080/api',
        } as unknown as EngineRunRef;
      },
    });

    const store = new InMemoryTxStore();
    const { engine } = createEngine({ adapters, stateStore: store });
    await expect(
      engine.startRun(makePlanRef(), makeContext('g7-provider-drift-1'))
    ).rejects.toBeInstanceOf(ContractValidationError);
    expect(cancelRun).toHaveBeenCalledTimes(1);

    const meta = await store.getRunMetadataByRunId('t', 'g7-provider-drift-1');
    expect(meta?.providerRef).toEqual({
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: 'wf-g7-provider-drift-1',
      runId: 'g7-provider-drift-1',
    });
  });

  it('still rejects when compensating cancelRun fails after providerRef reconciliation error', async () => {
    const cancelRun = vi.fn(async () => {
      throw new Error('cancel unavailable');
    });
    const store = new InMemoryTxStore();
    vi.spyOn(store, 'saveProviderRef').mockRejectedValueOnce(new Error('save boom'));

    const adapters = makeAdapters({
      cancelRun,
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async startRun(_planRef, ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: `actual-execution-id-for-${ctx.runId}`,
        } as EngineRunRef;
      },
    });

    const { engine } = createEngine({ adapters, stateStore: store });
    await expect(engine.startRun(makePlanRef(), makeContext('g7-fail-soft-1'))).rejects.toThrow(
      /save boom/
    );
    expect(cancelRun).toHaveBeenCalledTimes(1);
  });

  it('keeps a pre-bootstrapped run pending when adapter.startRun fails before dispatch', async () => {
    const adapters = makeAdapters({
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
      async startRun() {
        throw new Error('provider failure after bootstrap');
      },
    });

    const { engine, store, intentStore } = createEngine({ adapters });

    await expect(
      engine.startRun(makePlanRef(), makeContext('fail-after-bootstrap-1'))
    ).rejects.toThrow(/provider failure after bootstrap/);

    const events = await store.listEvents('t', 'fail-after-bootstrap-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);

    const orphaned = await intentStore.listOrphaned(0, Date.now());
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0]?.status).toBe('PENDING');
  });

  it('keeps a pre-bootstrapped run pending when markDispatched fails after provider start', async () => {
    const store = new InMemoryTxStore();
    const intentStore = new InMemoryStartRunIntentStore();
    const adapters = makeAdapters({
      estimateRunRef(ctx) {
        return {
          provider: 'temporal',
          tenantId: ctx.tenantId,
          namespace: 'default',
          workflowId: `wf-${ctx.runId}`,
          runId: ctx.runId,
        } as EngineRunRef;
      },
    });
    vi.spyOn(intentStore, 'markDispatched').mockRejectedValueOnce(new Error('dispatch boom'));

    const { engine } = createEngine({ adapters, stateStore: store, intentStore });

    await expect(engine.startRun(makePlanRef(), makeContext('dispatch-fail-1'))).rejects.toThrow(
      /dispatch boom/
    );

    const events = await store.listEvents('t', 'dispatch-fail-1');
    expect(events.map((event) => event.eventType)).toEqual(['RunQueued']);

    const orphaned = await intentStore.listOrphaned(0, Date.now());
    expect(orphaned).toHaveLength(1);
    expect(orphaned[0]?.status).toBe('PENDING');
  });

  it('RunHealthService reports degraded when an adapter ping fails', async () => {
    const adapters = makeAdapters({
      async ping() {
        throw new Error('ping failed');
      },
    });

    const { store } = createEngine({ adapters });
    const healthService = new RunHealthService({
      stateStoreRead: store,
      adapters,
    });
    const health = await healthService.healthCheck();

    expect(health.status).toBe('degraded');
    expect(health.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'adapter-temporal',
          status: 'down',
        }),
      ])
    );
  });

  describe('A2 appendAndEnqueueTx / AppendResult', () => {
    it('returns appended + deduped and preserves runSeq monotonicity', async () => {
      const { engine, store } = createEngine({ adapters: makeAdapters() });
      await engine.startRun(makePlanRef(), makeContext('a2-run-1'));

      const runId = 'a2-run-1' as RunId;

      const first = await store.appendAndEnqueueTx(runId, [
        makeRunEventInput({ runId: 'a2-run-1', eventId: 'evt-1', idempotencyKey: 'k-1' }),
      ]);
      expect(first.appended).toHaveLength(1);
      expect(first.deduped).toHaveLength(0);
      expect(first.lastSeq).toBe(2);

      const second = await store.appendAndEnqueueTx(runId, [
        // duplicate by idempotencyKey -> deduped
        makeRunEventInput({ runId: 'a2-run-1', eventId: 'evt-1b', idempotencyKey: 'k-1' }),
        // new event -> appended
        makeRunEventInput({ runId: 'a2-run-1', eventId: 'evt-2', idempotencyKey: 'k-2' }),
      ]);

      expect(second.appended).toHaveLength(1);
      expect(second.deduped).toHaveLength(1);
      expect(second.lastSeq).toBe(3);
      expect(second.deduped[0]?.idempotencyKey).toBe('k-1');
      expect(second.appended[0]?.idempotencyKey).toBe('k-2');

      const all = await store.listEvents('t', runId);
      const seqs = all.map((e) => e.runSeq);
      expect(seqs).toEqual([1, 2, 3]);
    });

    it('rejects write-shape inputs that preassign runSeq/persistedAt', async () => {
      const { engine, store } = createEngine({ adapters: makeAdapters() });
      await engine.startRun(makePlanRef(), makeContext('a2-run-shape-1'));

      const runId = 'a2-run-shape-1' as RunId;

      const invalidWithRunSeq = {
        ...makeRunEventInput({
          runId: 'a2-run-shape-1',
          eventId: 'evt-shape-runseq',
          eventType: 'RunStarted',
          idempotencyKey: 'a2-shape-runseq',
        }),
        runSeq: 99,
      } as unknown as StoreEventInput;

      await expect(store.appendAndEnqueueTx(runId, [invalidWithRunSeq])).rejects.toThrow(
        /engine\.error\.invalid_run_event_input/
      );

      const invalidWithPersistedAt = {
        ...makeRunEventInput({
          runId: 'a2-run-shape-1',
          eventId: 'evt-shape-persisted',
          eventType: 'RunStarted',
          idempotencyKey: 'a2-shape-persisted',
        }),
        persistedAt: '2026-02-12T00:00:01.000Z',
      } as unknown as StoreEventInput;

      await expect(store.appendAndEnqueueTx(runId, [invalidWithPersistedAt])).rejects.toThrow(
        /engine\.error\.invalid_run_event_input/
      );
    });
  });

  describe('A4 gatewayDecisions persistence', () => {
    it('reconstructs gatewayDecisions from persisted StepCompleted payloads', async () => {
      const { engine, store } = createEngine({ adapters: makeAdapters() });
      await engine.startRun(makePlanRef(), makeContext('a4-run-1'));

      const runId = 'a4-run-1' as RunId;

      await store.appendAndEnqueueTx(runId, [
        {
          eventId: 'evt-gw-start-1',
          eventType: 'StepStarted',
          stepId: 'gw-1',
          runId: 'a4-run-1',
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          planId: TEST_PLAN_REF.planId,
          planVersion: TEST_PLAN_REF.planVersion,
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-02-12T00:00:00.000Z',
          idempotencyKey: 'a4-gw-start-1',
          payloadVersion: 1,
        },
        {
          eventId: 'evt-gw-complete-1',
          eventType: 'StepCompleted',
          stepId: 'gw-1',
          runId: 'a4-run-1',
          tenantId: 't',
          projectId: 'p',
          environmentId: 'dev',
          planId: TEST_PLAN_REF.planId,
          planVersion: TEST_PLAN_REF.planVersion,
          logicalAttemptId: 1,
          engineAttemptId: 1,
          emittedAt: '2026-02-12T00:00:01.000Z',
          idempotencyKey: 'a4-gw-complete-1',
          payloadVersion: 1,
          payload: { gatewayDecision: true },
        },
      ]);

      const snap = await store.getSnapshot('t', runId);
      expect(snap).not.toBeNull();
      expect(snap?.gatewayDecisions).toEqual({ 'gw-1': true });
      expect(snap?.gatewayDecisions?.['gw-1']).toBe(true);
    });
  });
});
