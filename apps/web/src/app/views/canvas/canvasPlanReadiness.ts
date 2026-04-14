import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef } from '../../types/engine';

export function resolvePlanRefForStartRun(plan: ExecutionPlan): PlanRef | null {
  return plan.planRef ?? null;
}

export function hasPersistedPreviewProof(plan: ExecutionPlan | null): boolean {
  if (!plan?.preview?.persisted || !plan.planRef) {
    return false;
  }

  const hasPersistenceRecord = Boolean(
    plan.preview.persisted.planRecordId && plan.preview.persisted.canonicalPlanSha256
  );
  if (!hasPersistenceRecord) {
    return false;
  }

  return plan.preview.persisted.canonicalPlanSha256 === plan.planRef.sha256;
}

export function hasPlanRefHashMismatch(plan: ExecutionPlan | null): boolean {
  if (!plan?.planRef || !hasPersistedPreviewRecord(plan)) {
    return false;
  }

  const persistedSha = plan.preview?.persisted?.canonicalPlanSha256;
  if (!persistedSha) {
    return false;
  }

  return persistedSha !== plan.planRef.sha256;
}

export function buildPlanStatusSummary(args: {
  canRun: boolean;
  currentPlan: ExecutionPlan | null;
  isCurrentPlanStale: boolean;
  planRefHashMismatch: boolean;
  hasPersistedPlanForRun: boolean;
}): string {
  if (!args.canRun) {
    return 'Run start is unavailable in this context.';
  }
  if (args.currentPlan == null) {
    return 'Preview required before running.';
  }
  if (args.isCurrentPlanStale) {
    return 'Preview is stale. Re-run Plan before starting.';
  }
  if (!args.currentPlan.planRef) {
    return 'Plan reference is unavailable. Re-run Plan before starting.';
  }
  if (args.planRefHashMismatch) {
    return 'Preview is not aligned with the active plan reference. Re-run Plan before starting.';
  }
  if (!args.hasPersistedPlanForRun) {
    return 'Preview is not persisted. Re-run Plan to create a persisted plan.';
  }
  return 'Preview is current and ready to run.';
}

function hasPersistedPreviewRecord(plan: ExecutionPlan | null): boolean {
  return Boolean(
    plan?.preview?.persisted?.planRecordId && plan.preview?.persisted?.canonicalPlanSha256
  );
}
