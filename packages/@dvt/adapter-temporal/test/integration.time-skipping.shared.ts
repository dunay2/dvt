/**
 * Compatibility barrel for Temporal integration-test harness helpers.
 * Concrete responsibilities live under test/helpers/integration/.
 */

import type { ExecutionPlan, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';

import type { DbtPluginRunner } from '../../temporal-dbt-plugin/src/index.js';
import type { StepExecutor } from '../src/activities/stepActivities.js';
import type { TemporalAdapterConfig } from '../src/config.js';
import {
  loadTemporalAdapterConfig,
  TemporalAdapter,
  TemporalWorkerHost,
  toTemporalTaskQueue,
} from '../src/index.js';
import type { TemporalWorkerHostConfig } from '../src/TemporalWorkerHost.js';

import {
  createDbtActivityDeps,
  withDbtRunExecutionContext,
} from './helpers/integration/dbtRuntimeFixtures.js';
import { RunId, TestOutbox, TestStateStore } from './helpers/integration/runtimeState.js';
import { createPlanRef, createRunContext } from './helpers/integration/testPlans.js';
import { WORKFLOW_PATH } from './helpers/integration/workflowArtifacts.js';

export {
  assertWorkflowArtifactPresentInCi,
  INTEGRATION_TEST_TIMEOUT,
  WORKFLOW_PATH,
} from './helpers/integration/workflowArtifacts.js';
export type { EventEnvelope, RunStatusValue } from './helpers/integration/runtimeState.js';
export {
  RunId,
  TestOutbox,
  TestProjector,
  TestStateStore,
} from './helpers/integration/runtimeState.js';
export { createActivityDeps } from './helpers/integration/testActivities.js';
export {
  type CreateDbtActivityDepsArgs,
  type DbtRunExecutionBinding,
  type TestDbtActivityDeps,
  createDbtActivityDeps,
  createDbtRunExecutionContext,
  createDbtRunExecutionContextRef,
  resolveDbtPluginContext,
  withDbtRunExecutionContext,
} from './helpers/integration/dbtRuntimeFixtures.js';
export {
  INTEGRATION_PLAN_OWNERSHIP,
  createPlanOwnershipFromContext,
  createPlanRef,
  mkLinearPlan,
  createRunContext,
  mkPlan,
  mkLinearThreeStepPlan,
  mkPermanentFailurePlan,
  withTransformationRuntimeBinding,
} from './helpers/integration/testPlans.js';
export type { WaitForConditionFn } from './helpers/integration/waitForCondition.js';
export { waitForCondition } from './helpers/integration/waitForCondition.js';

export interface SingleRunDbtTimeSkippingWorkerOptions {
  dbtPluginRunner?: DbtPluginRunner;
  stepExecutors?: readonly StepExecutor[];
}

export interface CreateSingleRunDbtTimeSkippingHarnessArgs {
  plan: ExecutionPlan;
  planRefId: string;
  planRefOptions?: {
    uri?: string;
  };
  runId: string;
  taskQueue: string;
  contextOverrides?: Parameters<typeof createRunContext>[1];
  temporalEnv?: Record<string, string | undefined>;
}

export interface SingleRunDbtTimeSkippingHarness {
  adapter: TemporalAdapter;
  ctx: ResolvedRunContext;
  env: TestWorkflowEnvironment;
  outbox: TestOutbox;
  planBytes: Buffer;
  planRef: PlanRef;
  store: TestStateStore;
  temporalConfig: TemporalAdapterConfig;
  createWorker(options?: SingleRunDbtTimeSkippingWorkerOptions): TemporalWorkerHost;
  startWorker(options?: SingleRunDbtTimeSkippingWorkerOptions): Promise<TemporalWorkerHost>;
}

export function createTenantTemporalConfig(
  temporalConfig: TemporalAdapterConfig,
  tenantId: string
): TemporalAdapterConfig {
  return {
    ...temporalConfig,
    connection: {
      ...temporalConfig.connection,
      taskQueue: toTemporalTaskQueue(tenantId, temporalConfig),
    },
  };
}

export function createTenantWorkerHost(
  args: Omit<TemporalWorkerHostConfig, 'temporalConfig'> & {
    temporalConfig: TemporalAdapterConfig;
    tenantId: string;
  }
): TemporalWorkerHost {
  return new TemporalWorkerHost({
    ...args,
    temporalConfig: createTenantTemporalConfig(args.temporalConfig, args.tenantId),
  });
}

export async function createSingleRunDbtTimeSkippingHarness(
  args: CreateSingleRunDbtTimeSkippingHarnessArgs
): Promise<SingleRunDbtTimeSkippingHarness> {
  const env = await TestWorkflowEnvironment.createTimeSkipping();
  const store = new TestStateStore();
  const outbox = new TestOutbox();
  const planBytes = Buffer.from(JSON.stringify(args.plan), 'utf-8');
  const planRef = createPlanRef(args.planRefId, planBytes, args.planRefOptions);
  const ctx = withDbtRunExecutionContext(
    createRunContext(RunId.of(args.runId), args.contextOverrides),
    planRef
  );
  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: args.taskQueue,
    TEMPORAL_IDENTITY: 'adapter-temporal-it',
    ...args.temporalEnv,
  });

  const createWorker = (options?: SingleRunDbtTimeSkippingWorkerOptions): TemporalWorkerHost => {
    const activityDeps = createDbtActivityDeps({
      store,
      outbox,
      bindings: [{ ctx, planRef, planBytes }],
      ...(options?.dbtPluginRunner === undefined
        ? {}
        : { dbtPluginRunner: options.dbtPluginRunner }),
    });

    return createTenantWorkerHost({
      temporalConfig,
      tenantId: ctx.tenantId,
      workflowsPath: WORKFLOW_PATH,
      activityDeps,
      stepActivitiesByKind: activityDeps.stepActivitiesByKind,
      ...(options?.stepExecutors === undefined ? {} : { stepExecutors: options.stepExecutors }),
    });
  };

  return {
    adapter: new TemporalAdapter({
      workflowClient: env.client.workflow,
      config: temporalConfig,
    }),
    ctx,
    env,
    outbox,
    planBytes,
    planRef,
    store,
    temporalConfig,
    createWorker,
    async startWorker(
      options?: SingleRunDbtTimeSkippingWorkerOptions
    ): Promise<TemporalWorkerHost> {
      const worker = createWorker(options);
      await worker.start(env.nativeConnection);
      return worker;
    },
  };
}
