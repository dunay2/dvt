/**
 * Owned concern: publish the Canvas ObservePlanRunReadiness read model and
 * keep plan/run disabled reasons source-owned before toolbar presentation.
 */
import type { PlanViewModel } from '../../types/plans';
import type { PlanRef } from '../../types/engine';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasRunAdmission, CanvasRunBlocker } from './canvasRuntimePolicy';

export type PlanRunReadinessBlocker =
  'plan_integrity' | 'backpressure' | 'adapter_degraded' | CanvasRunBlocker;

export type PlanRunReadinessReadModel = {
  readonly rail: 'ObservePlanRunReadiness';
  readonly status: 'ready' | 'blocked';
  readonly blockers: readonly PlanRunReadinessBlocker[];
  readonly summary: string;
  readonly diagnostic?: Readonly<{ blocker: PlanRunReadinessBlocker; message: string }>;
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

type PlanRunReadinessArgs = {
  runAdmission: CanvasRunAdmission;
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  persistedPreviewIdentityMismatch: boolean;
  hasPersistedPlanForRun: boolean;
  backpressure?: boolean;
  capabilityMismatch?: boolean;
  adapterDegraded?: boolean;
  locale?: string;
};

export function resolvePlanRunReadinessBlockerLabel(
  blocker: PlanRunReadinessBlocker,
  copy: CanvasViewCopy
): string {
  switch (blocker) {
    case 'plan_integrity':
      return copy.operationalDrawerPlanIntegrityBlocker;
    case 'backpressure':
      return copy.operationalDrawerBackpressureBlocker;
    case 'capability_mismatch':
      return copy.operationalDrawerCapabilityMismatchBlocker;
    case 'adapter_degraded':
      return copy.operationalDrawerAdapterDegradedBlocker;
    case 'authorization_denied':
      return copy.operationalDrawerAuthorizationDeniedBlocker;
    case 'draft_saving':
      return copy.operationalDrawerDraftSavingBlocker;
    case 'draft_unavailable':
      return copy.operationalDrawerDraftUnavailableBlocker;
  }
}

function resolvePreviewReadinessMessage(args: PlanRunReadinessArgs, copy: CanvasViewCopy): string {
  if (args.currentPlan == null) return copy.planStatusPreviewRequiredMessage;
  if (args.isCurrentPlanStale) return copy.runPreviewStaleMessage;
  if (!args.currentPlan.planRef) return copy.runPlanRefUnavailableMessage;
  if (args.persistedPreviewIdentityMismatch) return copy.planStatusPreviewNotAlignedMessage;
  if (!args.hasPersistedPlanForRun) return copy.planStatusPreviewNotPersistedMessage;
  return copy.planStatusPreviewReadyMessage;
}

export function resolvePlanRunReadinessBlockerMessage(
  readiness: PlanRunReadinessReadModel,
  blocker: PlanRunReadinessBlocker,
  copy: CanvasViewCopy
): string {
  if (readiness.diagnostic?.blocker === blocker) return readiness.diagnostic.message;
  return resolvePlanRunBlockerMessage(blocker, copy);
}

export function resolvePlanRunBlockerMessage(
  blocker: PlanRunReadinessBlocker,
  copy: CanvasViewCopy
): string {
  switch (blocker) {
    case 'authorization_denied':
      return copy.planStatusRunAuthorizationDeniedMessage;
    case 'draft_saving':
      return copy.planStatusDraftSavingMessage;
    case 'draft_unavailable':
      return copy.planStatusDraftUnavailableMessage;
    case 'backpressure':
      return copy.planStatusBackpressureMessage;
    case 'capability_mismatch':
      return copy.canvasExecutionUnavailableMessage;
    case 'adapter_degraded':
      return copy.planStatusAdapterDegradedMessage;
    case 'plan_integrity':
      return copy.planStatusPreviewRequiredMessage;
  }
}

export function observePlanRunReadiness(args: PlanRunReadinessArgs): PlanRunReadinessReadModel {
  const blockers: PlanRunReadinessBlocker[] = [];
  if (!args.runAdmission.allowed) blockers.push(args.runAdmission.reason);
  if (
    args.currentPlan == null ||
    args.isCurrentPlanStale ||
    !args.currentPlan.planRef ||
    args.persistedPreviewIdentityMismatch ||
    !args.hasPersistedPlanForRun
  ) {
    blockers.push('plan_integrity');
  }
  for (const [active, blocker] of [
    [args.backpressure, 'backpressure'],
    [args.capabilityMismatch, 'capability_mismatch'],
    [args.adapterDegraded, 'adapter_degraded'],
  ] as const) {
    if (active && !blockers.includes(blocker)) blockers.push(blocker);
  }
  const copy = resolveCanvasViewCopy(args.locale);
  const previewSummary = resolvePreviewReadinessMessage(args, copy);
  const readiness: PlanRunReadinessReadModel = {
    blockers,
    rail: 'ObservePlanRunReadiness',
    status: blockers.length === 0 ? 'ready' : 'blocked',
    summary: previewSummary,
    ...(blockers.includes('plan_integrity')
      ? { diagnostic: { blocker: 'plan_integrity' as const, message: previewSummary } }
      : {}),
  };
  const primary = args.backpressure
    ? 'backpressure'
    : args.adapterDegraded
      ? 'adapter_degraded'
      : args.capabilityMismatch
        ? 'capability_mismatch'
        : !args.runAdmission.allowed
          ? args.runAdmission.reason
          : null;
  return primary == null
    ? readiness
    : { ...readiness, summary: resolvePlanRunReadinessBlockerMessage(readiness, primary, copy) };
}

function hasPersistedPreviewRecord(plan: PlanViewModel | null): boolean {
  return Boolean(
    plan?.preview?.persisted?.planRecordId && plan.preview?.persisted?.canonicalPlanSha256
  );
}
