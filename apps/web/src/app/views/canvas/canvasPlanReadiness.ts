/**
 * Owned concern: evaluate Canvas Preview proof and typed Run blockers.
 */
import type { PlanViewModel } from '../../types/plans';
import type { PlanRef } from '../../types/engine';
import type { CanvasRunAdmission, CanvasRunBlocker } from './canvasRuntimePolicy';

export type PlanRunReadinessBlocker =
  'plan_integrity' | 'backpressure' | 'adapter_degraded' | CanvasRunBlocker;

type PlanRunReadinessStatus = {
  readonly rail: 'ObservePlanRunReadiness';
  readonly status: 'ready' | 'blocked';
  readonly blockers: readonly PlanRunReadinessBlocker[];
};

export type PlanRunReadinessReadModel = PlanRunReadinessStatus & {
  readonly summary: string;
  readonly diagnostic?: Readonly<{ blocker: PlanRunReadinessBlocker; message: string }>;
};

export type PlanRunPreviewState =
  'required' | 'stale' | 'plan_ref_unavailable' | 'identity_mismatch' | 'not_persisted' | 'ready';

export type PlanRunReadinessEvaluation = PlanRunReadinessStatus & {
  readonly previewState: PlanRunPreviewState;
  readonly summaryBlocker: Exclude<PlanRunReadinessBlocker, 'plan_integrity'> | null;
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
};

function resolvePreviewReadinessState(args: PlanRunReadinessArgs): PlanRunPreviewState {
  if (args.currentPlan == null) return 'required';
  if (args.isCurrentPlanStale) return 'stale';
  if (!args.currentPlan.planRef) return 'plan_ref_unavailable';
  if (args.persistedPreviewIdentityMismatch) return 'identity_mismatch';
  if (!args.hasPersistedPlanForRun) return 'not_persisted';
  return 'ready';
}

export function observePlanRunReadiness(args: PlanRunReadinessArgs): PlanRunReadinessEvaluation {
  const blockers: PlanRunReadinessBlocker[] = [];
  if (!args.runAdmission.allowed) blockers.push(args.runAdmission.reason);
  const previewState = resolvePreviewReadinessState(args);
  if (previewState !== 'ready') {
    blockers.push('plan_integrity');
  }
  for (const [active, blocker] of [
    [args.backpressure, 'backpressure'],
    [args.capabilityMismatch, 'capability_mismatch'],
    [args.adapterDegraded, 'adapter_degraded'],
  ] as const) {
    if (active && !blockers.includes(blocker)) blockers.push(blocker);
  }
  const summaryBlocker = args.backpressure
    ? 'backpressure'
    : args.adapterDegraded
      ? 'adapter_degraded'
      : args.capabilityMismatch
        ? 'capability_mismatch'
        : !args.runAdmission.allowed
          ? args.runAdmission.reason
          : null;
  return {
    blockers,
    rail: 'ObservePlanRunReadiness',
    status: blockers.length === 0 ? 'ready' : 'blocked',
    previewState,
    summaryBlocker,
  };
}

function hasPersistedPreviewRecord(plan: PlanViewModel | null): boolean {
  return Boolean(
    plan?.preview?.persisted?.planRecordId && plan.preview?.persisted?.canonicalPlanSha256
  );
}
