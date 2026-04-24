import type { PlanViewModel } from '../../types/plans';
import type { PlanRef } from '../../types/engine';
import { canvasViewCopy } from './copy';

export function resolvePlanRefForStartRun(plan: PlanViewModel): PlanRef | null {
  return plan.planRef ?? null;
}

export function hasPersistedPreviewProof(plan: PlanViewModel | null): boolean {
  if (!plan?.preview?.persisted || !plan.planRef) {
    return false;
  }

  const hasPersistenceRecord = Boolean(
    plan.preview.persisted.planRecordId && plan.preview.persisted.canonicalPlanSha256
  );
  if (!hasPersistenceRecord) {
    return false;
  }

  return !hasPersistedPreviewIdentityMismatch(plan);
}

export function hasPersistedPreviewIdentityMismatch(plan: PlanViewModel | null): boolean {
  if (!plan?.planRef || !hasPersistedPreviewRecord(plan)) {
    return false;
  }

  const persistedPlanRecordId = plan.preview?.persisted?.planRecordId;
  if (!persistedPlanRecordId) {
    return false;
  }

  return (
    persistedPlanRecordId !== plan.planId || plan.planRef.planId !== persistedPlanRecordId
  );
}

export function buildPlanStatusSummary(args: {
  canRun: boolean;
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  persistedPreviewIdentityMismatch: boolean;
  hasPersistedPlanForRun: boolean;
}): string {
  if (!args.canRun) {
    return canvasViewCopy.planStatusRunUnavailableMessage;
  }
  if (args.currentPlan == null) {
    return canvasViewCopy.planStatusPreviewRequiredMessage;
  }
  if (args.isCurrentPlanStale) {
    return canvasViewCopy.runPreviewStaleMessage;
  }
  if (!args.currentPlan.planRef) {
    return canvasViewCopy.runPlanRefUnavailableMessage;
  }
  if (args.persistedPreviewIdentityMismatch) {
    return canvasViewCopy.planStatusPreviewNotAlignedMessage;
  }
  if (!args.hasPersistedPlanForRun) {
    return canvasViewCopy.planStatusPreviewNotPersistedMessage;
  }
  return canvasViewCopy.planStatusPreviewReadyMessage;
}

function hasPersistedPreviewRecord(plan: PlanViewModel | null): boolean {
  return Boolean(
    plan?.preview?.persisted?.planRecordId && plan.preview?.persisted?.canonicalPlanSha256
  );
}
