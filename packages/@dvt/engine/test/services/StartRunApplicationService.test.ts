import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { StartRunAdmissionGuard } from '../../src/application/StartRunAdmissionGuard.js';
import { StartRunApplicationService } from '../../src/application/StartRunApplicationService.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import type { StartRunTraceContext } from '../../src/services/startRun/StartRunTypes.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import { SequenceClock } from '../../src/utils/clock.js';

function makePlanRef(uri = 'https://example.com/plan'): PlanRef {
  return {
    uri,
    sha256: 'deadbeef',
    schemaVersion: 'v1.1',
    planId: 'p',
    planVersion: '1.0',
  };
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

function makeTraceContext(runId: string): StartRunTraceContext {
  return {
    tenantId: 't',
    projectId: 'p',
    environmentId: 'dev',
    runId,
    planId: 'p',
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
    async getRunStatus(runRef) {
      return { runId: runRef.runId, status: 'RUNNING' };
    },
    async signal() {},
  };
}

describe('StartRunApplicationService', () => {
  it('checks tenant access before planRef validation', async () => {
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

    const service = new StartRunApplicationService({
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
    });

    await expect(
      service.startRun(
        makePlanRef('ftp://not-allowed.example/plan'),
        makeResolvedContext('s03-auth-first-1'),
        makeTraceContext('s03-auth-first-1')
      )
    ).rejects.toBe(unauthorizedError);

    expect(calls).toEqual(['assertTenantAccess']);
  });

  it('starts a run directly through coordinator seam and persists metadata', async () => {
    const store = new InMemoryTxStore();
    const service = new StartRunApplicationService({
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
    });

    const runId = 's03-direct-seam-1';
    const runRef = await service.startRun(
      makePlanRef(),
      makeResolvedContext(runId),
      makeTraceContext(runId)
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
        provider: 'temporal',
      })
    );
  });

  it('remains non-fatal when startup log emission fails', async () => {
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
    const service = new StartRunApplicationService({
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
    });

    await expect(
      service.startRun(
        makePlanRef(),
        makeResolvedContext('s03-log-fail-soft-1'),
        makeTraceContext('s03-log-fail-soft-1')
      )
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'temporal',
        runId: 's03-log-fail-soft-1',
      })
    );
  });

  it('remains non-fatal when success metrics emission fails', async () => {
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
    const service = new StartRunApplicationService({
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
    });

    await expect(
      service.startRun(
        makePlanRef(),
        makeResolvedContext('s03-metric-fail-soft-1'),
        makeTraceContext('s03-metric-fail-soft-1')
      )
    ).resolves.toEqual(
      expect.objectContaining({
        provider: 'temporal',
        runId: 's03-metric-fail-soft-1',
      })
    );
  });

  it('emits start metrics with expected tags on successful startRun', async () => {
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
    const service = new StartRunApplicationService({
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
    });

    await service.startRun(
      makePlanRef(),
      makeResolvedContext('s03-metrics-success-1'),
      makeTraceContext('s03-metrics-success-1')
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
