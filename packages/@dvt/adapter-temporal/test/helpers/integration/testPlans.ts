import { createHash } from 'node:crypto';

import type { PlanRef, ResolvedRunContext } from '@dvt/contracts';

import { RunId } from './runtimeState.js';

export function createPlanRef(
  planId: string,
  planBytes: Uint8Array,
  options?: {
    uri?: string;
  }
): PlanRef {
  return {
    uri: options?.uri ?? `memory://plans/${planId}.json`,
    sha256: sha256Hex(planBytes),
    schemaVersion: 'v1.2',
    planId,
    planVersion: '1.0.0',
    sizeBytes: planBytes.byteLength,
  };
}

export function createRunContext(runId: RunId): ResolvedRunContext {
  return {
    tenantId: 't-it',
    projectId: 'p-it',
    environmentId: 'test',
    runId: runId.value,
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    originRunId: runId.value,
  };
}

export function mkLinearThreeStepPlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-linear-3',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [
      { stepId: 's-1', kind: 'DBT_MODEL' },
      { stepId: 's-2', kind: 'DBT_MODEL', dependsOn: ['s-1'] },
      { stepId: 's-3', kind: 'DBT_MODEL', dependsOn: ['s-2'] },
    ],
  } as const;
}

export function mkPermanentFailurePlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-permanent-failure',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [{ stepId: 's-fail', kind: 'DBT_MODEL' }],
  } as const;
}

export function mkPostgresTransformationPlan(schema: string, sinkTable: string): unknown {
  return withTransformationRuntimeBinding(
    {
      metadata: {
        planId: 'it-plan-postgres-transform',
        planVersion: '1.0.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
      },
      steps: [
        {
          stepId: 's-1',
          kind: 'PREPARE_POSTGRES_TRANSFORM',
          stepTypeConfig: {
            targetSchema: schema,
          },
        },
        {
          stepId: 's-2',
          kind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['s-1'],
          stepTypeConfig: {
            sql: 'SELECT 1 AS order_id UNION ALL SELECT 2 AS order_id',
            sinkSchema: schema,
            sinkTable,
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {
          stepId: 's-3',
          kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['s-2'],
          stepTypeConfig: {
            sinkSchema: schema,
            sinkTable,
          },
        },
      ],
    } as const,
    'postgres'
  );
}

export function withTransformationRuntimeBinding<T extends Record<string, unknown>>(
  plan: T,
  executor: 'postgres' | 'dbt'
): T {
  const currentObservability =
    typeof plan['observability'] === 'object' && plan['observability'] !== null
      ? (plan['observability'] as Record<string, unknown>)
      : {};
  const currentExtra =
    typeof currentObservability['extra'] === 'object' && currentObservability['extra'] !== null
      ? (currentObservability['extra'] as Record<string, unknown>)
      : {};

  return {
    ...plan,
    observability: {
      ...currentObservability,
      extra: {
        ...currentExtra,
        transformationFlowRuntime: {
          previewProfile: 'transformation-sql-first-v1',
          executor,
        },
      },
    },
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
