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
const PLAN_RECORD = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'prod',
  planId: PLAN_REF.planId,
  canonicalPlanJson: JSON.stringify(PLAN),
  canonicalHash: 'd'.repeat(64),
  planVersion: PLAN.metadata.planVersion,
  schemaVersion: PLAN.metadata.schemaVersion,
  contractVersion: PLAN.metadata.contractVersion,
  sourceRef: PLAN_REF.uri,
  createdAtIso: PLAN.metadata.createdAtIso,
  updatedAtIso: PLAN.metadata.createdAtIso,
  state: 'ACTIVE' as const,
};
const MATERIALIZED = { plan: PLAN, executionPolicy: {} };
const SCOPED_PLAN_REF = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'prod',
  planRef: PLAN_REF,
};

describe('StoredPlanAdmissionCoordinator', () => {
  it('stores, validates and marks a pending plan valid exactly once', async () => {
    const harness = createHarness('PENDING_VALIDATION', OK_VALIDATION);

    await expect(harness.coordinator.admit(BUILD_RESULT, 'temporal')).resolves.toMatchObject({
      accepted: true,
      planRef: PLAN_REF,
      materialized: MATERIALIZED,
      planRecord: PLAN_RECORD,
      validation: OK_VALIDATION,
      validationRecord: { state: 'VALID' },
    });
    expect(harness.planStore.storePlanArtifact).toHaveBeenCalledWith({ buildResult: BUILD_RESULT });
    expect(harness.validator.materializeAndValidatePlan).toHaveBeenCalledWith({
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

  it('rejects current executability failure without rewriting a terminal valid record', async () => {
    const harness = createHarness('VALID', ERROR_VALIDATION);

    await expect(
      harness.coordinator.admitStored(SCOPED_PLAN_REF, 'temporal')
    ).resolves.toMatchObject({
      accepted: false,
      validation: ERROR_VALIDATION,
      validationRecord: { state: 'VALID' },
    });
    expect(harness.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
    expect(harness.planStore.markStoredPlanArtifactInvalid).not.toHaveBeenCalled();
  });

  it('uses the same admission seam and closes a pending existing plan before dispatch', async () => {
    const harness = createHarness('PENDING_VALIDATION', OK_VALIDATION);

    await expect(
      harness.coordinator.admitStored(SCOPED_PLAN_REF, 'temporal')
    ).resolves.toMatchObject({ accepted: true, validationRecord: { state: 'VALID' } });

    expect(harness.planStore.storePlanArtifact).not.toHaveBeenCalled();
    expect(harness.planStore.markStoredPlanArtifactValid).toHaveBeenCalledWith(SCOPED_PLAN_REF);
    expect(harness.validator.materializeAndValidatePlan).toHaveBeenCalledTimes(1);
  });

  it('marks a pending plan invalid with the exact validation report', async () => {
    const harness = createHarness('PENDING_VALIDATION', ERROR_VALIDATION);

    await expect(harness.coordinator.admit(BUILD_RESULT, 'temporal')).resolves.toMatchObject({
      accepted: false,
      validation: ERROR_VALIDATION,
      validationRecord: { state: 'INVALID' },
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

  it('accepts the terminal valid state selected by a concurrent admission', async () => {
    const harness = createHarness('PENDING_VALIDATION', OK_VALIDATION, 'VALID');

    await expect(
      harness.coordinator.admitStored(SCOPED_PLAN_REF, 'temporal')
    ).resolves.toMatchObject({
      accepted: true,
      validationRecord: { state: 'VALID' },
    });
    expect(harness.planStore.getStoredPlanValidationRecord).toHaveBeenCalledTimes(2);
  });

  it('uses the fail-closed invalid result selected by a concurrent admission', async () => {
    const harness = createHarness('PENDING_VALIDATION', OK_VALIDATION, 'INVALID');

    await expect(
      harness.coordinator.admitStored(SCOPED_PLAN_REF, 'temporal')
    ).resolves.toMatchObject({
      accepted: false,
      validation: ERROR_VALIDATION,
      validationRecord: { state: 'INVALID' },
    });
    expect(harness.planStore.getStoredPlanValidationRecord).toHaveBeenCalledTimes(2);
  });

  it('rejects a missing plan record instead of throwing after validation', async () => {
    const harness = createHarness('PENDING_VALIDATION', OK_VALIDATION, undefined, null);

    await expect(
      harness.coordinator.admitStored(SCOPED_PLAN_REF, 'temporal')
    ).resolves.toMatchObject({
      accepted: false,
      validation: {
        status: 'ERROR',
        code: 'REJECTED',
        reason: `PLAN_RECORD_NOT_FOUND: ${PLAN_REF.planId}`,
        cause: 'plan_record',
      },
    });
    expect(harness.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
  });

  it('maps plan record metadata mismatches to the same rejection boundary', async () => {
    const harness = createHarness(
      'VALID',
      OK_VALIDATION,
      undefined,
      new Error('PLAN_REF_METADATA_MISMATCH: schemaVersion')
    );

    await expect(
      harness.coordinator.admitStored(SCOPED_PLAN_REF, 'temporal')
    ).resolves.toMatchObject({
      accepted: false,
      validation: {
        status: 'ERROR',
        code: 'REJECTED',
        reason: 'PLAN_REF_METADATA_MISMATCH: schemaVersion',
        cause: 'plan_record',
      },
    });
  });

  it('rejects when the stored validation record is missing', async () => {
    const harness = createHarness(undefined, OK_VALIDATION);

    await expect(harness.coordinator.admit(BUILD_RESULT, 'temporal')).resolves.toMatchObject({
      accepted: false,
      validation: {
        status: 'ERROR',
        code: 'REJECTED',
        reason: `PLAN_VALIDATION_RECORD_NOT_FOUND: ${PLAN_REF.planId}`,
        cause: 'plan_validation_record',
      },
    });
    expect(harness.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
  });
});

function createHarness(
  state: 'PENDING_VALIDATION' | 'VALID' | 'INVALID' | undefined,
  validation: typeof OK_VALIDATION | typeof ERROR_VALIDATION,
  concurrentWinner?: 'VALID' | 'INVALID',
  planRecordResult: typeof PLAN_RECORD | Error | null = PLAN_RECORD
): {
  coordinator: StoredPlanAdmissionCoordinator;
  planStore: {
    storePlanArtifact: ReturnType<typeof vi.fn>;
    getStoredPlanValidationRecord: ReturnType<typeof vi.fn>;
    markStoredPlanArtifactValid: ReturnType<typeof vi.fn>;
    markStoredPlanArtifactInvalid: ReturnType<typeof vi.fn>;
    getPlanRecordByRef: ReturnType<typeof vi.fn>;
  };
  validator: { materializeAndValidatePlan: ReturnType<typeof vi.fn> };
} {
  let currentState = state;
  let rejectionReport: typeof ERROR_VALIDATION | undefined;
  const planStore = {
    storePlanArtifact: vi.fn(async () => PLAN_REF),
    getStoredPlanValidationRecord: vi.fn(async () =>
      currentState === undefined
        ? undefined
        : {
            planId: PLAN_REF.planId,
            state: currentState,
            storedAtIso: '2026-08-12T00:00:00.000Z',
            updatedAtIso: '2026-08-12T00:00:00.000Z',
            ...(rejectionReport === undefined ? {} : { rejectionReport }),
          }
    ),
    markStoredPlanArtifactValid: vi.fn(async () => applyTransition('VALID')),
    markStoredPlanArtifactInvalid: vi.fn(async (input: { report: typeof ERROR_VALIDATION }) => {
      await applyTransition('INVALID', input.report);
    }),
    getPlanRecordByRef: vi.fn(async () => {
      if (planRecordResult instanceof Error) throw planRecordResult;
      return planRecordResult ?? undefined;
    }),
  };
  const validator = {
    materializeAndValidatePlan: vi.fn(async () =>
      validation.status === 'OK'
        ? { accepted: true as const, materialized: MATERIALIZED, validation }
        : { accepted: false as const, materialized: MATERIALIZED, validation }
    ),
  };

  async function applyTransition(
    nextState: 'VALID' | 'INVALID',
    report?: typeof ERROR_VALIDATION
  ): Promise<void> {
    if (concurrentWinner !== undefined) {
      currentState = concurrentWinner;
      rejectionReport = concurrentWinner === 'INVALID' ? ERROR_VALIDATION : undefined;
      throw new Error('PLAN_VALIDATION_STATE_INVALID_TRANSITION: concurrent winner');
    }
    currentState = nextState;
    rejectionReport = nextState === 'INVALID' ? report : undefined;
  }
  return {
    coordinator: new StoredPlanAdmissionCoordinator({
      planStore: planStore as never,
      validator: validator as never,
    }),
    planStore,
    validator,
  };
}
