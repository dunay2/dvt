import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { StartRunAdmissionGuard } from '../../src/application/StartRunAdmissionGuard.js';
import {
  buildStartRunApplicationService,
  StartRunApplicationService,
} from '../../src/application/StartRunApplicationService.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import type { StartRunTraceContext } from '../../src/core/lifecycle/StartRunTraceContext.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import {
  makeDefaultExecutionPlan,
  makePlanFetcherForPlan,
  makePlanRefForPlan,
} from '../helpers/workflowEngine.fixture.js';

function makePlanRef(uri = 'https://example.com/plan'): PlanRef {
  return makePlanRefForPlan(makeDefaultExecutionPlan(), uri);
}

function makeResolvedContext(runId = 's03-run-1'): ResolvedRunContext {
  return {
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    runId,
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    originRunId: runId,
  };
}

function makeTraceContext(runId: string, planId = makePlanRef().planId): StartRunTraceContext {
  return {
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    runId,
    planId,
    adapter: 'temporal',
  };
}

function makeTemporalAdapter(): IProviderAdapter {
  return {
    provider: 'temporal',
    async startRun(_planRef, ctx) {
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
      return { provider: 'temporal', providerStatus: 'RUNNING' };
    },
    async signal() {},
  };
}

describe('StartRunApplicationService', () => {
  it('delegates adapter dispatch through injected start-run execution and failure seams', async () => {
    const plan = makeDefaultExecutionPlan();
    const planRef = makePlanRefForPlan(plan);
    const runId = 's03-injected-execution-1';
    const resolvedContext = makeResolvedContext(runId);
    const traceContext = makeTraceContext(runId, planRef.planId);
    const adapter = makeTemporalAdapter();
    const executionCalls: Array<{ intentId: string; adapterProvider: string }> = [];
    const failureCalls: unknown[] = [];
    const expectedRunRef: EngineRunRef = {
      provider: 'temporal',
      tenantId: 't',
      namespace: 'default',
      workflowId: `wf-${runId}`,
      runId,
    };

    const service = new StartRunApplicationService({
      guard: {
        async assertStartRunAllowed() {},
        resolveAdapter() {
          return adapter;
        },
        async assertExecutionPolicyAllowed() {},
      },
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
      planFetcher: makePlanFetcherForPlan(plan),
      planIntegrityValidator: {
        async fetchAndValidate() {
          return { plan, executionPolicy: {} };
        },
      },
      executionService: {
        async executeStartRun(input) {
          executionCalls.push({
            intentId: input.intentId,
            adapterProvider: input.adapter.provider,
          });
          return expectedRunRef;
        },
      },
      failurePolicy: {
        async markIntentResolvedBestEffort() {},
        async handleStartRunError(input) {
          failureCalls.push(input.error);
          throw input.error;
        },
      },
    } as never);

    await expect(service.startRun(planRef, resolvedContext, traceContext)).resolves.toEqual(
      expectedRunRef
    );

    expect(executionCalls).toEqual([
      {
        intentId: expect.any(String),
        adapterProvider: 'temporal',
      },
    ]);
    expect(executionCalls[0]?.intentId).toHaveLength(64);
    expect(failureCalls).toEqual([]);
  });

  it('checks tenant access before planRef validation', async () => {
    const planRef = makePlanRef('ftp://not-allowed.example/plan');
    const calls: string[] = [];
    const unauthorizedError = new Error('UNAUTHORIZED');
    const policy = {
      async assertTenantAccess() {
        calls.push('assertTenantAccess');
        throw unauthorizedError;
      },
      validatePlanRef() {
        calls.push('validatePlanRef');
        throw new Error('PLAN_REF_NOT_ALLOWED');
      },
      checkRateLimit() {
        calls.push('checkRateLimit');
      },
    };

    const service = buildStartRunApplicationService({
      policy,
      guard: new StartRunAdmissionGuard({
        policy,
        stateStoreRead: new InMemoryTxStore(),
        adapters: new Map([['temporal', makeTemporalAdapter()]]),
      }),
      stateStoreRead: new InMemoryTxStore(),
      stateStoreWrite: new InMemoryTxStore(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
      planFetcher: makePlanFetcherForPlan(makeDefaultExecutionPlan()),
    });

    await expect(
      service.startRun(
        planRef,
        makeResolvedContext('s03-auth-first-1'),
        makeTraceContext('s03-auth-first-1', planRef.planId)
      )
    ).rejects.toBe(unauthorizedError);

    expect(calls).toEqual(['assertTenantAccess']);
  });

  it('starts a run directly through coordinator seam and persists metadata', async () => {
    const store = new InMemoryTxStore();
    const plan = makeDefaultExecutionPlan();
    const planRef = makePlanRefForPlan(plan);
    const service = buildStartRunApplicationService({
      policy: {
        async assertTenantAccess() {},
        validatePlanRef() {},
        checkRateLimit() {},
      },
      guard: new StartRunAdmissionGuard({
        policy: {
          async assertTenantAccess() {},
          validatePlanRef() {},
          checkRateLimit() {},
        },
        stateStoreRead: store,
        adapters: new Map([['temporal', makeTemporalAdapter()]]),
      }),
      stateStoreRead: store,
      stateStoreWrite: store,
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
      intentStore: new InMemoryStartRunIntentStore(),
      observability: createNoopObservability(),
      planFetcher: makePlanFetcherForPlan(plan),
    });

    const runId = 's03-direct-seam-1';
    const runRef = await service.startRun(
      planRef,
      makeResolvedContext(runId),
      makeTraceContext(runId, planRef.planId)
    );

    const metadata = await store.getRunMetadataByRunId('t', runId);
    expect(runRef).toEqual(
      expect.objectContaining({
        provider: 'temporal',
        runId,
      })
    );
    expect(metadata).toEqual(
      expect.objectContaining({
        tenantId: 't',
        runId,
        providerRef: expect.objectContaining({
          provider: 'temporal',
          runId,
        }),
      })
    );
  });

  it('remains non-fatal when startup log emission fails', async () => {
    const plan = makeDefaultExecutionPlan();
    const planRef = makePlanRefForPlan(plan);
    const base = createNoopObservability();
    const observability = {
      ...base,
      logs: {
        ...base.logs,
        info() {
          throw new Error('log sink unavailable');
        },
      },
    };

    const policy = {
      async assertTenantAccess() {},
      validatePlanRef() {},
      checkRateLimit() {},
    };
    const service = buildStartRunApplicationService({
      policy,
      guard: new StartRunAdmissionGuard({
        policy,
        stateStoreRead: new InMemoryTxStore(),
        adapters: new Map([['temporal', makeTemporalAdapter()]]),
      }),
      stateStoreRead: new InMemoryTxStore(),
      stateStoreWrite: new InMemoryTxStore(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
      intentStore: new InMemoryStartRunIntentStore(),
      observability,
      planFetcher: makePlanFetcherForPlan(plan),
    });

    await expect(
      service.startRun(
        planRef,
        makeResolvedContext('s03-log-fail-soft-1'),
        makeTraceContext('s03-log-fail-soft-1', planRef.planId)
      )
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'temporal',
        runId: 's03-log-fail-soft-1',
      })
    );
  });

  it('remains non-fatal when success metrics emission fails', async () => {
    const plan = makeDefaultExecutionPlan();
    const planRef = makePlanRefForPlan(plan);
    const base = createNoopObservability();
    const observability = {
      ...base,
      metrics: {
        ...base.metrics,
        counter() {
          throw new Error('counter unavailable');
        },
      },
    };

    const policy = {
      async assertTenantAccess() {},
      validatePlanRef() {},
      checkRateLimit() {},
    };
    const service = buildStartRunApplicationService({
      policy,
      guard: new StartRunAdmissionGuard({
        policy,
        stateStoreRead: new InMemoryTxStore(),
        adapters: new Map([['temporal', makeTemporalAdapter()]]),
      }),
      stateStoreRead: new InMemoryTxStore(),
      stateStoreWrite: new InMemoryTxStore(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
      intentStore: new InMemoryStartRunIntentStore(),
      observability,
      planFetcher: makePlanFetcherForPlan(plan),
    });

    await expect(
      service.startRun(
        planRef,
        makeResolvedContext('s03-metric-fail-soft-1'),
        makeTraceContext('s03-metric-fail-soft-1', planRef.planId)
      )
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'temporal',
        runId: 's03-metric-fail-soft-1',
      })
    );
  });

  it('emits start metrics with expected tags on successful startRun', async () => {
    const plan = makeDefaultExecutionPlan();
    const planRef = makePlanRefForPlan(plan);
    const counterCalls: Array<{ name: string; tags: Record<string, string> }> = [];
    const histogramCalls: Array<{ name: string; tags: Record<string, string>; value: number }> = [];
    const base = createNoopObservability();
    const observability = {
      ...base,
      metrics: {
        ...base.metrics,
        counter(name: string, tags?: Record<string, string>) {
          counterCalls.push({ name, tags: tags ?? {} });
          return { add() {} };
        },
        histogram(name: string, tags?: Record<string, string>) {
          return {
            record(value: number) {
              histogramCalls.push({ name, tags: tags ?? {}, value });
            },
          };
        },
      },
    };

    const policy = {
      async assertTenantAccess() {},
      validatePlanRef() {},
      checkRateLimit() {},
    };
    const service = buildStartRunApplicationService({
      policy,
      guard: new StartRunAdmissionGuard({
        policy,
        stateStoreRead: new InMemoryTxStore(),
        adapters: new Map([['temporal', makeTemporalAdapter()]]),
      }),
      stateStoreRead: new InMemoryTxStore(),
      stateStoreWrite: new InMemoryTxStore(),
      idempotency: new IdempotencyKeyBuilder(),
      clock: new SequenceClock('2026-03-26T00:00:00.000Z'),
      intentStore: new InMemoryStartRunIntentStore(),
      observability,
      planFetcher: makePlanFetcherForPlan(plan),
    });

    await service.startRun(
      planRef,
      makeResolvedContext('s03-metrics-success-1'),
      makeTraceContext('s03-metrics-success-1', planRef.planId)
    );

    expect(counterCalls).toContainEqual({
      name: 'dvt.run.started_total',
      tags: {
        provider: 'temporal',
        tenantId: 't',
        operation: 'startRun',
      },
    });
    expect(histogramCalls).toContainEqual(
      expect.objectContaining({
        name: 'dvt.run.start.duration_ms',
        tags: {
          provider: 'temporal',
          tenantId: 't',
          operation: 'startRun',
        },
      })
    );
    expect(histogramCalls[0]?.value).toBeGreaterThanOrEqual(0);
  });
});
