import type { PlannerBuildResultV2 } from '@dvt/contracts';
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
    kind: 'normalized-graph-v1' as const,
    nodes: [{ nodeId: 'model.orders', resourceType: 'model', dependsOn: [] }],
  },
  runId: 'run-1',
  targetAdapter: 'mock' as const,
  selection: ['model.orders'],
};

const STORED_PLAN_REF = {
  uri: 'dvt-plan://postgres/plan-1',
  sha256: 'abc123',
  schemaVersion: 'v1.2',
  planId: 'plan-1',
  planVersion: '1.0',
};

describe('PlannerBackedStartRunUseCase', () => {
  it('builds, stores, validates and delegates with the stored planRef', async () => {
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
        adapterId: 'mock',
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
    expect(validator.validatePlan).toHaveBeenCalledWith(STORED_PLAN_REF, 'mock');
    expect(planStore.markValid).toHaveBeenCalledWith(STORED_PLAN_REF);
    expect(planStore.markInvalid).not.toHaveBeenCalled();
    expect(delegate.execute).toHaveBeenCalledWith(
      {
        ...PLANNER_COMMAND,
        planRef: STORED_PLAN_REF,
      },
      AUTHORIZED_CONTEXT
    );
  });

  it('marks the plan invalid and returns a rejection when validation fails', async () => {
    const rejection = {
      status: 'ERROR' as const,
      planId: 'plan-1',
      adapterId: 'mock',
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
          adapterId: 'mock',
        })),
      } as never,
      delegate: delegate as never,
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
  });
});

function makeBuildResult(planId: string): PlannerBuildResultV2 {
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
    canonicalPlanJson: JSON.stringify({
      metadata: {
        planId,
        planVersion: '1.0',
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
    }),
  };
}
