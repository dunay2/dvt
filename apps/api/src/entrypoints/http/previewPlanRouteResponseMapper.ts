/**
 * Owned concern: internal preview-plan use-case response mapping inside the
 * plan-route response translation component.
 */
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
  if (result.kind === 'rejected') {
    return {
      kind: 'rejected',
      response: createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.planRejected,
        details: {
          code: result.validation.code,
          adapterId: result.validation.adapterId,
          ...(result.validation.cause === undefined
            ? {}
            : { cause: result.validation.cause }),
          rejectionReason: result.validation.reason,
        },
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

export function mapPreviewPlanInternalError(): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.internalServerError,
    reason: HTTP_ERROR_REASON.internalError,
  });
}
