export function httpError(
  type: string,
  reason: string,
  target?: string
): { error: { type: string; reason: string; target?: string } } {
  return {
    error: {
      type,
      reason,
      ...(target === undefined ? {} : { target }),
    },
  };
}

export function buildStartRunPayload(args: {
  readonly planId: string;
  readonly sha256: string;
}): Record<string, unknown> {
  return {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    selection: {
      mode: 'explicit',
      nodeIds: ['model.orders'],
    },
    planRef: {
      uri: 'https://plans.example.com/plan.json',
      sha256: args.sha256,
      schemaVersion: 'v1.0',
      planId: args.planId,
      planVersion: '1.0',
    },
    targetAdapter: 'temporal',
  };
}

export function buildPreviewPayload(runId: string): Record<string, unknown> {
  return {
    previewProfile: 'planner-generic-v1',
    context: {
      runId,
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      targetAdapter: 'temporal',
    },
    selection: {
      mode: 'explicit',
      nodeIds: ['model.orders'],
    },
    graphSource: {
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: 'manifest-v10',
      nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
    },
    persist: true,
  };
}

export function buildCompilePayload(): Record<string, unknown> {
  return {
    context: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
    },
    selection: {
      selectedNodeIds: ['spark-job-1'],
    },
    graphSource: {
      kind: 'generic-graph-v1',
      sourceFamily: 'spark-job-graph',
      sourceVersion: 'spark-application-v1',
      nodes: [
        {
          nodeId: 'spark-job-1',
          stepKind: 'SPARK_JOB',
          dependsOn: [],
          stepTypeConfig: {
            application: 'orders-daily',
            entrypoint: 'jobs/orders.py',
            runtime: 'python',
          },
        },
      ],
    },
  };
}
