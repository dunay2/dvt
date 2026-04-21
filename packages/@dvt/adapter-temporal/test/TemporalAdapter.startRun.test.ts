import { type ExecutionPlan, RUN_PLAN_WORKFLOW } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { TemporalAdapter } from '../src/TemporalAdapter.js';

import {
  createExecutionPlan,
  createPlanRef,
  createResolvedRunContext,
  createTemporalAdapterConfig,
  createTemporalRunRef,
} from './helpers/contractFixtures.js';

const BASE_PLAN = createExecutionPlan({
  createdAtIso: '2026-04-07T00:00:00.000Z',
  steps: [{ stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] }],
});

const BASE_PLAN_REF = createPlanRef({
  uri: 'https://plans.example.com/plan-123.json',
  sha256: 'b'.repeat(64),
  planId: BASE_PLAN.metadata.planId,
  sizeBytes: 256,
});

const BASE_CTX = createResolvedRunContext({
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  runId: 'run-1',
  originRunId: 'run-1',
});

type TemporalAdapterConfigOverrides = NonNullable<
  Parameters<typeof createTemporalAdapterConfig>[0]
>;

function makeAdapter(
  args: {
    connection?: TemporalAdapterConfigOverrides['connection'];
    timeouts?: TemporalAdapterConfigOverrides['timeouts'];
    workflowBudget?: TemporalAdapterConfigOverrides['workflowBudget'];
  } = {}
): {
  adapter: TemporalAdapter;
  workflowClient: {
    start: ReturnType<typeof vi.fn>;
    getHandle: ReturnType<typeof vi.fn>;
  };
} {
  const workflowClient = {
    start: vi.fn(async () => ({
      workflowId: 'run-1',
      firstExecutionRunId: 'temporal-run-1',
    })),
    getHandle: vi.fn(),
  };

  const adapter = new TemporalAdapter({
    workflowClient,
    config: createTemporalAdapterConfig(args),
  });

  return { adapter, workflowClient };
}

function makeLargePlan(stepCount: number, stepIdWidth: number): ExecutionPlan {
  return {
    ...BASE_PLAN,
    steps: Array.from({ length: stepCount }, (_, index) => ({
      stepId: `step-${index}-${'x'.repeat(stepIdWidth)}`,
      kind: 'DBT_MODEL',
      dependsOn: [],
    })),
  };
}

describe('TemporalAdapter.startRun', () => {
  it('starts the active workflow line with a planRef-only payload', async () => {
    const { adapter, workflowClient } = makeAdapter();

    const runRef = await adapter.startRun(BASE_PLAN, BASE_PLAN_REF, BASE_CTX);

    expect(workflowClient.start).toHaveBeenCalledWith(RUN_PLAN_WORKFLOW, {
      taskQueue: 'q-main-tenant-1',
      workflowId: 'run-1',
      args: [
        {
          planRef: BASE_PLAN_REF,
          ctx: BASE_CTX,
          maxContinueAsNewPayloadBytes: 500_000,
          continueAsNewAfterLayerCount: 0,
        },
      ],
    });
    expect(runRef).toEqual(
      createTemporalRunRef({
        tenantId: 'tenant-1',
        namespace: 'dvt-test',
        workflowId: 'run-1',
        runId: 'run-1',
        taskQueue: 'q-main-tenant-1',
      })
    );
  });

  it('does not reject large plan artifacts based only on planRef.sizeBytes', async () => {
    const { adapter, workflowClient } = makeAdapter({
      workflowBudget: { maxStartPayloadBytes: 512 },
    });

    await expect(
      adapter.startRun(
        BASE_PLAN,
        {
          ...BASE_PLAN_REF,
          sizeBytes: 10_000_000,
        },
        BASE_CTX
      )
    ).resolves.toMatchObject({
      provider: 'temporal',
      workflowId: 'run-1',
      runId: 'run-1',
    });

    expect(workflowClient.start).toHaveBeenCalledTimes(1);
  });

  it('does not serialize the full plan into workflow input when planRef.sizeBytes is absent', async () => {
    const { adapter, workflowClient } = makeAdapter({
      workflowBudget: { maxStartPayloadBytes: 512 },
    });
    const largePlan = makeLargePlan(8, 96);

    await expect(
      adapter.startRun(
        largePlan,
        {
          ...BASE_PLAN_REF,
          sizeBytes: undefined,
        },
        BASE_CTX
      )
    ).resolves.toMatchObject({
      provider: 'temporal',
      workflowId: 'run-1',
      runId: 'run-1',
    });

    const firstStartCall = workflowClient.start.mock.calls[0];
    expect(firstStartCall).toBeDefined();
    const startOptions = firstStartCall?.[1];
    expect(startOptions).toBeDefined();
    expect(startOptions).toMatchObject({
      args: [
        {
          planRef: {
            planId: BASE_PLAN_REF.planId,
          },
        },
      ],
    });
    expect(JSON.stringify(startOptions)).not.toContain('"steps":');
  });
});
