import type { PlanAdmissionLink, PlanExecutabilityRecord, PlanRecord } from '@dvt/contracts';

/**
 * Write-side plan-store port owned by the Artifacts bounded context.
 *
 * ADR-0043: behavior ports for persisted plan storage belong to @dvt/artifacts.
 */
export interface IPlanStoreWriter {
  createPlanRecord(record: PlanRecord): Promise<void>;
  recordExecutability(record: PlanExecutabilityRecord): Promise<void>;
  markAdmitted(link: PlanAdmissionLink): Promise<void>;
  markSuperseded(
    planId: PlanRecord['planId'],
    supersededByPlanId: PlanRecord['planId']
  ): Promise<void>;
  archivePlan(planId: PlanRecord['planId'], archivedAtIso: string): Promise<void>;
}
