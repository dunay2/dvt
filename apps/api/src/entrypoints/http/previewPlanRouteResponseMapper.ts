/**
 * Owned concern: internal preview-plan use-case response mapping inside the
 * plan-route response translation component.
 */
import {
  PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION,
  PLAN_PREVIEW_REJECTED_OUTCOME_KIND,
  type PlanPreviewRejectedOutcome,
} from '@dvt/contracts';

import type { PreviewPlanUseCaseResult } from '../../application/services/PreviewPlanUseCase.js';

import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  type HttpResponseModel,
} from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { buildPreviewResponse } from './planPreviewResponseMapper.js';
import { normalizePlanRef } from './planRefHttpMapper.js';
import type { ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';

export type PreviewPlanRouteResultResponse =
  | {
      readonly kind: 'accepted';
      readonly payload: ReturnType<typeof buildPreviewResponse>;
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
      normalizePlanRef(result.planRef),
      parsedRequest.contractRequest.provenance,
      parsedRequest.previewProfile
    ),
  };
}

function buildRejectedOutcome(
  result: Exclude<PreviewPlanUseCaseResult, { readonly kind: 'accepted' }>,
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
    normalizePlanRef(result.planRef),
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
