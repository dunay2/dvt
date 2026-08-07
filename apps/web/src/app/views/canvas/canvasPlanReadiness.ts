/**
 * Owned concern: publish the Canvas ObservePlanRunReadiness read model and
 * keep plan/run disabled reasons source-owned before toolbar presentation.
 */
import type { PlanViewModel } from '../../types/plans';
import type { PlanRef } from '../../types/engine';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

export type PlanRunReadinessBlocker =
  | 'plan_integrity'
  | 'backpressure'
  | 'capability_mismatch'
  | 'adapter_degraded'
  | 'authorization_denied';

export type PlanRunReadinessReadModel = {
  readonly rail: 'ObservePlanRunReadiness';
  readonly status: 'ready' | 'blocked';
  readonly blockers: readonly PlanRunReadinessBlocker[];
  readonly summary: string;
};

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

  return persistedPlanRecordId !== plan.planId || plan.planRef.planId !== persistedPlanRecordId;
}

export function buildPlanStatusSummary(args: {
  canRun: boolean;
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  persistedPreviewIdentityMismatch: boolean;
  hasPersistedPlanForRun: boolean;
  backpressure?: boolean;
  capabilityMismatch?: boolean;
  adapterDegraded?: boolean;
  locale?: string;
}): string {
  return observePlanRunReadiness(args).summary;
}

export function observePlanRunReadiness(args: {
  canRun: boolean;
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  persistedPreviewIdentityMismatch: boolean;
  hasPersistedPlanForRun: boolean;
  backpressure?: boolean;
  capabilityMismatch?: boolean;
  adapterDegraded?: boolean;
  locale?: string;
}): PlanRunReadinessReadModel {
  const blockers: PlanRunReadinessBlocker[] = [];

  if (!args.canRun) {
    blockers.push('authorization_denied');
  }
  if (
    args.currentPlan == null ||
    args.isCurrentPlanStale ||
    !args.currentPlan.planRef ||
    args.persistedPreviewIdentityMismatch ||
    !args.hasPersistedPlanForRun
  ) {
    blockers.push('plan_integrity');
  }
  if (args.backpressure === true) {
    blockers.push('backpressure');
  }
  if (args.capabilityMismatch === true) {
    blockers.push('capability_mismatch');
  }
  if (args.adapterDegraded === true) {
    blockers.push('adapter_degraded');
  }

  return {
    blockers,
    rail: 'ObservePlanRunReadiness',
    status: blockers.length === 0 ? 'ready' : 'blocked',
    summary: buildPlanRunReadinessSummary(args),
  };
}

function buildPlanRunReadinessSummary(args: {
  canRun: boolean;
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  persistedPreviewIdentityMismatch: boolean;
  hasPersistedPlanForRun: boolean;
  backpressure?: boolean;
  capabilityMismatch?: boolean;
  adapterDegraded?: boolean;
  locale?: string;
}): string {
  const copy = resolveCanvasViewCopy(args.locale);

  if (args.backpressure === true) {
    return copy.planStatusBackpressureMessage;
  }
  if (args.adapterDegraded === true) {
    return copy.planStatusAdapterDegradedMessage;
  }
  if (args.capabilityMismatch === true) {
    return copy.canvasExecutionUnavailableMessage;
  }
  if (!args.canRun) {
    return copy.planStatusRunUnavailableMessage;
  }
  if (args.currentPlan == null) {
    return copy.planStatusPreviewRequiredMessage;
  }
  if (args.isCurrentPlanStale) {
    return copy.runPreviewStaleMessage;
  }
  if (!args.currentPlan.planRef) {
    return copy.runPlanRefUnavailableMessage;
  }
  if (args.persistedPreviewIdentityMismatch) {
    return copy.planStatusPreviewNotAlignedMessage;
  }
  if (!args.hasPersistedPlanForRun) {
    return copy.planStatusPreviewNotPersistedMessage;
  }
  return copy.planStatusPreviewReadyMessage;
}

function hasPersistedPreviewRecord(plan: PlanViewModel | null): boolean {
  return Boolean(
    plan?.preview?.persisted?.planRecordId && plan.preview?.persisted?.canonicalPlanSha256
  );
}
