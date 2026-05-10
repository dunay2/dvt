import type {
  PlanAdmissionLink,
  PlanExecutabilityRecord,
  PlanRecord,
  PlanStoreScope,
  ScopedPlanId,
} from '@dvt/contracts';

/**
 * Owned concern: expose scoped plan-store command ports.
 *
 * Write-side plan-store port owned by the Artifacts bounded context.
 *
 * ADR-0043: behavior ports for persisted plan storage belong to @dvt/artifacts.
 */
export type MarkPlanSupersededInput = ScopedPlanId & {
  readonly supersededByPlanId: PlanRecord['planId'];
};

export type ArchivePlanInput = PlanStoreScope & {
  readonly planId: PlanRecord['planId'];
  readonly archivedAtIso: string;
};

export interface IPlanStoreWriter {
  createPlanRecord(record: PlanRecord): Promise<void>;
  recordExecutability(record: PlanExecutabilityRecord): Promise<void>;
  markAdmitted(link: PlanAdmissionLink): Promise<void>;
  markSuperseded(input: MarkPlanSupersededInput): Promise<void>;
  archivePlan(input: ArchivePlanInput): Promise<void>;
}
