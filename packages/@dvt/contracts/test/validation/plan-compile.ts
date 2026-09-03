import { describe, expect, it } from 'vitest';

import { CURRENT_EXECUTION_PLAN_SCHEMA_VERSION } from '../../src/index.js';
import {
  ContractValidationError,
  parsePlanCompileRequest,
  parsePlanCompileResponse,
} from '../../src/validation.js';

const GRAPH_SOURCE = {
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
      stepId: 'spark-job-1',
      kind: 'SPARK_JOB',
      dependsOn: [],
      stepTypeConfig: GRAPH_SOURCE.nodes[0].stepTypeConfig,
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
          selectedNodeIds: ['spark-job-1'],
        },
        graphSource: GRAPH_SOURCE,
      });

      expect(request.context.tenantId).toBe('tenant-a');
      expect(request.graphSource).toEqual(GRAPH_SOURCE);
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
            selectedNodeIds: ['spark-job-1'],
          },
          graphSource: GRAPH_SOURCE,
          previewProfile: 'planner-generic-v1',
        })
      ).toThrow(ContractValidationError);
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
