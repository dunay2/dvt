import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { EngineRunRef, ExecutionPlan, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import type { IPlanIntegrityValidator } from '../../src/ports/IPlanIntegrityValidator.js';
import { StartRunAdmissionService } from '../../src/services/startRun/StartRunAdmissionService.js';
import { StartRunIntentService } from '../../src/services/startRun/StartRunIntentService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { SequenceClock } from '../../src/utils/clock.js';
import { makeDefaultExecutionPlan, makePlanRefForPlan } from '../helpers/workflowEngine.fixture.js';

function makeResolvedContext(runId = 'we-hx-3-run-1'): ResolvedRunContext {
  return {
    tenantId: 'tenant-we-hx-3',
    projectId: 'project-we-hx-3',
    environmentId: 'dev',
    runId,
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    originRunId: runId,
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

describe('StartRun application decomposition', () => {
  it('creates deterministic pre-dispatch intents through a dedicated intent service', async () => {
    const clock = new SequenceClock('2026-05-12T00:00:00.000Z');
    const intentStore = new InMemoryStartRunIntentStore(clock);
    const service = new StartRunIntentService({
      clock,
      idempotency: new IdempotencyKeyBuilder(),
      intentStore,
    });
    const context = makeResolvedContext();

    const firstIntentId = await service.createIntent(context, 'temporal');
    const secondIntentId = await service.createIntent(context, 'temporal');
    const intent = await intentStore.getIntent({
      tenantId: context.tenantId,
      intentId: firstIntentId,
    });

    expect(secondIntentId).toBe(firstIntentId);
    expect(intent).toEqual(
      expect.objectContaining({
        intentId: firstIntentId,
        tenantId: context.tenantId,
        runId: context.runId,
        provider: 'temporal',
        status: 'PENDING',
        createdAt: '2026-05-12T00:00:00.000Z',
      })
    );
  });

  it('admits start-run by sequencing admission, provider resolution, integrity, and capability checks', async () => {
    const calls: string[] = [];
    const adapter = makeTemporalAdapter();
    const plan = makeDefaultExecutionPlan();
    const planRef = makePlanRefForPlan(plan);
    const resolvedContext = makeResolvedContext('we-hx-3-admission-1');
    const executionPolicy = { requiresCapabilities: ['temporal.workflow.start'] };
    const guard = {
      async assertStartRunAllowed(inputPlanRef: PlanRef, inputContext: ResolvedRunContext) {
        calls.push('admission');
        expect(inputPlanRef).toBe(planRef);
        expect(inputContext).toBe(resolvedContext);
      },
      resolveAdapter(inputContext: ResolvedRunContext) {
        calls.push('provider');
        expect(inputContext).toBe(resolvedContext);
        return adapter;
      },
      async assertExecutionPolicyAllowed(input: {
        plan: ExecutionPlan;
        planRef: PlanRef;
        executionPolicy: typeof executionPolicy;
        context: ResolvedRunContext;
        adapter: IProviderAdapter;
      }) {
        calls.push('capability');
        expect(input).toEqual({
          plan,
          planRef,
          executionPolicy,
          context: resolvedContext,
          adapter,
        });
      },
    };
    const planIntegrityValidator: IPlanIntegrityValidator = {
      async fetchAndValidate(scopedPlanRef) {
        calls.push('integrity');
        expect(scopedPlanRef).toEqual({
          tenantId: resolvedContext.tenantId,
          projectId: resolvedContext.projectId,
          environmentId: resolvedContext.environmentId,
          planRef,
        });
        return { plan, executionPolicy };
      },
    };

    const service = new StartRunAdmissionService({
      guard,
      planFetcher: {} as IStoredPlanArtifactReader,
      planIntegrityValidator,
    });

    await expect(service.admit({ planRef, resolvedContext })).resolves.toEqual({
      adapter,
      verifiedArtifact: {
        plan,
        executionPolicy,
      },
    });
    expect(calls).toEqual(['admission', 'provider', 'integrity', 'capability']);
  });
});
