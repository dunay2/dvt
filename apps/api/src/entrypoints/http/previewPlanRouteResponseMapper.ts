/**
 * Owned concern: map preview-plan application results to HTTP responses.
 */
import {
  PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION,
  PLAN_PREVIEW_REJECTED_OUTCOME_KIND,
  type ExecutionPlan,
  type PlanPreviewProvenance,
  type PlanPreviewRejectedOutcome,
  type PlanRecord,
  type PlanRef,
  type PreviewProfile,
} from '@dvt/contracts';

import type { PreviewPlanUseCaseResult } from '../../application/services/PreviewPlanUseCase.js';

import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  type HttpResponseModel,
} from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import type { ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';

export type PreviewRouteResponse = {
  previewProfile: PreviewProfile;
  plan: ExecutionPlan;
  planRef: PlanRef;
  persisted: {
    planRecordId: string;
    canonicalPlanSha256: string;
  };
  validation: {
    valid: true;
    warnings: string[];
  };
  provenance?: PlanPreviewProvenance;
};

export type PreviewPlanRouteResultResponse =
  | {
      readonly kind: 'accepted';
      readonly payload: PreviewRouteResponse;
    }
  | {
      readonly kind: 'rejected';
      readonly response: HttpResponseModel;
    };

export function mapPreviewPlanUseCaseResult(
  result: PreviewPlanUseCaseResult,
  parsedRequest: ParsedPreviewPlanRequest
): PreviewPlanRouteResultResponse {
  if (result.kind !== 'accepted') {
    const outcome = buildRejectedOutcome(result, parsedRequest);
    return {
      kind: 'rejected',
      response: createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.planRejected,
        details: { ...outcome },
      }),
    };
  }

  return {
    kind: 'accepted',
    payload: buildPreviewResponse(
      result.plan,
      result.planRef,
      result.planRecord,
      parsedRequest.contractRequest.provenance,
      parsedRequest.previewProfile
    ),
  };
}

function buildRejectedOutcome(
  result: Extract<
    PreviewPlanUseCaseResult,
    { readonly kind: 'selection-rejected' | 'plan-invalid' }
  >,
  parsedRequest: ParsedPreviewPlanRequest
): PlanPreviewRejectedOutcome {
  if (result.kind === 'selection-rejected') {
    return {
      contractVersion: PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION,
      kind: PLAN_PREVIEW_REJECTED_OUTCOME_KIND.selectionRejected,
      rejection: result.rejection,
    };
  }

  const { validation: _acceptedValidation, ...preview } = buildPreviewResponse(
    result.plan,
    result.planRef,
    result.planRecord,
    parsedRequest.contractRequest.provenance,
    parsedRequest.previewProfile
  );
  return {
    contractVersion: PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION,
    kind: PLAN_PREVIEW_REJECTED_OUTCOME_KIND.planInvalid,
    ...preview,
    validation: result.validation,
  };
}

export function mapPreviewPlanInternalError(): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.internalServerError,
    reason: HTTP_ERROR_REASON.internalError,
  });
}

function buildPreviewResponse(
  plan: ExecutionPlan,
  planRef: PlanRef,
  planRecord: PlanRecord,
  provenance: PlanPreviewProvenance | undefined,
  previewProfile: PreviewProfile
): PreviewRouteResponse {
  return {
    previewProfile,
    plan,
    planRef,
    persisted: {
      planRecordId: planRecord.planId,
      canonicalPlanSha256: planRecord.canonicalHash,
    },
    validation: {
      valid: true,
      warnings: [],
    },
    ...(provenance === undefined ? {} : { provenance }),
  };
}
