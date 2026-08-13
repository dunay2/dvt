/**
 * Owned concern: persist a newly built plan and apply its executability
 * validation transition through one application authority.
 */
import type {
  IPlanStoreReader,
  IStoredPlanArtifactReader,
  IStoredPlanArtifactWriter,
} from '@dvt/artifacts';
import type {
  ExecutabilityValidationResult,
  PlanRecord,
  PlannerBuildResultV1,
  ScopedPlanRef,
  StoredPlanArtifactValidationRecord,
} from '@dvt/contracts';

import type { MaterializedStoredExecutablePlan } from './StoredExecutablePlanResolver.js';
import type { StoredPlanExecutabilityValidator } from './StoredPlanExecutabilityValidator.js';
import { createScopedPlanRef } from './storedPlanScope.js';

const PLAN_REF_MISMATCH_ERROR_PREFIX = 'PLAN_REF_MISMATCH:';

export type StoredPlanAdmissionResult =
  | {
      readonly accepted: true;
      readonly planRef: ScopedPlanRef['planRef'];
      readonly scopedPlanRef: ScopedPlanRef;
      readonly materialized: MaterializedStoredExecutablePlan;
      readonly planRecord: PlanRecord;
      readonly validation: Extract<ExecutabilityValidationResult, { readonly status: 'OK' }>;
      readonly validationRecord: StoredPlanArtifactValidationRecord & { readonly state: 'VALID' };
    }
  | {
      readonly accepted: false;
      readonly planRef: ScopedPlanRef['planRef'];
      readonly scopedPlanRef: ScopedPlanRef;
      readonly materialized?: MaterializedStoredExecutablePlan;
      readonly planRecord?: PlanRecord;
      readonly validation: Extract<ExecutabilityValidationResult, { readonly status: 'ERROR' }>;
      readonly validationRecord?: StoredPlanArtifactValidationRecord & {
        readonly state: 'VALID' | 'INVALID';
      };
    };

export type StoredPlanCreationAdmissionResult = StoredPlanAdmissionResult & {
  readonly planRecord: PlanRecord;
};

export class StoredPlanAdmissionCoordinator {
  public constructor(
    private readonly deps: {
      readonly planStore: IStoredPlanArtifactWriter &
        Pick<IStoredPlanArtifactReader, 'getStoredPlanValidationRecord'> &
        Pick<IPlanStoreReader, 'getPlanRecordByRef'>;
      readonly validator: Pick<StoredPlanExecutabilityValidator, 'materializeAndValidatePlan'>;
    }
  ) {}

  public async admit(
    buildResult: PlannerBuildResultV1,
    adapterId: string
  ): Promise<StoredPlanCreationAdmissionResult> {
    const planRef = await this.deps.planStore.storePlanArtifact({ buildResult });
    const scopedPlanRef = createScopedPlanRef({
      scope: buildResult.plan.metadata.ownership,
      planRef,
    });
    const admission = await this.admitStored(scopedPlanRef, adapterId);
    if (admission.planRecord !== undefined) {
      return { ...admission, planRecord: admission.planRecord };
    }

    const planRecord = await this.deps.planStore.getPlanRecordByRef(scopedPlanRef);
    if (planRecord === undefined) {
      throw new Error(`PLAN_RECORD_NOT_FOUND: ${planRef.planId}`);
    }
    return { ...admission, planRecord };
  }

