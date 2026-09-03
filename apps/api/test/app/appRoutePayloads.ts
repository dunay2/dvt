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
      selectedNodeIds: ['source-1', 'transform-1', 'sink-1'],
    },
    graphSource: {
      kind: 'generic-graph-v1',
      sourceFamily: 'dvt-substrait',
      sourceVersion: 'substrait-v1',
      nodes: [
        {
          nodeId: 'source-1',
          stepKind: 'PREPARE_POSTGRES_TRANSFORM',
          dependsOn: [],
          stepTypeConfig: {
            targetSchema: 'analytics',
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders_src',
          },
        },
        {
          nodeId: 'transform-1',
          stepKind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['source-1'],
          stepTypeConfig: {
            dialect: 'postgres',
            entrypoint: 'models/orders.sql',
            sql: 'select * from raw.orders',
            sqlArtifact: {
              repo: 'org/repo',
              path: 'models/orders.sql',
              ref: 'refs/heads/main',
              commitSha: 'commit-sql-1',
              contentSha256: 'a'.repeat(64),
            },
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders_src',
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {
          nodeId: 'sink-1',
          stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['transform-1'],
          stepTypeConfig: {
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ],
    },
  };
}
