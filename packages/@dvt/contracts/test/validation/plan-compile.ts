import { describe, expect, it } from 'vitest';

import { CURRENT_EXECUTION_PLAN_SCHEMA_VERSION } from '../../src/index.js';
import {
  ContractValidationError,
  parsePlanCompileRequest,
  parsePlanCompileResponse,
} from '../../src/validation.js';

const POSTGRES_CONNECTION_REF = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;

const TRANSFORMATION_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dvt-substrait',
  sourceVersion: 'substrait-v1',
  nodes: [
    {
      nodeId: 'source-1',
      stepKind: 'PREPARE_POSTGRES_TRANSFORM',
      dependsOn: [],
      stepTypeConfig: {
        connectionRef: POSTGRES_CONNECTION_REF,
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
        connectionRef: POSTGRES_CONNECTION_REF,
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
        connectionRef: POSTGRES_CONNECTION_REF,
        sinkSchema: 'analytics',
        sinkTable: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ],
} as const;

const SPARK_GRAPH_SOURCE = {
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

const COMPILED_PLAN = {
  metadata: {
    planVersion: '1.0',
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
    contractVersion: '1.0.0',
    inputHashSha256: 'f'.repeat(64),
    planId: '1'.repeat(64),
    createdAtIso: '2026-04-17T12:00:00.000Z',
  },
  steps: [
    {
      stepId: 'source-1',
      kind: 'PREPARE_POSTGRES_TRANSFORM',
      dependsOn: [],
      stepTypeConfig: TRANSFORMATION_GRAPH_SOURCE.nodes[0].stepTypeConfig,
    },
    {
      stepId: 'transform-1',
      kind: 'POSTGRES_SQL_TRANSFORM',
      dependsOn: ['source-1'],
      stepTypeConfig: TRANSFORMATION_GRAPH_SOURCE.nodes[1].stepTypeConfig,
    },
    {
      stepId: 'sink-1',
      kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
      dependsOn: ['transform-1'],
      stepTypeConfig: TRANSFORMATION_GRAPH_SOURCE.nodes[2].stepTypeConfig,
    },
  ],
} as const;

export function registerValidationPlanCompileSuite(): void {
  describe('plan compile contracts', () => {
    it('parses a compile request with generic graph source and scope context', () => {
      const request = parsePlanCompileRequest({
        context: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
        },
        selection: {
          selectedNodeIds: ['source-1', 'transform-1', 'sink-1'],
        },
        graphSource: TRANSFORMATION_GRAPH_SOURCE,
      });

      expect(request.context.tenantId).toBe('tenant-a');
      expect(request.graphSource).toEqual(TRANSFORMATION_GRAPH_SOURCE);
    });

    it('rejects compile requests with preview-only fields', () => {
      expect(() =>
        parsePlanCompileRequest({
          context: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'env-a',
          },
          selection: {
            selectedNodeIds: ['source-1', 'transform-1', 'sink-1'],
          },
          graphSource: TRANSFORMATION_GRAPH_SOURCE,
          previewProfile: 'planner-generic-v1',
        })
      ).toThrow(ContractValidationError);
    });

    it('parses a compile request for a non-dbt spark graph source', () => {
      const request = parsePlanCompileRequest({
        context: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
        },
        selection: {
          selectedNodeIds: ['spark-job-1'],
        },
        graphSource: SPARK_GRAPH_SOURCE,
      });

      expect(request.graphSource.sourceFamily).toBe('spark-job-graph');
      expect(request.graphSource.nodes[0]?.stepKind).toBe('SPARK_JOB');
    });

    it('parses compile response as non-persisted and non-executability-validated', () => {
      const response = parsePlanCompileResponse({
        plan: COMPILED_PLAN,
        compile: {
          persisted: false,
          executabilityValidated: false,
        },
      });

      expect(response.compile).toEqual({
        persisted: false,
        executabilityValidated: false,
      });
      expect(response.plan.metadata.planId).toBe(COMPILED_PLAN.metadata.planId);
    });
  });
}
