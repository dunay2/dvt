/**
 * Owned concern: publish the Canvas ObservePlanRunReadiness read model and
 * keep plan/run disabled reasons source-owned before toolbar presentation.
 */
import type { PlanViewModel } from '../../types/plans';
import type { PlanRef } from '../../types/engine';
import { canvasViewCopy } from './copy';

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
}): string {
  if (args.backpressure === true) {
    return 'Runtime admission is temporarily backpressured. Retry after capacity recovers.';
  }
  if (args.adapterDegraded === true) {
    return 'The execution adapter is degraded. Run start remains blocked until runtime recovers.';
  }
  if (args.capabilityMismatch === true) {
    return canvasViewCopy.canvasExecutionUnavailableMessage;
  }
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
