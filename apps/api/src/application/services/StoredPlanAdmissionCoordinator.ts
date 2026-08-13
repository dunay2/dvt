/**
 * Owned concern: persist a newly built plan and apply its executability
 * validation transition through one application authority.
 */
import type { IStoredPlanArtifactReader, IStoredPlanArtifactWriter } from '@dvt/artifacts';
import type {
  ExecutabilityValidationResult,
  PlannerBuildResultV1,
  ScopedPlanRef,
} from '@dvt/contracts';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import { createScopedPlanRef } from './storedPlanScope.js';

export type StoredPlanAdmissionResult = {
  readonly planRef: ScopedPlanRef['planRef'];
  readonly scopedPlanRef: ScopedPlanRef;
  readonly validation: ExecutabilityValidationResult;
};

export class StoredPlanAdmissionCoordinator {
  public constructor(
    private readonly deps: {
      readonly planStore: IStoredPlanArtifactWriter &
        Pick<IStoredPlanArtifactReader, 'getStoredPlanValidationRecord'>;
      readonly validator: IPlanExecutabilityValidator;
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
    const validation = await this.deps.validator.validatePlan({
      ...scopedPlanRef,
      adapterId,
    });

    if (validation.status === 'ERROR') {
      await this.deps.planStore.markStoredPlanArtifactInvalid({
        ...scopedPlanRef,
        report: validation,
      });
      return { planRef, scopedPlanRef, validation };
    }

    const validationRecord = await this.deps.planStore.getStoredPlanValidationRecord({
      tenantId: scopedPlanRef.tenantId,
      projectId: scopedPlanRef.projectId,
      environmentId: scopedPlanRef.environmentId,
      planId: planRef.planId,
    });
    if (validationRecord === undefined) {
      throw new Error(`PLAN_VALIDATION_RECORD_NOT_FOUND: ${planRef.planId}`);
    }
    if (validationRecord.state !== 'VALID') {
      await this.deps.planStore.markStoredPlanArtifactValid(scopedPlanRef);
    }

    return { planRef, scopedPlanRef, validation };
  }
}
