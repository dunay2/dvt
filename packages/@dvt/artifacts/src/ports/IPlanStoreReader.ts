import type {
  PlanAdmissionLink,
  PlanExecutabilityRecord,
  PlanRecord,
  PlanRefSchemaT,
} from '@dvt/contracts';

/**
 * Read-side plan-store port owned by the Artifacts bounded context.
 *
 * ADR-0043: behavior ports for persisted plan storage belong to @dvt/artifacts.
 */
export interface IPlanStoreReader {
  getPlanRecord(planId: PlanRecord['planId']): Promise<PlanRecord | undefined>;
  getPlanRecordByRef(planRef: PlanRefSchemaT): Promise<PlanRecord | undefined>;
  listExecutabilityByAdapter(
    planId: PlanRecord['planId']
  ): Promise<ReadonlyArray<PlanExecutabilityRecord>>;
  getAdmissionLinks(planId: PlanRecord['planId']): Promise<ReadonlyArray<PlanAdmissionLink>>;
  getSupersession(
    planId: PlanRecord['planId']
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined>;
}
