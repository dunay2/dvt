import type { PlannerBuildResultV1 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { ManifestArtifactResolutionError } from '../../../src/application/errors/ManifestArtifactResolutionError.js';
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
    kind: 'generic-graph-v1' as const,
    sourceFamily: 'dbt',
    sourceVersion: 'manifest-v10',
    nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
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
      compileTelemetry: compileTelemetry as never,
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
    expect(compileTelemetry.recordPlanCompileLatency).toHaveBeenCalledTimes(1);
    expect(compileTelemetry.recordPlanCompileLatency.mock.calls[0]?.[1]).toBe('built');
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
          adapterId: 'mock',
        })),
      } as never,
      delegate: delegate as never,
      compileTelemetry: compileTelemetry as never,
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

  it.each([
    {
      kind: 'unsupported_scheme' as const,
      expectedReason: 'Unsupported manifestRef URI scheme: ftp.',
      expectedCause: 'manifest_ref_unsupported_scheme',
    },
    {
      kind: 'invalid_artifact_locator' as const,
      expectedReason: 'Manifest artifact locator is invalid: missing key.',
      expectedCause: 'manifest_ref_invalid_locator',
    },
    {
      kind: 'file_scheme_prohibited' as const,
      expectedReason: 'file:// manifestRef is not allowed in production.',
      expectedCause: 'manifest_ref_file_scheme_prohibited',
    },
    {
      kind: 'artifact_not_found' as const,
      expectedReason: 'Manifest artifact could not be found.',
      expectedCause: 'manifest_ref_not_found',
    },
    {
      kind: 'integrity_mismatch' as const,
      expectedReason: 'Manifest artifact integrity mismatch.',
      expectedCause: 'manifest_ref_integrity_mismatch',
    },
    {
      kind: 'invalid_manifest_payload' as const,
      expectedReason: 'Manifest artifact payload is invalid.',
      expectedCause: 'manifest_ref_invalid_payload',
    },
  ])(
    'maps predictable manifest resolution failure $kind to plan_rejected',
    async ({ kind, expectedReason, expectedCause }) => {
      const compileTelemetry = { recordPlanCompileLatency: vi.fn() };
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
          buildPlan: vi.fn(async () =>
            Promise.reject(
              new ManifestArtifactResolutionError(kind, `fixture failure for ${kind}`, {
                ...(kind === 'unsupported_scheme'
                  ? { detail: 'ftp' }
                  : kind === 'invalid_artifact_locator'
                    ? { detail: 'missing key' }
                    : {}),
              })
            )
          ),
        } as never,
        planStore: planStore as never,
        validator: {
          validatePlan: vi.fn(async () => ({
            status: 'OK' as const,
            planId: 'plan-1',
            adapterId: 'mock',
          })),
        } as never,
        delegate: delegate as never,
        compileTelemetry: compileTelemetry as never,
      });

      await expect(useCase.execute(PLANNER_COMMAND, AUTHORIZED_CONTEXT)).resolves.toEqual({
        ok: true,
        value: {
          kind: 'plan_rejected',
          accepted: false,
          code: 'REJECTED',
          reason: expectedReason,
          cause: expectedCause,
        },
      });
      expect(planStore.storePlan).not.toHaveBeenCalled();
      expect(planStore.markValid).not.toHaveBeenCalled();
      expect(planStore.markInvalid).not.toHaveBeenCalled();
      expect(delegate.execute).not.toHaveBeenCalled();
      expect(compileTelemetry.recordPlanCompileLatency).toHaveBeenCalledTimes(1);
      expect(compileTelemetry.recordPlanCompileLatency.mock.calls[0]?.[1]).toBe(
        'manifest_resolution_error'
      );
    }
  );

  it('rethrows unexpected planner errors', async () => {
    const compileTelemetry = { recordPlanCompileLatency: vi.fn() };
    const useCase = new PlannerBackedStartRunUseCase({
      planner: {
        buildPlan: vi.fn(async () => Promise.reject(new Error('s3 transport down'))),
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
          adapterId: 'mock',
        })),
      } as never,
      delegate: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
        })),
      } as never,
      compileTelemetry: compileTelemetry as never,
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
