/**
 * @file packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0010: Run Event Envelope Split
 * @baseline ADR-0011: RunStarted Ownership
 * @decision Capability-specific Postgres integration owns its runtime prerequisites
 * @consequence The general Temporal integration command stays hermetic
 */

import type { ExecutionPlan } from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import { loadTemporalAdapterConfig, TemporalAdapter } from '../src/index.js';

import {
  assertWorkflowArtifactPresentInCi,
  createActivityDeps,
  createPlanRef,
  createRunContext,
  createTenantWorkerHost,
  INTEGRATION_TEST_TIMEOUT,
  mkPostgresTransformationPlan,
  RunId,
  TestOutbox,
  TestProjector,
  TestStateStore,
  waitForCondition,
  WORKFLOW_PATH,
} from './integration.time-skipping.shared.js';

assertWorkflowArtifactPresentInCi();

type RunEvents = Awaited<ReturnType<TestStateStore['listRunEvents']>>;

function resolvePostgresConnectionString(): string {
  return (
    process.env.DVT_PG_URL ?? process.env.DATABASE_URL ?? 'postgresql://dvt:dvt@localhost:5432/dvt'
  );
}

async function createPostgresCapabilityHarness(connectionString: string): Promise<{
  adapter: TemporalAdapter;
  capability: {
    close: () => Promise<void>;
    stepActivitiesByKind: NonNullable<
      Parameters<typeof createTenantWorkerHost>[0]['stepActivitiesByKind']
    >;
  };
  ctx: ReturnType<typeof createRunContext>;
  env: TestWorkflowEnvironment;
  plan: ExecutionPlan;
  planRef: ReturnType<typeof createPlanRef>;
  projector: TestProjector;
  schema: string;
  sinkTable: string;
  store: TestStateStore;
  worker: ReturnType<typeof createTenantWorkerHost>;
}> {
  const env = await TestWorkflowEnvironment.createTimeSkipping();

  const store = new TestStateStore();
  const outbox = new TestOutbox();
  const projector = new TestProjector();
  const ctx = createRunContext(RunId.of('run-it-postgres-relational-runtime'), {
    tenantId: 't-it',
    environmentId: 'env-it',
  });
  const schema = `it_runtime_${ctx.runId.replaceAll(/\W/g, '_')}`;
  const sinkTable = 'orders_daily';
  const plan = mkPostgresTransformationPlan(schema, sinkTable);
  const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
  const planRef = createPlanRef('it-plan-postgres-transform', planBytes);
  const { PostgresRelationalExecutionCapability } = await import('@dvt/adapter-postgres');
  const capability = new PostgresRelationalExecutionCapability({
    connectionString,
    nowIsoUtc: () => '2026-04-09T00:00:00.000Z',
  });

  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_NAMESPACE: 'default',
    TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-postgres-transform',
    TEMPORAL_IDENTITY: 'adapter-temporal-it',
  });

  const worker = createTenantWorkerHost({
    temporalConfig,
    tenantId: ctx.tenantId,
    workflowsPath: WORKFLOW_PATH,
    activityDeps: createActivityDeps(store, outbox, planBytes),
    stepActivitiesByKind: capability.stepActivitiesByKind,
  });

  await worker.start(env.nativeConnection);

  const adapter = new TemporalAdapter({
    workflowClient: env.client.workflow,
    config: temporalConfig,
  });

  return {
    adapter,
    capability,
    ctx,
    env,
    plan,
    planRef,
    projector,
    schema,
    sinkTable,
    store,
    worker,
  };
}

function expectPostgresCompletion(args: {
  events: RunEvents;
  projector: TestProjector;
  runId: string;
  schema: string;
  sinkTable: string;
}): void {
  const { events, projector, runId, schema, sinkTable } = args;
  const stepThreeEvidence = events.find(
    (event) => event.eventType === 'StepCompleted' && event.stepId === 's-3'
  )?.payload;

  expect(events.map((event) => `${event.eventType}:${event.stepId ?? '-'}`)).toEqual([
    'RunStarted:-',
    'StepStarted:s-1',
    'StepCompleted:s-1',
    'StepStarted:s-2',
    'StepCompleted:s-2',
    'StepStarted:s-3',
    'StepCompleted:s-3',
    'RunCompleted:-',
  ]);
  expect(events.every((event, index) => event.runSeq === index + 1)).toBe(true);
  expect(events.find((event) => event.eventType === 'RunStarted')?.payload).toMatchObject({
    executor: 'postgres',
  });
  expect(stepThreeEvidence).toMatchObject({
    resultEvidence: {
      executor: 'postgres',
      environmentId: 'env-it',
      sinkTable: `${schema}.${sinkTable}`,
      rowsWritten: 2,
    },
  });
  expect(events.find((event) => event.eventType === 'RunCompleted')?.payload).toMatchObject({
    executor: 'postgres',
    resultEvidence: {
      executor: 'postgres',
      environmentId: 'env-it',
      sinkTable: `${schema}.${sinkTable}`,
      rowsWritten: 2,
    },
  });

  const projected = projector.rebuild(runId, events);
  expect(projected.status).toBe('COMPLETED');
}

describe('temporal integration (postgres capability)', () => {
  it(
    'golden path: postgres relational capability executes through the Temporal runtime',
    async () => {
      const connectionString = resolvePostgresConnectionString();
      if (!connectionString) {
        throw new Error('DVT_PG_URL or DATABASE_URL is required for Postgres runtime integration');
      }

      const {
        adapter,
        capability,
        ctx,
        env,
        planRef,
        projector,
        schema,
        sinkTable,
        store,
        worker,
      } = await createPostgresCapabilityHarness(connectionString);

      try {
        await adapter.startRun(planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expectPostgresCompletion({
          events,
          projector,
          runId: ctx.runId,
          schema,
          sinkTable,
        });
      } finally {
        await capability.close();
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
