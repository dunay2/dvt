import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseExternalPlanCompileRequest,
  parseExternalPlanCompileResponse,
} from '../../src/validation.js';

const TRANSFORMATION_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'transformation-design-graph',
  sourceVersion: 'transformation-sql-first-v1',
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
} as const;

const COMPILED_PLAN = {
  metadata: {
    planVersion: '1.0',
    schemaVersion: 'v1.2',
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

export function registerValidationExternalPlanCompileSuite(): void {
  describe('external compile contracts', () => {
    it('parses a compile request with generic graph source and scope context', () => {
      const request = parseExternalPlanCompileRequest({
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
      expect(request.graphSource.sourceFamily).toBe('transformation-design-graph');
    });

    it('rejects compile requests with preview-only fields', () => {
      expect(() =>
        parseExternalPlanCompileRequest({
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

    it('parses compile response as non-persisted and non-executability-validated', () => {
      const response = parseExternalPlanCompileResponse({
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