  public async admitStored(
    scopedPlanRef: ScopedPlanRef,
    adapterId: string
  ): Promise<StoredPlanAdmissionResult> {
    const planRef = scopedPlanRef.planRef;
    const currentValidationRecord = await this.readValidationRecord(scopedPlanRef);
    if (currentValidationRecord === undefined) {
      const validated = await this.deps.validator.materializeAndValidatePlan({
        ...scopedPlanRef,
        adapterId,
      });
      if (!validated.accepted) {
        return {
          accepted: false,
          planRef,
          scopedPlanRef,
          ...(validated.materialized === undefined ? {} : { materialized: validated.materialized }),
          validation: validated.validation,
        };
      }
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        materialized: validated.materialized,
        validation: {
          status: 'ERROR',
          planId: planRef.planId,
          adapterId,
          code: 'REJECTED',
          degradable: false,
          reason: `PLAN_VALIDATION_RECORD_NOT_FOUND: ${planRef.planId}`,
          cause: 'plan_validation_record',
        },
      };
    }
    if (currentValidationRecord.state === 'INVALID') {
      if (currentValidationRecord.rejectionReport === undefined) {
        throw new Error(`PLAN_VALIDATION_REPORT_NOT_FOUND: ${planRef.planId}`);
      }
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        validation: currentValidationRecord.rejectionReport,
        validationRecord: { ...currentValidationRecord, state: 'INVALID' },
      };
    }

    const validated = await this.deps.validator.materializeAndValidatePlan({
      ...scopedPlanRef,
      adapterId,
    });
    if (!validated.accepted) {
      const validationRecord =
        currentValidationRecord.state === 'PENDING_VALIDATION'
          ? await this.closePendingValidation(scopedPlanRef, validated.validation)
          : currentValidationRecord;
      if (validationRecord.state === 'INVALID') {
        if (validationRecord.rejectionReport === undefined) {
          throw new Error(`PLAN_VALIDATION_REPORT_NOT_FOUND: ${planRef.planId}`);
        }
        return {
          accepted: false,
          planRef,
          scopedPlanRef,
          ...(validated.materialized === undefined ? {} : { materialized: validated.materialized }),
          validation: validationRecord.rejectionReport,
          validationRecord: { ...validationRecord, state: 'INVALID' },
        };
      }
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        ...(validated.materialized === undefined ? {} : { materialized: validated.materialized }),
        validation: validated.validation,
        validationRecord: { ...validationRecord, state: 'VALID' },
      };
    }

    let planRecord: PlanRecord;
    try {
      const storedPlanRecord = await this.deps.planStore.getPlanRecordByRef(scopedPlanRef);
      if (storedPlanRecord === undefined) {
        return {
          accepted: false,
          planRef,
          scopedPlanRef,
          materialized: validated.materialized,
          validation: buildPlanRecordRejection({
            planId: planRef.planId,
            adapterId,
            reason: `PLAN_RECORD_NOT_FOUND: ${planRef.planId}`,
          }),
          ...(currentValidationRecord.state === 'VALID'
            ? { validationRecord: { ...currentValidationRecord, state: 'VALID' as const } }
            : {}),
        };
      }
      planRecord = storedPlanRecord;
    } catch (error) {
      if (!isPlanRefMismatchError(error)) {
        throw error;
      }
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        materialized: validated.materialized,
        validation: buildPlanRecordRejection({
          planId: planRef.planId,
          adapterId,
          reason: error.message,
        }),
        ...(currentValidationRecord.state === 'VALID'
          ? { validationRecord: { ...currentValidationRecord, state: 'VALID' as const } }
          : {}),
      };
    }

    const validationRecord =
      currentValidationRecord.state === 'PENDING_VALIDATION'
        ? await this.closePendingValidation(scopedPlanRef, validated.validation)
        : currentValidationRecord;
    if (validationRecord.state === 'INVALID') {
      if (validationRecord.rejectionReport === undefined) {
        throw new Error(`PLAN_VALIDATION_REPORT_NOT_FOUND: ${planRef.planId}`);
      }
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        materialized: validated.materialized,
        planRecord,
        validation: validationRecord.rejectionReport,
        validationRecord: { ...validationRecord, state: 'INVALID' },
      };
    }

    return {
      accepted: true,
      planRef,
      scopedPlanRef,
      materialized: validated.materialized,
      planRecord,
      validation: validated.validation,
      validationRecord: { ...validationRecord, state: 'VALID' },
    };
  }

  private async closePendingValidation(
    scopedPlanRef: ScopedPlanRef,
    validation: ExecutabilityValidationResult
  ): Promise<StoredPlanArtifactValidationRecord> {
    try {
      if (validation.status === 'OK') {
        await this.deps.planStore.markStoredPlanArtifactValid(scopedPlanRef);
      } else {
        await this.deps.planStore.markStoredPlanArtifactInvalid({
          ...scopedPlanRef,
          report: validation,
        });
      }
    } catch (transitionError) {
      const winningRecord = await this.readValidationRecord(scopedPlanRef);
      if (winningRecord === undefined || winningRecord.state === 'PENDING_VALIDATION') {
        throw transitionError;
      }
      return winningRecord;
    }

    const closedRecord = await this.readValidationRecord(scopedPlanRef);
    if (closedRecord === undefined) {
      throw new Error(`PLAN_VALIDATION_RECORD_NOT_FOUND: ${scopedPlanRef.planRef.planId}`);
    }
    return closedRecord;
  }

  private async readValidationRecord(
    scopedPlanRef: ScopedPlanRef
  ): Promise<StoredPlanArtifactValidationRecord | undefined> {
    return this.deps.planStore.getStoredPlanValidationRecord({
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
      planId: scopedPlanRef.planRef.planId,
    });
  }
}

function isPlanRefMismatchError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith(PLAN_REF_MISMATCH_ERROR_PREFIX);
}

function buildPlanRecordRejection(input: {
  readonly planId: string;
  readonly adapterId: string;
  readonly reason: string;
}): Extract<ExecutabilityValidationResult, { readonly status: 'ERROR' }> {
  return {
    status: 'ERROR',
    planId: input.planId,
    adapterId: input.adapterId,
    code: 'REJECTED',
    degradable: false,
    reason: input.reason,
    cause: 'plan_record',
  };
}
