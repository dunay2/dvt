import { describe, expect, it } from 'vitest';

import {
  DesignGraphDraftSchema,
  RunExecutionContextSchema,
  TransformationSqlFirstCompilerGraphSourceSchema,
  type ConnectionRef,
  type TransformationSqlFirstCompilerGraphSourceV2,
} from '../src/index.js';

const connectionA = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;

function graphSource(
  connectionRef: ConnectionRef = connectionA
): TransformationSqlFirstCompilerGraphSourceV2 {
  return {
    kind: 'generic-graph-v1',
    sourceFamily: 'transformation-design-graph',
    sourceVersion: 'transformation-sql-first-v2',
    nodes: [
      {
        nodeId: 'source-1',
        stepKind: 'PREPARE_POSTGRES_TRANSFORM',
        dependsOn: [],
        stepTypeConfig: {
          connectionRef,
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
          connectionRef,
          dialect: 'postgres',
          entrypoint: 'models/orders.sql',
          sql: 'select * from raw.orders',
          sqlArtifact: {
            repo: 'org/repo',
            path: 'models/orders.sql',
            ref: 'refs/heads/main',
            commitSha: 'commit-sql-1',
            contentSha256: 'c'.repeat(64),
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
          connectionRef,
          sinkSchema: 'analytics',
          sinkTable: 'orders_daily',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    ],
  } as const;
}

describe('SQL-first PostgreSQL connection authority', () => {
  it('accepts v2 only when every step carries the same PostgreSQL ConnectionRef', () => {
    expect(TransformationSqlFirstCompilerGraphSourceSchema.parse(graphSource())).toBeDefined();

    const legacy = { ...graphSource(), sourceVersion: 'transformation-sql-first-v1' };
    expect(TransformationSqlFirstCompilerGraphSourceSchema.safeParse(legacy).success).toBe(false);
  });

  it('rejects missing, non-PostgreSQL, or divergent step connection identities', () => {
    const missing = graphSource();
    const { connectionRef: _omitted, ...transformConfig } = missing.nodes[1].stepTypeConfig;
    const missingGraph = {
      ...missing,
      nodes: [
        missing.nodes[0],
        { ...missing.nodes[1], stepTypeConfig: transformConfig },
        missing.nodes[2],
      ],
    };
    expect(TransformationSqlFirstCompilerGraphSourceSchema.safeParse(missingGraph).success).toBe(
      false
    );

    const nonPostgres = graphSource({ ...connectionA, provider: 'mysql' });
    expect(TransformationSqlFirstCompilerGraphSourceSchema.safeParse(nonPostgres).success).toBe(
      false
    );

    const divergent = graphSource();
    const divergentGraph = {
      ...divergent,
      nodes: [
        divergent.nodes[0],
        {
          ...divergent.nodes[1],
          stepTypeConfig: {
            ...divergent.nodes[1].stepTypeConfig,
            connectionRef: { ...connectionA, connectionId: 'warehouse-b' },
          },
        },
        divergent.nodes[2],
      ],
    };
    expect(TransformationSqlFirstCompilerGraphSourceSchema.safeParse(divergentGraph).success).toBe(
      false
    );
  });

  it('requires the design source node to own the PostgreSQL ConnectionRef', () => {
    const parsed = DesignGraphDraftSchema.parse({
      context: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        executionTarget: 'postgres',
      },
      nodes: [
        {
          id: 'source-1',
          type: 'source',
          payload: {
            kind: 'postgres_table',
            connectionRef: connectionA,
            schema: 'raw',
            table: 'orders',
            alias: 'orders_src',
          },
        },
        {
          id: 'transform-1',
          type: 'sql_transform',
          payload: {
            dialect: 'postgres',
            entrypoint: 'models/orders.sql',
            sqlArtifact: {
              repo: 'org/repo',
              path: 'models/orders.sql',
              ref: 'refs/heads/main',
              commitSha: 'commit-sql-1',
              contentSha256: 'a'.repeat(64),
            },
          },
        },
        {
          id: 'sink-1',
          type: 'sink',
          payload: {
            kind: 'postgres_table',
            schema: 'analytics',
            table: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ],
      edges: [
        { fromNodeId: 'source-1', toNodeId: 'transform-1' },
        { fromNodeId: 'transform-1', toNodeId: 'sink-1' },
      ],
    });

    expect(parsed.nodes[0]).toMatchObject({
      type: 'source',
      payload: { connectionRef: connectionA },
    });
  });

  it('accepts only a governed PostgreSQL plugin context in the v1 runtime envelope', () => {
    const base = {
      schemaVersion: 'v1.0',
      planId: 'plan-a',
      planVersion: '1.0',
      planSha256: 'a'.repeat(64),
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      targetAdapter: 'temporal',
      createdAtIso: '2026-08-14T10:00:00.000Z',
      createdBy: 'planner-runtime',
      pluginContexts: {
        postgres: {
          connectionRef: connectionA,
          credentialRef: 'postgres:warehouse-a',
        },
      },
    } as const;

    expect(RunExecutionContextSchema.safeParse(base).success).toBe(true);
    expect(
      RunExecutionContextSchema.safeParse({
        ...base,
        pluginContexts: {
          postgres: { ...base.pluginContexts.postgres, credentialRef: 'env:WAREHOUSE_URL' },
        },
      }).success
    ).toBe(false);
  });
});
