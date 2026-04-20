import { CURRENT_EXECUTION_PLAN_SCHEMA_VERSION } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { CompilePlanUseCase } from '../../../src/application/services/CompilePlanUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const AUTHORIZED_CONTEXT = {
  principal: {
    principalId: 'principal-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-04-19T01:00:00.000Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-compile-1',
  authorizedAt: new Date('2026-04-19T00:00:00.000Z'),
};

const COMPILED_PLAN = {
  metadata: {
    planVersion: '1.0',
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
    contractVersion: '1.0.0',
    inputHashSha256: 'f'.repeat(64),
    planId: '1'.repeat(64),
    createdAtIso: '2026-04-19T00:00:00.000Z',
  },
  steps: [
    {
      stepId: 'spark-job-1',
      kind: 'SPARK_JOB',
      dependsOn: [],
      stepTypeConfig: {
        application: 'orders-daily',
        entrypoint: 'jobs/orders.py',
        runtime: 'python',
      },
    },
  ],
} as const;

const COMPILE_COMMAND = {
  graphSource: {
    kind: 'generic-graph-v1' as const,
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
  selection: {
    selectedNodeIds: ['spark-job-1'],
  },
  policies: undefined,
  environment: undefined,
  observability: undefined,
} as const;

describe('CompilePlanUseCase', () => {
  it('delegates compile-only planning through the canonical planner envelope', async () => {
    const planner = {
      buildPlan: vi.fn(async () => ({
        plan: COMPILED_PLAN,
        executionPolicy: { requiresCapabilities: ['spark.submit'] },
        canonicalPlanCoreJson: '{}',
      })),
    };

    const useCase = new CompilePlanUseCase({
      planner: planner as never,
    });

    const result = await useCase.execute(COMPILE_COMMAND, AUTHORIZED_CONTEXT);

    expect(result).toEqual({
      plan: COMPILED_PLAN,
    });
    expect(planner.buildPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: COMPILE_COMMAND.graphSource,
        selection: COMPILE_COMMAND.selection,
        requestedBy: 'principal-1',
        requestId: 'req-compile-1',
        requestedAtIso: '2026-04-19T00:00:00.000Z',
      })
    );
  });

  it('preserves custom observability keys when building the planner envelope', async () => {
    const planner = {
      buildPlan: vi.fn(async () => ({
        plan: COMPILED_PLAN,
        executionPolicy: { requiresCapabilities: ['spark.submit'] },
        canonicalPlanCoreJson: '{}',
      })),
    };

    const useCase = new CompilePlanUseCase({
      planner: planner as never,
    });

    await useCase.execute(
      {
        ...COMPILE_COMMAND,
        observability: {
          tags: { surface: 'compile' },
          extra: { traceParent: '00-abcdef' },
          correlationKey: 'ext-compile-123',
        },
      },
      AUTHORIZED_CONTEXT
    );

    expect(planner.buildPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        observability: expect.objectContaining({
          tags: { surface: 'compile' },
          extra: { traceParent: '00-abcdef' },
          correlationKey: 'ext-compile-123',
        }),
      })
    );
  });
});
