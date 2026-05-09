import type {
  PlanAdmissionLink,
  PlanExecutabilityRecord,
  PlanRecord,
  ScopedPlanId,
  ScopedPlanRef,
} from '@dvt/contracts';

/**
 * Owned concern: expose scoped plan-store query ports.
 *
 * Read-side plan-store port owned by the Artifacts bounded context.
 *
 * ADR-0043: behavior ports for persisted plan storage belong to @dvt/artifacts.
 */
export type ScopedPlanExecutabilityQuery = ScopedPlanId & {
  readonly adapterId?: string;
};

export interface IPlanStoreReader {
  getPlanRecord(input: ScopedPlanId): Promise<PlanRecord | undefined>;
  getPlanRecordByRef(input: ScopedPlanRef): Promise<PlanRecord | undefined>;
  listExecutabilityByAdapter(
    input: ScopedPlanExecutabilityQuery
  ): Promise<ReadonlyArray<PlanExecutabilityRecord>>;
  getAdmissionLinks(input: ScopedPlanId): Promise<ReadonlyArray<PlanAdmissionLink>>;
  getSupersession(
    input: ScopedPlanId
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined>;
}
