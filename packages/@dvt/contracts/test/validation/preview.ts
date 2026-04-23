import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseDesignGraphDraft,
  parsePlanPreviewPersistResponse,
  parsePlanPreviewRequest,
} from '../../src/validation.js';

const transformationGraphSource = {
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
        sinkSchema: 'analytics',
        sinkTable: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ],
} as const;

const transformationPlan = {
  metadata: {
    planVersion: '1.0',
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
    inputHashSha256: 'f'.repeat(64),
    planId: '1'.repeat(64),
    createdAtIso: '2026-04-05T10:00:00.000Z',
  },
  steps: [
    {
      stepId: 'source-1',
      kind: 'PREPARE_POSTGRES_TRANSFORM',
      dependsOn: [],
      stepTypeConfig: transformationGraphSource.nodes[0].stepTypeConfig,
    },
    {
      stepId: 'transform-1',
      kind: 'POSTGRES_SQL_TRANSFORM',
      dependsOn: ['source-1'],
      stepTypeConfig: transformationGraphSource.nodes[1].stepTypeConfig,
    },
    {
      stepId: 'sink-1',
      kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
      dependsOn: ['transform-1'],
      stepTypeConfig: transformationGraphSource.nodes[2].stepTypeConfig,
    },
  ],
} as const;

export function registerValidationPreviewSuite(): void {
  describe('preview and design-graph contracts', () => {
    it('parses DesignGraphDraft for the governed source -> sql_transform -> sink shape', () => {
      const draft = parseDesignGraphDraft({
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

      expect(draft.nodes).toHaveLength(3);
      expect(draft.edges).toHaveLength(2);
    });

    it('rejects DesignGraphDraft when edges break the governed chain', () => {
      expect(() =>
        parseDesignGraphDraft({
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
            { fromNodeId: 'source-1', toNodeId: 'sink-1' },
            { fromNodeId: 'transform-1', toNodeId: 'sink-1' },
          ],
        })
      ).toThrow(ContractValidationError);
    });

    it('parses transformation preview request when provenance and graph identity are explicit', () => {
      const request = parsePlanPreviewRequest({
        previewProfile: 'transformation-sql-first-v1',
        context: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
          targetAdapter: 'temporal',
        },
        selection: {
          mode: 'explicit',
          nodeIds: ['source-1', 'transform-1', 'sink-1'],
        },
        graphSource: transformationGraphSource,
        provenance: {
          graphArtifact: {
            repo: 'org/repo',
            path: 'graphs/orders.yml',
            ref: 'refs/heads/main',
            commitSha: 'commit-graph-1',
            contentSha256: 'b'.repeat(64),
          },
          sqlArtifact: {
            repo: 'org/repo',
            path: 'models/orders.sql',
            ref: 'refs/heads/main',
            commitSha: 'commit-sql-1',
            contentSha256: 'c'.repeat(64),
          },
        },
        persist: true,
      });

      expect(request.previewProfile).toBe('transformation-sql-first-v1');
      expect(request.provenance?.graphArtifact.path).toBe('graphs/orders.yml');
    });

    it('rejects transformation preview request when provenance is missing', () => {
      expect(() =>
        parsePlanPreviewRequest({
          previewProfile: 'transformation-sql-first-v1',
          context: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'prod',
            runId: 'run-1',
            targetAdapter: 'temporal',
          },
          selection: {
            mode: 'explicit',
            nodeIds: ['source-1', 'transform-1', 'sink-1'],
          },
          graphSource: transformationGraphSource,
          persist: true,
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects transformation preview response when required provenance is missing', () => {
      expect(() =>
        parsePlanPreviewPersistResponse({
          previewProfile: 'transformation-sql-first-v1',
          plan: transformationPlan,
          planRef: {
            uri: 'dvt-plan://plans/plan-1',
            sha256: 'd'.repeat(64),
            schemaVersion: 'v1.2',
            planId: transformationPlan.metadata.planId,
            planVersion: transformationPlan.metadata.planVersion,
          },
          planSummary: {
            executor: 'postgres',
            nodeCount: 3,
            stepCount: transformationPlan.steps.length,
            sourceTables: ['raw.orders'],
            sinkTables: ['analytics.orders_daily'],
          },
          persisted: {
            planRecordId: transformationPlan.metadata.planId,
            canonicalPlanSha256: 'e'.repeat(64),
          },
          validation: {
            valid: true,
            warnings: [],
          },
        })
      ).toThrow(ContractValidationError);
    });
  });
}
