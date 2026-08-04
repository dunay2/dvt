import { PostgresPlanStore, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import { asIsoUtcString, asNonBlankString, type ExecutionPlan, type PlanRef } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

export async function storeValidPlanArtifact(args: {
  connectionString: string;
  schema: string;
  plan: ExecutionPlan;
  tenantId: string;
  projectId: string;
  environmentId: string;
}): Promise<PlanRef> {
  const store = new PostgresPlanStore({
    connectionString: args.connectionString,
    schema: args.schema,
    toExecutablePlan: (buildResult) => ({
      schemaVersion: buildResult.plan.metadata.schemaVersion,
      text: JSON.stringify(buildResult.plan),
    }),
  });

  try {
    await store.migrate();
    const planRef = await store.storePlanArtifact({
      buildResult: {
        plan: args.plan,
        executionPolicy: {},
        canonicalPlanCoreJson: jcsCanonicalize({
          metadata: {
            planVersion: args.plan.metadata.planVersion,
            inputHashSha256: args.plan.metadata.inputHashSha256,
          },
          steps: args.plan.steps,
        }),
      },
    });
    await store.markStoredPlanArtifactValid({
      tenantId: args.tenantId,
      projectId: args.projectId,
      environmentId: args.environmentId,
      planRef,
    });
    return planRef;
  } finally {
    await store.close();
  }
}

export async function bootstrapRunMetadata(args: {
  connectionString: string;
  schema: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  namespace: string;
  taskQueue: string;
  runId: string;
  planRef: PlanRef;
}): Promise<void> {
  const stateStore = new PostgresStateStoreAdapter({
    connectionString: args.connectionString,
    schema: args.schema,
  });

  try {
    await stateStore.migrate();
    await stateStore.bootstrapRunTx({
      metadata: {
        tenantId: args.tenantId,
        projectId: args.projectId,
        environmentId: args.environmentId,
        runId: args.runId,
        planId: args.planRef.planId,
        planVersion: args.planRef.planVersion,
        logicalAttemptId: 1,
        originRunId: args.runId,
        providerRef: {
          provider: 'temporal',
          tenantId: asNonBlankString(args.tenantId),
          namespace: asNonBlankString(args.namespace),
          workflowId: asNonBlankString(args.runId),
          runId: asNonBlankString(args.runId),
          taskQueue: asNonBlankString(args.taskQueue),
        },
        createdAt: asIsoUtcString('2026-08-04T00:00:00.000Z'),
      },
      firstEvents: [],
    });
  } finally {
    await stateStore.close();
  }
}

export async function waitForRunCompleted(args: {
  connectionString: string;
  schema: string;
  tenantId: string;
  runId: string;
  timeoutMs?: number;
}): Promise<Awaited<ReturnType<PostgresStateStoreAdapter['listEvents']>>> {
  const stateStore = new PostgresStateStoreAdapter({
    connectionString: args.connectionString,
    schema: args.schema,
    assumeSchemaReady: true,
  });

  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= (args.timeoutMs ?? 60_000)) {
      const events = await stateStore.listEvents(args.tenantId, args.runId);
      if (events.some((event) => event.eventType === 'RunCompleted')) {
        return events;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Run ${args.runId} did not complete before timeout.`);
  } finally {
    await stateStore.close();
  }
}
