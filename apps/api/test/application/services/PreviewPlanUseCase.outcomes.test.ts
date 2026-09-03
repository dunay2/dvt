import { parsePlanRef, type ExecutionPlan } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';

const PLAN_REF = parsePlanRef({
  uri: 'dvt-plan://plans/plan-1',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0',
  planId: 'plan-1',
  planVersion: 'v1',
});

const PLAN = {
  metadata: {
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    inputHashSha256: 'b'.repeat(64),
    planId: 'plan-1',
    createdAtIso: '2026-07-31T00:00:00.000Z',
    ownership: {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
    },
  },
  steps: [],
} satisfies ExecutionPlan;

const PLAN_RECORD = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  planId: PLAN_REF.planId,
  canonicalPlanJson: JSON.stringify(PLAN),
  canonicalHash: 'c'.repeat(64),
  planVersion: PLAN.metadata.planVersion,
  schemaVersion: PLAN.metadata.schemaVersion,
  contractVersion: PLAN.metadata.contractVersion,
  sourceRef: PLAN_REF.uri,
  createdAtIso: PLAN.metadata.createdAtIso,
  updatedAtIso: PLAN.metadata.createdAtIso,
  state: 'ACTIVE' as const,
};

const CONTEXT = {
  principal: {
    principalId: 'principal-1',
    principalType: 'user',
    subjectId: 'user-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-07-31T01:00:00.000Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    resource: 'environment',
    tenantId: { value: 'tenant-1' },
    projectId: { value: 'project-1' },
    environmentId: { value: 'env-1' },
  },
  action: { kind: 'command', name: 'run:start' },
  requestId: 'request-1',
  authorizedAt: new Date('2026-07-31T00:00:00.000Z'),
} as never;

const COMMAND = {
  targetAdapter: 'temporal',
  graphSource: {
    kind: 'generic-graph-v1' as const,
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: [],
  },
  selection: { mode: 'explicit' as const, nodeIds: [] },
};

function createUseCase(
  overrides: {
    previewSelectionResolver?: { execute: ReturnType<typeof vi.fn> };
    materializeAndValidatePlan?: ReturnType<typeof vi.fn>;
  } = {}
): {
  readonly useCase: PreviewPlanUseCase;
  readonly planner: { readonly buildPlan: ReturnType<typeof vi.fn> };
  readonly planStore: {
    readonly storePlanArtifact: ReturnType<typeof vi.fn>;
    readonly markStoredPlanArtifactValid: ReturnType<typeof vi.fn>;
    readonly markStoredPlanArtifactInvalid: ReturnType<typeof vi.fn>;
    readonly getStoredPlanValidationRecord: ReturnType<typeof vi.fn>;
    readonly getPlanRecordByRef: ReturnType<typeof vi.fn>;
  };
} {
  const planner = {
    buildPlan: vi.fn(async () => ({
      plan: PLAN,
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    })),
  };
  let validationState: 'PENDING_VALIDATION' | 'VALID' | 'INVALID' = 'PENDING_VALIDATION';
  let rejectionReport: unknown;
  const planStore = {
    storePlanArtifact: vi.fn(async () => PLAN_REF),
    markStoredPlanArtifactValid: vi.fn(async () => {
      validationState = 'VALID';
    }),
    markStoredPlanArtifactInvalid: vi.fn(async (input: { report: unknown }) => {
      validationState = 'INVALID';
      rejectionReport = input.report;
    }),
    getStoredPlanValidationRecord: vi.fn(async () => ({
      planId: PLAN_REF.planId,
      state: validationState,
      storedAtIso: PLAN.metadata.createdAtIso,
      updatedAtIso: PLAN.metadata.createdAtIso,
      ...(rejectionReport === undefined ? {} : { rejectionReport }),
    })),
    getPlanRecordByRef: vi.fn(async () => PLAN_RECORD),
  };
  const planValidator = {
    materializeAndValidatePlan:
      overrides.materializeAndValidatePlan ??
      vi.fn(async () => ({
        accepted: true as const,
        materialized: { plan: PLAN, executionPolicy: {} },
        validation: {
          status: 'OK' as const,
          planId: PLAN_REF.planId,
          adapterId: 'temporal',
        },
      })),
  };
  const previewSelectionResolver =
    overrides.previewSelectionResolver ??
    ({
      execute: vi.fn(async () => ({
        ok: true as const,
        value: {
          graphSource: COMMAND.graphSource,
          nodeIds: [],
          decisionScopeNodeIds: ['model.analytics.orders', 'model.analytics.customers'],
          requestedRootNodeIds: ['model.analytics.orders'],
        },
      })),
    } as const);

  return {
    useCase: new PreviewPlanUseCase({
      planner: planner as never,
      planStore: planStore as never,
      planValidator: planValidator as never,
      previewSelectionResolver: previewSelectionResolver as never,
    }),
    planner,
    planStore,
  };
}

describe('PreviewPlanUseCase outcomes', () => {
  it('passes the authorized workspace decision scope to Planner without widening graphSource', async () => {
    const { useCase, planner } = createUseCase();

    await useCase.execute(COMMAND, CONTEXT);

    expect(planner.buildPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        graphSource: COMMAND.graphSource,
        decisionScope: {
          nodeIds: ['model.analytics.orders', 'model.analytics.customers'],
          requestedRootNodeIds: ['model.analytics.orders'],
        },
      })
    );
  });

  it('returns selection-rejected without building or storing a plan', async () => {
    const rejection = {
      code: 'REJECTED' as const,
      cause: 'dependency_gap',
      reason: 'Selected closure is missing a dependency.',
    };
    const { useCase, planner, planStore } = createUseCase({
      previewSelectionResolver: {
        execute: vi.fn(async () => ({ ok: false as const, rejection })),
      },
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expect(result).toEqual({ kind: 'selection-rejected', rejection });
    expect(planner.buildPlan).not.toHaveBeenCalled();
    expect(planStore.storePlanArtifact).not.toHaveBeenCalled();
  });

  it('returns plan-invalid with the exact built plan and stored planRef', async () => {
    const validation = {
      status: 'ERROR' as const,
      code: 'MISSING_CAPABILITY' as const,
      adapterId: 'temporal',
      planId: PLAN_REF.planId,
      degradable: false,
      reason: 'The adapter is missing executor.dbt.',
      cause: 'executor.dbt',
    };
    const { useCase, planStore } = createUseCase({
      materializeAndValidatePlan: vi.fn(async () => ({
        accepted: false,
        materialized: { plan: PLAN, executionPolicy: {} },
        validation,
      })),
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expect(result).toEqual({
      kind: 'plan-invalid',
      plan: PLAN,
      planRef: PLAN_REF,
      planRecord: PLAN_RECORD,
      validation,
    });
    expect(planStore.markStoredPlanArtifactInvalid).toHaveBeenCalledWith(
      expect.objectContaining({ planRef: PLAN_REF, report: validation })
    );
  });
});
