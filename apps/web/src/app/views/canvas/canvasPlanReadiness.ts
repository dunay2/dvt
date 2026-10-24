/** Owned concern: evaluate current Canvas Run admission and exact Preview proof. */
import type { PlanViewModel } from '../../types/plans';
import type { PlanRef } from '../../types/engine';
import type { CanvasRunAdmission, CanvasRunBlocker } from './canvasRuntimePolicy';
import type { CanvasPreviewOutcomeDiagnostic } from './canvasPreviewOutcomeProjection';

export type PlanRunReadinessBlocker = 'plan_integrity' | CanvasRunBlocker;

export type CanvasExecutableGraphFailure =
  | Readonly<{
      cause:
        | 'execution_selection_unavailable'
        | 'graph_authority_unavailable'
        | 'protected_path_required';
    }>
  | Readonly<{ cause: 'dbt_projection_failed'; diagnostic: string }>;

export type PlanRunReadinessReadModel = Readonly<{
  rail: 'ObservePlanRunReadiness';
  status: 'ready' | 'blocked';
  blockers: readonly PlanRunReadinessBlocker[];
  summary: string;
  diagnostic?: Readonly<{ blocker: PlanRunReadinessBlocker; message: string }>;
}>;

export type PlanRunPreviewState =
  'required' | 'stale' | 'plan_ref_unavailable' | 'identity_mismatch' | 'not_persisted' | 'ready';

type AdmittedRunTarget = Readonly<{ plan: PlanViewModel; planRef: PlanRef }>;
type PreviewProof =
  | Readonly<{ state: 'ready'; target: AdmittedRunTarget }>
  | Readonly<{ state: Exclude<PlanRunPreviewState, 'ready'>; target: null }>;

export type PlanRunReadinessDiagnostic =
  | Readonly<{
      kind: 'preview';
      blocker: PlanRunReadinessBlocker;
      diagnostic: CanvasPreviewOutcomeDiagnostic | null;
    }>
  | Readonly<{ kind: 'graph'; blocker: 'plan_integrity'; failure: CanvasExecutableGraphFailure }>;

type ReadinessFacts = Readonly<{
  rail: 'ObservePlanRunReadiness';
  previewState: PlanRunPreviewState;
  blockers: readonly PlanRunReadinessBlocker[];
  diagnostic: PlanRunReadinessDiagnostic | null;
}>;

export type PlanRunReadinessEvaluation = ReadinessFacts &
  (
    | Readonly<{ status: 'ready'; target: AdmittedRunTarget; primaryBlocker: null }>
    | Readonly<{ status: 'blocked'; target: null; primaryBlocker: PlanRunReadinessBlocker }>
  );

export type PlanRunReadinessArgs = Readonly<{
  runAdmission: CanvasRunAdmission;
  currentPlan: PlanViewModel | null;
  isCurrentPlanStale: boolean;
  previewProvenanceMismatch: boolean;
  executionAvailable: boolean;
  graphFailure: CanvasExecutableGraphFailure | null;
  previewRejection: Extract<PlanRunReadinessDiagnostic, { kind: 'preview' }> | null;
}>;

function evaluatePreviewProof(args: PlanRunReadinessArgs): PreviewProof {
  const plan = args.currentPlan;
  if (plan == null) return { state: 'required', target: null };
  if (args.isCurrentPlanStale) return { state: 'stale', target: null };
  const planRef = plan.planRef;
  if (!planRef) return { state: 'plan_ref_unavailable', target: null };
  const persisted = plan.preview?.persisted;
  const hasRecord = Boolean(persisted?.planRecordId && persisted.canonicalPlanSha256);
  if (
    args.previewProvenanceMismatch ||
    (hasRecord &&
      (persisted?.planRecordId !== plan.planId || planRef.planId !== persisted?.planRecordId))
  )
    return { state: 'identity_mismatch', target: null };
  if (!hasRecord) return { state: 'not_persisted', target: null };
  return { state: 'ready', target: { plan, planRef } };
}

export function observePlanRunReadiness(args: PlanRunReadinessArgs): PlanRunReadinessEvaluation {
  const proof = evaluatePreviewProof(args);
  const diagnostic: PlanRunReadinessDiagnostic | null =
    args.previewRejection ??
    (args.graphFailure == null
      ? null
      : { kind: 'graph', blocker: 'plan_integrity', failure: args.graphFailure });
  const blockers = [
    ...new Set(
      [
        args.runAdmission.allowed ? null : args.runAdmission.reason,
        args.executionAvailable ? null : ('capability_mismatch' as const),
        proof.target == null ? ('plan_integrity' as const) : null,
        diagnostic?.blocker ?? null,
      ].filter((blocker): blocker is PlanRunReadinessBlocker => blocker !== null)
    ),
  ];
  const facts: ReadinessFacts = {
    rail: 'ObservePlanRunReadiness',
    previewState: proof.state,
    blockers,
    diagnostic,
  };
  if (proof.target != null && blockers.length === 0) {
    return { ...facts, status: 'ready', target: proof.target, primaryBlocker: null };
  }
  const primaryBlocker = blockers[0];
  if (primaryBlocker === undefined) throw new Error('Blocked readiness must carry a blocker.');
  return { ...facts, status: 'blocked', target: null, primaryBlocker };
}
