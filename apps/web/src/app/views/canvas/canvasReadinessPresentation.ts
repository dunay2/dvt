/** Owned concern: present evaluated Canvas readiness without changing admission. */
import { resolveDvtOperationalRejectionCopy } from '../../services/api/dvtOperationalRejectionCopy';
import {
  getApplicationLanguage,
  normalizeApplicationLanguage,
} from '../../stores/applicationLanguageStore';
import type { CanvasViewCopy } from './canvasCopy.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { formatTransformationGraphValidationSummary } from './canvasCopyFormatting';
import type { CanvasExecutionState } from './canvasExecutionState';
import type {
  PlanRunPreviewState,
  PlanRunReadinessBlocker,
  PlanRunReadinessEvaluation,
  PlanRunReadinessReadModel,
} from './canvasPlanReadiness';

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

function resolvePreviewReadinessMessage(state: PlanRunPreviewState, copy: CanvasViewCopy): string {
  switch (state) {
    case 'required':
      return copy.planStatusPreviewRequiredMessage;
    case 'stale':
      return copy.runPreviewStaleMessage;
    case 'plan_ref_unavailable':
      return copy.runPlanRefUnavailableMessage;
    case 'identity_mismatch':
      return copy.planStatusPreviewNotAlignedMessage;
    case 'not_persisted':
      return copy.planStatusPreviewNotPersistedMessage;
    case 'ready':
      return copy.planStatusPreviewReadyMessage;
  }
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

export function presentPlanRunReadiness(
  evaluation: PlanRunReadinessEvaluation,
  locale?: string
): PlanRunReadinessReadModel {
  const copy = resolveCanvasViewCopy(locale);
  const previewSummary = resolvePreviewReadinessMessage(evaluation.previewState, copy);
  return {
    rail: evaluation.rail,
    status: evaluation.status,
    blockers: evaluation.blockers,
    summary:
      evaluation.summaryBlocker == null
        ? previewSummary
        : resolvePlanRunBlockerMessage(evaluation.summaryBlocker, copy),
    ...(evaluation.blockers.includes('plan_integrity')
      ? { diagnostic: { blocker: 'plan_integrity' as const, message: previewSummary } }
      : {}),
  };
}

export function presentCanvasExecutionState(
  state: CanvasExecutionState,
  applicationLanguage?: string
): Readonly<{
  executableGraphFailureMessage: string | null;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
}> {
  const failure = state.executableGraphFailure;
  const executableGraphFailureMessage =
    failure == null
      ? null
      : failure.kind === 'projection'
        ? failure.message
        : formatTransformationGraphValidationSummary(failure.summaryCode, applicationLanguage);
  const base = presentPlanRunReadiness(state.planRunReadiness, applicationLanguage);
  const source = state.readinessDiagnostic;
  const message =
    source?.kind === 'preview'
      ? (resolveDvtOperationalRejectionCopy(
          source.diagnostic?.cause,
          normalizeApplicationLanguage(applicationLanguage) ?? getApplicationLanguage()
        ) ??
        source.diagnostic?.reason ??
        base.summary)
      : source?.kind === 'graph'
        ? executableGraphFailureMessage
        : null;
  const planRunReadiness =
    source != null && message != null
      ? {
          ...base,
          summary: message,
          diagnostic: {
            blocker: source.kind === 'preview' ? source.blocker : ('plan_integrity' as const),
            message,
          },
        }
      : base;
  return {
    executableGraphFailureMessage,
    planRunReadiness,
    planStatusSummary: planRunReadiness.summary,
  };
}
