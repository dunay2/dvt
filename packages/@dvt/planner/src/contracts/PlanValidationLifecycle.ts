import type {
  ExecutabilityValidationResult,
  PlanRefSchemaT,
  PlanValidationRecord,
  PlannerBuildResultV1,
} from '@dvt/contracts';

/**
 * Planner-owned behavior port for the persisted plan validation lifecycle.
 * Shared lifecycle state and record shapes remain in `@dvt/contracts`.
 */
export interface IPlanValidationLifecycleStore {
  storePlan(buildResult: PlannerBuildResultV1): Promise<PlanRefSchemaT>;

  markValid(planRef: PlanRefSchemaT): Promise<void>;

  markInvalid(
    planRef: PlanRefSchemaT,
    report: ExecutabilityValidationResult & { status: 'ERROR' }
  ): Promise<void>;

  getValidationRecord(planId: string): Promise<PlanValidationRecord | undefined>;
}
