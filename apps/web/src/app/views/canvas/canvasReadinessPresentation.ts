/** Owned concern: present typed Canvas readiness and Run failures without changing admission. */
import { resolveDvtOperationalRejectionCopy } from '../../services/api/dvtOperationalRejectionCopy';
import {
  getApplicationLanguage,
  normalizeApplicationLanguage,
} from '../../stores/applicationLanguageStore';
import type { CanvasViewCopy } from './canvasCopy.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasRunStartFailure } from './canvasExecutionActions.types';
import type {
  CanvasExecutableGraphFailure,
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
    case 'capability_mismatch':
      return copy.operationalDrawerCapabilityMismatchBlocker;
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
  return readiness.diagnostic?.blocker === blocker
    ? readiness.diagnostic.message
    : resolvePlanRunBlockerMessage(blocker, copy);
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
    case 'capability_mismatch':
      return copy.canvasExecutionUnavailableMessage;
    case 'plan_integrity':
      return copy.planStatusPreviewRequiredMessage;
  }
}

export function resolveCanvasExecutionGraphFailureMessage(
  failure: CanvasExecutableGraphFailure,
  copy: CanvasViewCopy
): string {
  switch (failure.cause) {
    case 'execution_selection_unavailable':
      return copy.dbtExplicitSelectionRequiresExecutableResourceMessage;
    case 'graph_authority_unavailable':
      return copy.planGraphAuthorityRefusedMessage;
    case 'protected_path_required':
      return copy.previewProvenanceTransformPathRequiredMessage;
    case 'dbt_projection_failed':
      return failure.diagnostic;
  }
}

export function presentPlanRunReadiness(
  evaluation: PlanRunReadinessEvaluation,
  locale?: string
): PlanRunReadinessReadModel {
  const copy = resolveCanvasViewCopy(locale);
  const previewMessage = resolvePreviewReadinessMessage(evaluation.previewState, copy);
  const source = evaluation.diagnostic;
  const diagnostic =
    source?.kind === 'graph'
      ? {
          blocker: source.blocker,
          message: resolveCanvasExecutionGraphFailureMessage(source.failure, copy),
        }
      : source?.kind === 'preview'
        ? {
            blocker: source.blocker,
            message:
              resolveDvtOperationalRejectionCopy(
                source.diagnostic?.cause,
                normalizeApplicationLanguage(locale) ?? getApplicationLanguage()
              ) ??
              source.diagnostic?.reason ??
              resolvePlanRunBlockerMessage(source.blocker, copy),
          }
        : evaluation.previewState !== 'ready'
          ? { blocker: 'plan_integrity' as const, message: previewMessage }
          : undefined;
  const summary =
    evaluation.status === 'ready'
      ? previewMessage
      : diagnostic?.blocker === evaluation.primaryBlocker
        ? diagnostic.message
        : evaluation.primaryBlocker === 'plan_integrity'
          ? previewMessage
          : resolvePlanRunBlockerMessage(evaluation.primaryBlocker, copy);
  return {
    rail: evaluation.rail,
    status: evaluation.status,
    blockers: evaluation.blockers,
    summary,
    ...(diagnostic == null ? {} : { diagnostic }),
  };
}

export function presentCanvasRunStartFailure(
  failure: CanvasRunStartFailure,
  locale?: string
): Readonly<{
  message: string;
  shouldOpenPlanModal: boolean;
}> {
  const copy = resolveCanvasViewCopy(locale);
  if (failure.kind === 'submission')
    return { message: failure.message ?? copy.runFailedMessage, shouldOpenPlanModal: false };
  const evaluation = failure.readiness;
  if (evaluation.primaryBlocker !== 'plan_integrity' || evaluation.diagnostic != null) {
    return {
      message: presentPlanRunReadiness(evaluation, locale).summary,
      shouldOpenPlanModal: false,
    };
  }
  switch (evaluation.previewState) {
    case 'required':
      return { message: copy.runNoPlanMessage, shouldOpenPlanModal: false };
    case 'stale':
      return { message: copy.runPreviewStaleMessage, shouldOpenPlanModal: true };
    case 'plan_ref_unavailable':
      return { message: copy.runPlanRefUnavailableMessage, shouldOpenPlanModal: true };
    case 'identity_mismatch':
    case 'not_persisted':
      return { message: copy.runPersistedPreviewRequiredMessage, shouldOpenPlanModal: true };
    case 'ready':
      return { message: copy.planStatusPreviewRequiredMessage, shouldOpenPlanModal: false };
  }
}
