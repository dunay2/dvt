import { CURRENT_EXECUTION_PLAN_SCHEMA_VERSION, type ExecutionPlan } from '@dvt/contracts';

function buildPlanMetadata(): ExecutionPlan['metadata'] {
  return {
    planId: VALID_PLAN_REF.planId,
    planVersion: VALID_PLAN_REF.planVersion,
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
    contractVersion: '1.0.0',
    inputHashSha256: VALID_PLAN_REF.sha256,
    createdAtIso: '2026-04-05T00:00:00.000Z',
    ownership: buildPlanOwnership(),
  } as const;
}

export const VALID_PLAN_REF = {
  uri: 'dvt-plan://plans/plan-1',
  sha256: 'a'.repeat(64),
  schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  planId: 'b'.repeat(64),
  planVersion: '1.0',
} as const;

export const PREVIEW_PROFILE_GENERIC = 'planner-generic-v1' as const;

export const VALID_PREVIEW_CONTEXT = {
  runId: 'run_1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  targetAdapter: 'temporal',
} as const;

export const VALID_COMPILE_CONTEXT = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
} as const;

type PlanOwnershipOverride = Partial<{
  tenantId: string;
  projectId: string;
  environmentId: string;
}>;

function buildPlanOwnership(
  overrides: PlanOwnershipOverride = {}
): NonNullable<ExecutionPlan['metadata']['ownership']> {
  return {
    tenantId: overrides.tenantId ?? VALID_COMPILE_CONTEXT.tenantId,
    projectId: overrides.projectId ?? VALID_COMPILE_CONTEXT.projectId,
    environmentId: overrides.environmentId ?? VALID_COMPILE_CONTEXT.environmentId,
  } as const;
}

export const VALID_DBT_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dbt',
  sourceVersion: 'manifest-v10',
  nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
} as const;

export const VALID_PREVIEW_PROVENANCE = {
  kind: 'transformation-git-artifacts',
  graphArtifact: {
    repo: 'org/repo',
    ref: 'refs/heads/main',
    path: 'models/graph.yml',
    commitSha: 'commit-graph-1',
    contentSha256: 'c'.repeat(64),
  },
  sqlArtifact: {
    repo: 'org/repo',
    ref: 'refs/heads/main',
    path: 'models/model.sql',
    commitSha: 'commit-sql-1',
    contentSha256: 'd'.repeat(64),
  },
} as const;

export const VALID_POSTGRES_CONNECTION_REF = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;

export const VALID_TRANSFORMATION_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dvt-substrait',
  sourceVersion: 'substrait-v1',
  nodes: [
    {
      nodeId: 'source-node',
      stepKind: 'PREPARE_POSTGRES_TRANSFORM',
      dependsOn: [],
      stepTypeConfig: {
        connectionRef: VALID_POSTGRES_CONNECTION_REF,
        targetSchema: 'analytics',
        sourceSchema: 'raw',
        sourceTable: 'orders',
        sourceAlias: 'orders_src',
      },
    },
    {
      nodeId: 'transform-node',
      stepKind: 'POSTGRES_SQL_TRANSFORM',
      dependsOn: ['source-node'],
      stepTypeConfig: {
        connectionRef: VALID_POSTGRES_CONNECTION_REF,
        dialect: 'postgres',
        entrypoint: 'models/model.sql',
        sql: 'select * from raw.orders',
        sqlArtifact: VALID_PREVIEW_PROVENANCE.sqlArtifact,
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
      nodeId: 'sink-node',
      stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
      dependsOn: ['transform-node'],
      stepTypeConfig: {
        connectionRef: VALID_POSTGRES_CONNECTION_REF,
        sinkSchema: 'analytics',
        sinkTable: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ],
} as const;

export const VALID_SPARK_GRAPH_SOURCE = {
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
} as const;

export function buildPreviewBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    context: { ...VALID_PREVIEW_CONTEXT },
    previewProfile: PREVIEW_PROFILE_GENERIC,
    selection: {
      mode: 'explicit',
      nodeIds: ['node_1'],
    },
    graphSource: VALID_DBT_GRAPH_SOURCE,
    persist: true,
    ...overrides,
  };
}

export function buildCompileBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    context: { ...VALID_COMPILE_CONTEXT },
    selection: { selectedNodeIds: ['source-node', 'transform-node', 'sink-node'] },
    graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
    ...overrides,
  };
}

export function buildImportBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    context: { ...VALID_PREVIEW_CONTEXT },
    planRef: VALID_PLAN_REF,
    ...overrides,
  };
}

export function buildStoredPlan(): ExecutionPlan {
  return {
    metadata: buildPlanMetadata(),
    steps: [],
  } as const;
}

export function buildTransformationStoredPlan(): ExecutionPlan {
  return {
    metadata: buildPlanMetadata(),
    steps: [
      {
        stepId: 'source-node',
        kind: 'PREPARE_POSTGRES_TRANSFORM',
        dependsOn: [],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[0].stepTypeConfig,
      },
      {
        stepId: 'transform-node',
        kind: 'POSTGRES_SQL_TRANSFORM',
        dependsOn: ['source-node'],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[1].stepTypeConfig,
      },
      {
        stepId: 'sink-node',
        kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
        dependsOn: ['transform-node'],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[2].stepTypeConfig,
      },
    ],
  } as const;
}

export function buildImportedPlan(
  input: {
    ownership?: PlanOwnershipOverride;
    scopeTags?: Record<string, string>;
  } = {}
): ExecutionPlan {
  const scopeTags = input.scopeTags ?? {};
  return {
    metadata: {
      ...buildPlanMetadata(),
      ownership: buildPlanOwnership(input.ownership),
    },
    steps: [],
    ...(Object.keys(scopeTags).length === 0
      ? {}
      : {
          observability: {
            tags: scopeTags,
          },
        }),
  };
}
