/** Owned concern: present typed Canvas readiness and Run failures without changing admission. */
import { resolveDvtOperationalRejectionCopy } from '../../services/api/dvtOperationalRejectionCopy';
import {
  getApplicationLanguage,
  normalizeApplicationLanguage,
} from '../../stores/applicationLanguageStore';
import type { CanvasViewCopy } from './canvasCopy.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';
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
  return {
    plan_integrity: copy.operationalDrawerPlanIntegrityBlocker,
    capability_mismatch: copy.operationalDrawerCapabilityMismatchBlocker,
    authorization_denied: copy.operationalDrawerAuthorizationDeniedBlocker,
    draft_saving: copy.operationalDrawerDraftSavingBlocker,
    draft_unavailable: copy.operationalDrawerDraftUnavailableBlocker,
  }[blocker];
}

function resolvePreviewReadinessMessage(state: PlanRunPreviewState, copy: CanvasViewCopy): string {
  return {
    required: copy.planStatusPreviewRequiredMessage,
    stale: copy.runPreviewStaleMessage,
    plan_ref_unavailable: copy.runPlanRefUnavailableMessage,
    identity_mismatch: copy.planStatusPreviewNotAlignedMessage,
    not_persisted: copy.planStatusPreviewNotPersistedMessage,
    ready: copy.planStatusPreviewReadyMessage,
  }[state];
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
  return {
    authorization_denied: copy.planStatusRunAuthorizationDeniedMessage,
    draft_saving: copy.planStatusDraftSavingMessage,
    draft_unavailable: copy.planStatusDraftUnavailableMessage,
    capability_mismatch: copy.canvasExecutionUnavailableMessage,
    plan_integrity: copy.planStatusPreviewRequiredMessage,
  }[blocker];
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
  const diagnostic = presentPlanReadinessDiagnostic(evaluation, copy, previewMessage, locale);
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

function presentPlanReadinessDiagnostic(
  evaluation: PlanRunReadinessEvaluation,
  copy: CanvasViewCopy,
  previewMessage: string,
  locale?: string
): PlanRunReadinessReadModel['diagnostic'] {
  const source = evaluation.diagnostic;
  if (source?.kind === 'graph') {
    return {
      blocker: source.blocker,
      message: resolveCanvasExecutionGraphFailureMessage(source.failure, copy),
    };
  }
  if (source?.kind === 'preview') return presentPreviewReadinessDiagnostic(source, copy, locale);
  if (evaluation.previewState === 'ready') return undefined;
  return { blocker: 'plan_integrity', message: previewMessage };
}

function presentPreviewReadinessDiagnostic(
  source: Extract<NonNullable<PlanRunReadinessEvaluation['diagnostic']>, { kind: 'preview' }>,
  copy: CanvasViewCopy,
  locale?: string
): NonNullable<PlanRunReadinessReadModel['diagnostic']> {
  const rejection = source.diagnostic;
  if (rejection == null)
    return { blocker: source.blocker, message: resolvePlanRunBlockerMessage(source.blocker, copy) };
  const message =
    resolveDvtOperationalRejectionCopy(
      rejection.cause,
      normalizeApplicationLanguage(locale) ?? getApplicationLanguage()
    ) ?? rejection.reason;
  if (message != null && rejection.affectedModel != null) {
    return {
      blocker: source.blocker,
      message: formatCanvasCopyTemplate(copy.planPreviewAffectedModelMessageTemplate, {
        name: rejection.affectedModel.name,
        message,
      }),
    };
  }
  return {
    blocker: source.blocker,
    message: message ?? resolvePlanRunBlockerMessage(source.blocker, copy),
  };
}
