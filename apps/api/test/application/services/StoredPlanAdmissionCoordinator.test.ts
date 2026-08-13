import { parsePlanRef, type ExecutionPlan, type PlannerBuildResultV1 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { StoredPlanAdmissionCoordinator } from '../../../src/application/services/StoredPlanAdmissionCoordinator.js';

const PLAN: ExecutionPlan = {
  metadata: {
    planId: 'a'.repeat(64),
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    inputHashSha256: 'b'.repeat(64),
    createdAtIso: '2026-08-12T00:00:00.000Z',
    ownership: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
    },
  },
  steps: [],
};
const BUILD_RESULT: PlannerBuildResultV1 = {
  plan: PLAN,
  executionPolicy: {},
  canonicalPlanCoreJson: '{}',
};
const PLAN_REF = parsePlanRef({
  uri: `dvt-plan://postgres/${PLAN.metadata.planId}`,
  sha256: 'c'.repeat(64),
  schemaVersion: PLAN.metadata.schemaVersion,
  planId: PLAN.metadata.planId,
  planVersion: PLAN.metadata.planVersion,
});
const OK_VALIDATION = {
  status: 'OK' as const,
  planId: PLAN_REF.planId,
  adapterId: 'temporal',
};
const ERROR_VALIDATION = {
  status: 'ERROR' as const,
  planId: PLAN_REF.planId,
  adapterId: 'temporal',
  code: 'MISSING_CAPABILITY' as const,
  degradable: false,
  reason: 'Missing adapter capability: executor.dbt',
  cause: 'executor.dbt',
};

describe('StoredPlanAdmissionCoordinator', () => {
  it('stores, validates and marks a pending plan valid exactly once', async () => {
    const harness = createHarness('PENDING_VALIDATION', OK_VALIDATION);

    await expect(harness.coordinator.admit(BUILD_RESULT, 'temporal')).resolves.toMatchObject({
      planRef: PLAN_REF,
      validation: OK_VALIDATION,
    });
    expect(harness.planStore.storePlanArtifact).toHaveBeenCalledWith({ buildResult: BUILD_RESULT });
    expect(harness.validator.validatePlan).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      planRef: PLAN_REF,
      adapterId: 'temporal',
    });
    expect(harness.planStore.markStoredPlanArtifactValid).toHaveBeenCalledTimes(1);
    expect(harness.planStore.markStoredPlanArtifactInvalid).not.toHaveBeenCalled();
  });

  it('does not rewrite an already valid stored plan', async () => {
    const harness = createHarness('VALID', OK_VALIDATION);

    await harness.coordinator.admit(BUILD_RESULT, 'temporal');

    expect(harness.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
    expect(harness.planStore.markStoredPlanArtifactInvalid).not.toHaveBeenCalled();
  });

  it('marks a pending plan invalid with the exact validation report', async () => {
    const harness = createHarness('PENDING_VALIDATION', ERROR_VALIDATION);

    await expect(harness.coordinator.admit(BUILD_RESULT, 'temporal')).resolves.toMatchObject({
      validation: ERROR_VALIDATION,
    });
    expect(harness.planStore.markStoredPlanArtifactInvalid).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      planRef: PLAN_REF,
      report: ERROR_VALIDATION,
    });
    expect(harness.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
  });

  it('fails closed when the stored validation record is missing', async () => {
    const harness = createHarness(undefined, OK_VALIDATION);

    await expect(harness.coordinator.admit(BUILD_RESULT, 'temporal')).rejects.toThrow(
      `PLAN_VALIDATION_RECORD_NOT_FOUND: ${PLAN_REF.planId}`
    );
    expect(harness.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
  });
});

function createHarness(
  state: 'PENDING_VALIDATION' | 'VALID' | undefined,
  validation: typeof OK_VALIDATION | typeof ERROR_VALIDATION
): {
  coordinator: StoredPlanAdmissionCoordinator;
  planStore: {
    storePlanArtifact: ReturnType<typeof vi.fn>;
    getStoredPlanValidationRecord: ReturnType<typeof vi.fn>;
    markStoredPlanArtifactValid: ReturnType<typeof vi.fn>;
    markStoredPlanArtifactInvalid: ReturnType<typeof vi.fn>;
  };
  validator: { validatePlan: ReturnType<typeof vi.fn> };
} {
  const planStore = {
    storePlanArtifact: vi.fn(async () => PLAN_REF),
    getStoredPlanValidationRecord: vi.fn(async () =>
      state === undefined
        ? undefined
        : {
            planId: PLAN_REF.planId,
            state,
            storedAtIso: '2026-08-12T00:00:00.000Z',
            updatedAtIso: '2026-08-12T00:00:00.000Z',
          }
    ),
    markStoredPlanArtifactValid: vi.fn(async () => undefined),
    markStoredPlanArtifactInvalid: vi.fn(async () => undefined),
  };
  const validator = {
    validatePlan: vi.fn(async () => validation),
  };
  return {
    coordinator: new StoredPlanAdmissionCoordinator({
      planStore: planStore as never,
      validator: validator as never,
    }),
    planStore,
    validator,
  };
}
