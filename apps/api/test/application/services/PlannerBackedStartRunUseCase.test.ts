import {
  parseExecutionSelection,
  parsePlanRef,
  type PlannerBuildResultV1,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { describe, expect, it, vi } from 'vitest';

import { PlannerBackedStartRunUseCase } from '../../../src/application/services/PlannerBackedStartRunUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const AUTHORIZED_CONTEXT = {
  principal: {
    principalId: 'user-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-03-21T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    resource: 'environment' as const,
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-21T00:00:00Z'),
};

const PLANNER_COMMAND = {
  graphSource: {
    kind: 'generic-graph-v1' as const,
    sourceFamily: 'dbt',
    sourceVersion: 'manifest-v10',
    nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
  },
  runId: 'run-1',
  targetAdapter: 'temporal' as const,
  selection: parseExecutionSelection({
    mode: 'explicit',
    nodeIds: ['model.orders'],
  }),
};

const EXECUTABLE_SUBGRAPH_RESOLVER = {
  execute: vi.fn(async () => ({
    ok: true as const,
    value: {
      selection: PLANNER_COMMAND.selection,
      nodeIds: ['model.orders'],
      edgeIds: [],
      executable: true,
      diagnostics: [],
    },
  })),
};

const STORED_PLAN_REF = parsePlanRef({
  uri: 'dvt-plan://postgres/plan-1',
  sha256: 'abc123',
  schemaVersion: 'v1.2',
  planId: 'plan-1',
  planVersion: '1.0',
});

describe('PlannerBackedStartRunUseCase', () => {
  it('keeps policy-first precedence through planner-backed flow', async () => {
    let capturedBuildResult: PlannerBuildResultV1 | undefined;
    const planStore = {
      storePlan: vi.fn(async (buildResult: PlannerBuildResultV1) => {
        capturedBuildResult = buildResult;
        return STORED_PLAN_REF;
      }),
      markValid: vi.fn(async () => {}),
      markInvalid: vi.fn(async () => {}),
    };

    const useCase = new PlannerBackedStartRunUseCase({
      planner: new PlannerFacade() as never,
      planStore: planStore as never,
      validator: {
        validatePlan: vi.fn(async () => ({
          status: 'OK' as const,
          planId: 'plan-1',
          adapterId: 'temporal',
        })),
      } as never,
      delegate: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
        })),
      } as never,
      executableSubgraphResolver: EXECUTABLE_SUBGRAPH_RESOLVER as never,
    });

    await useCase.execute(
      {
        ...PLANNER_COMMAND,
        policies: {
          retry: { kind: 'at-most-N', maxAttempts: 2 },
          timeout: { kind: 'budget', maxSeconds: 30 },
          concurrency: { kind: 'bounded', maxParallel: 4 },
        },
        graphSource: {
          ...PLANNER_COMMAND.graphSource,
          nodes: [
            {
              nodeId: 'model.orders',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
              stepTypeConfig: {
                stepTimeoutMs: 900000,
                concurrency: 128,
              },
            },
          ],
        },
      },
      AUTHORIZED_CONTEXT
    );

    expect(capturedBuildResult).toBeDefined();
    expect(capturedBuildResult?.plan.steps[0]).toMatchObject({
      kind: 'DBT_MODEL',
      retryPolicy: {
        maxAttempts: 2,
        initialInterval: '1s',
        maximumInterval: '60s',
        backoffCoefficient: 2,
      },
      stepTypeConfig: {
        stepTimeoutMs: 30000,
        concurrency: {
          maxInFlight: 4,
        },
      },
    });
  });

  it('clears node timeout and concurrency when policies are unbounded', async () => {
    let capturedBuildResult: PlannerBuildResultV1 | undefined;
    const planStore = {
      storePlan: vi.fn(async (buildResult: PlannerBuildResultV1) => {
        capturedBuildResult = buildResult;
        return STORED_PLAN_REF;
      }),
      markValid: vi.fn(async () => {}),
      markInvalid: vi.fn(async () => {}),
    };

    const useCase = new PlannerBackedStartRunUseCase({
      planner: new PlannerFacade() as never,
      planStore: planStore as never,
      validator: {
        validatePlan: vi.fn(async () => ({
          status: 'OK' as const,
          planId: 'plan-1',
          adapterId: 'temporal',
        })),
      } as never,
      delegate: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
        })),
      } as never,
      executableSubgraphResolver: EXECUTABLE_SUBGRAPH_RESOLVER as never,
    });

    await useCase.execute(
      {
        ...PLANNER_COMMAND,
        policies: {
          retry: { kind: 'at-most-once' },
          timeout: { kind: 'unbounded' },
          concurrency: { kind: 'unbounded' },
        },
        graphSource: {
          ...PLANNER_COMMAND.graphSource,
          nodes: [
            {
              nodeId: 'model.orders',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
              stepTypeConfig: {
                stepTimeoutMs: 900000,
                concurrency: { maxInFlight: 128 },
              },
            },
          ],
        },
      },
      AUTHORIZED_CONTEXT
    );

    expect(capturedBuildResult).toBeDefined();
    expect(capturedBuildResult?.plan.steps[0]).toMatchObject({
      kind: 'DBT_MODEL',
      retryPolicy: {
        maxAttempts: 1,
        initialInterval: '1s',
        maximumInterval: '60s',
        backoffCoefficient: 2,
      },
    });
    expect(capturedBuildResult?.plan.steps[0]?.stepTypeConfig).not.toHaveProperty('stepTimeoutMs');
    expect(capturedBuildResult?.plan.steps[0]?.stepTypeConfig).not.toHaveProperty('concurrency');
  });

  it('builds, stores, validates and delegates with the stored planRef', async () => {
    const compileTelemetry = { recordPlanCompileLatency: vi.fn() };
    const planner = {
      buildPlan: vi.fn(async () => makeBuildResult('plan-1')),
    };
    const planStore = {
      storePlan: vi.fn(async () => STORED_PLAN_REF),
      markValid: vi.fn(async () => {}),
      markInvalid: vi.fn(async () => {}),
    };
    const validator = {
      validatePlan: vi.fn(async () => ({
        status: 'OK' as const,
        planId: 'plan-1',
        adapterId: 'temporal',
      })),
    };
    const delegate = {
      execute: vi.fn(async () => ({
        ok: true as const,
        value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
      })),
    };

    const useCase = new PlannerBackedStartRunUseCase({
      planner: planner as never,
      planStore: planStore as never,
      validator: validator as never,
      delegate: delegate as never,
      compileTelemetry: compileTelemetry as never,
      executableSubgraphResolver: EXECUTABLE_SUBGRAPH_RESOLVER as never,
    });

    const result = await useCase.execute(PLANNER_COMMAND, AUTHORIZED_CONTEXT);

    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'accepted',
        runId: 'run-1',
        accepted: true,
      },
    });
    expect(planner.buildPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: PLANNER_COMMAND.graphSource,
        selection: { selectedNodeIds: ['model.orders'] },
        requestedBy: 'user-1',
        requestId: 'req-1',
      })
    );
    expect(planStore.storePlan).toHaveBeenCalledTimes(1);
    expect(validator.validatePlan).toHaveBeenCalledWith(STORED_PLAN_REF, 'temporal');
    expect(planStore.markValid).toHaveBeenCalledWith(STORED_PLAN_REF);
    expect(planStore.markInvalid).not.toHaveBeenCalled();
    expect(delegate.execute).toHaveBeenCalledWith(
      {
        runId: PLANNER_COMMAND.runId,
        targetAdapter: PLANNER_COMMAND.targetAdapter,
        selection: PLANNER_COMMAND.selection,
        planRef: STORED_PLAN_REF,
      },
      AUTHORIZED_CONTEXT
    );
    expect(compileTelemetry.recordPlanCompileLatency).toHaveBeenCalledTimes(1);
    expect(compileTelemetry.recordPlanCompileLatency.mock.calls[0]?.[1]).toBe('built');
  });

  it('marks the plan invalid and returns a rejection when validation fails', async () => {
    const rejection = {
      status: 'ERROR' as const,
      planId: 'plan-1',
      adapterId: 'temporal',
      code: 'MISSING_CAPABILITY' as const,
      degradable: false,
      reason: 'Missing adapter capability: workflow.pause',
      cause: 'workflow.pause',
    };
    const planStore = {
      storePlan: vi.fn(async () => STORED_PLAN_REF),
      markValid: vi.fn(async () => {}),
      markInvalid: vi.fn(async () => {}),
    };
    const delegate = {
      execute: vi.fn(async () => ({
        ok: true as const,
        value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
      })),
    };

    const useCase = new PlannerBackedStartRunUseCase({
      planner: {
        buildPlan: vi.fn(async () => makeBuildResult('plan-1')),
      } as never,
      planStore: planStore as never,
      validator: {
        validatePlan: vi.fn(async () => rejection),
      } as never,
      delegate: delegate as never,
      executableSubgraphResolver: EXECUTABLE_SUBGRAPH_RESOLVER as never,
    });

    const result = await useCase.execute(PLANNER_COMMAND, AUTHORIZED_CONTEXT);

    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'MISSING_CAPABILITY',
        reason: 'Missing adapter capability: workflow.pause',
        cause: 'workflow.pause',
      },
    });
    expect(planStore.markInvalid).toHaveBeenCalledWith(STORED_PLAN_REF, rejection);
    expect(planStore.markValid).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('delegates directly when the command already carries a planRef', async () => {
    const compileTelemetry = { recordPlanCompileLatency: vi.fn() };
    const delegate = {
      execute: vi.fn(async () => ({
        ok: true as const,
        value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
      })),
    };
    const planner = {
      buildPlan: vi.fn(async () => makeBuildResult('plan-1')),
    };

    const useCase = new PlannerBackedStartRunUseCase({
      planner: planner as never,
      planStore: {
        storePlan: vi.fn(async () => STORED_PLAN_REF),
        markValid: vi.fn(async () => {}),
        markInvalid: vi.fn(async () => {}),
      } as never,
      validator: {
        validatePlan: vi.fn(async () => ({
          status: 'OK' as const,
          planId: 'plan-1',
          adapterId: 'temporal',
        })),
      } as never,
      delegate: delegate as never,
      compileTelemetry: compileTelemetry as never,
      executableSubgraphResolver: EXECUTABLE_SUBGRAPH_RESOLVER as never,
    });

    const command = {
      ...PLANNER_COMMAND,
      planRef: STORED_PLAN_REF,
    };
    const result = await useCase.execute(command, AUTHORIZED_CONTEXT);

    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'accepted',
        runId: 'run-1',
        accepted: true,
      },
    });
    expect(planner.buildPlan).not.toHaveBeenCalled();
    expect(delegate.execute).toHaveBeenCalledWith(command, AUTHORIZED_CONTEXT);
    expect(compileTelemetry.recordPlanCompileLatency).not.toHaveBeenCalled();
  });

  it('rethrows unexpected planner errors', async () => {
    const compileTelemetry = { recordPlanCompileLatency: vi.fn() };
    const useCase = new PlannerBackedStartRunUseCase({
      planner: {
        buildPlan: vi.fn(async () => {
          throw new Error('s3 transport down');
        }),
      } as never,
      planStore: {
        storePlan: vi.fn(async () => STORED_PLAN_REF),
        markValid: vi.fn(async () => {}),
        markInvalid: vi.fn(async () => {}),
      } as never,
      validator: {
        validatePlan: vi.fn(async () => ({
          status: 'OK' as const,
          planId: 'plan-1',
          adapterId: 'temporal',
        })),
      } as never,
      delegate: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
        })),
      } as never,
      compileTelemetry: compileTelemetry as never,
      executableSubgraphResolver: EXECUTABLE_SUBGRAPH_RESOLVER as never,
    });

    await expect(useCase.execute(PLANNER_COMMAND, AUTHORIZED_CONTEXT)).rejects.toThrow(
      's3 transport down'
    );
    expect(compileTelemetry.recordPlanCompileLatency).toHaveBeenCalledTimes(1);
    expect(compileTelemetry.recordPlanCompileLatency.mock.calls[0]?.[1]).toBe('error');
  });
});

function makeBuildResult(planId: string): PlannerBuildResultV1 {
  return {
    plan: {
      metadata: {
        planId,
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: '1'.repeat(64),
        createdAtIso: '2026-03-21T00:00:00.000Z',
      },
      steps: [
        {
          stepId: `${planId}.step`,
          kind: 'DBT_MODEL',
          dependsOn: [],
        },
      ],
    },
    executionPolicy: {},
    canonicalPlanCoreJson: JSON.stringify({
      metadata: {
        planVersion: '1.0',
        inputHashSha256: '1'.repeat(64),
      },
      steps: [
        {
          stepId: `${planId}.step`,
          kind: 'DBT_MODEL',
          dependsOn: [],
        },
      ],
    }),
  };
}
