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
        readonly state: 'INVALID';
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
    if (!validated.accepted) {
      const { validation } = validated;
      await this.deps.planStore.markStoredPlanArtifactInvalid({
        ...scopedPlanRef,
        report: validation,
      });
      return {
        accepted: false,
        planRef,
        scopedPlanRef,
        ...(validated.materialized === undefined ? {} : { materialized: validated.materialized }),
        planRecord,
        validation,
        validationRecord: {
          ...currentValidationRecord,
          state: 'INVALID',
          rejectionReport: validation,
        },
      };
    }

    if (currentValidationRecord.state !== 'VALID') {
      await this.deps.planStore.markStoredPlanArtifactValid(scopedPlanRef);
    }
    return {
      accepted: true,
      planRef,
      scopedPlanRef,
      materialized: validated.materialized,
      planRecord,
      validation: validated.validation,
      validationRecord: { ...currentValidationRecord, state: 'VALID' },
    };
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
