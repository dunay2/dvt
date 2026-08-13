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
      readonly planRecord: PlanRecord;
      readonly validation: Extract<ExecutabilityValidationResult, { readonly status: 'ERROR' }>;
      readonly validationRecord: StoredPlanArtifactValidationRecord & {
        readonly state: 'VALID' | 'INVALID';
      };
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
  ): Promise<StoredPlanAdmissionResult> {
    const planRef = await this.deps.planStore.storePlanArtifact({ buildResult });
    const scopedPlanRef = createScopedPlanRef({
      scope: buildResult.plan.metadata.ownership,
      planRef,
    });
    return this.admitStored(scopedPlanRef, adapterId);
  }

  public async admitStored(
    scopedPlanRef: ScopedPlanRef,
    adapterId: string
  ): Promise<StoredPlanAdmissionResult> {
    const planRef = scopedPlanRef.planRef;
    const planRecord = await this.deps.planStore.getPlanRecordByRef(scopedPlanRef);
    if (planRecord === undefined) {
      throw new Error(`PLAN_RECORD_NOT_FOUND: ${planRef.planId}`);
    }
    const currentValidationRecord = await this.readValidationRecord(scopedPlanRef);
    if (currentValidationRecord.state === 'INVALID') {
      if (currentValidationRecord.rejectionReport === undefined) {
        throw new Error(`PLAN_VALIDATION_REPORT_NOT_FOUND: ${planRef.planId}`);
      }
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        planRecord,
        validation: currentValidationRecord.rejectionReport,
        validationRecord: { ...currentValidationRecord, state: 'INVALID' },
      };
    }

    const validated = await this.deps.validator.materializeAndValidatePlan({
      ...scopedPlanRef,
      adapterId,
    });
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
        planRecord,
        validation: validationRecord.rejectionReport,
        validationRecord: { ...validationRecord, state: 'INVALID' },
      };
    }

    if (!validated.accepted) {
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        ...(validated.materialized === undefined ? {} : { materialized: validated.materialized }),
        planRecord,
        validation: validated.validation,
        validationRecord: { ...validationRecord, state: 'VALID' },
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
      if (winningRecord.state === 'PENDING_VALIDATION') throw transitionError;
      return winningRecord;
    }

    return this.readValidationRecord(scopedPlanRef);
  }

  private async readValidationRecord(
    scopedPlanRef: ScopedPlanRef
  ): Promise<StoredPlanArtifactValidationRecord> {
    const validationRecord = await this.deps.planStore.getStoredPlanValidationRecord({
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
      planId: scopedPlanRef.planRef.planId,
    });
    if (validationRecord === undefined) {
      throw new Error(`PLAN_VALIDATION_RECORD_NOT_FOUND: ${scopedPlanRef.planRef.planId}`);
    }
    return validationRecord;
  }
}
