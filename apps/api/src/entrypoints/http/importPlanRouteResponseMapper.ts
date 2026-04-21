/**
 * Owned concern: internal import-plan response mapping inside the plan-route
 * response translation component.
 */
import {
  IMPORT_PLAN_RESULT_KIND,
  type ImportPlanUseCaseResult,
} from '../../application/services/ImportPlanUseCase.js';

import type { PlanRouteFacadeResponse } from './executePlanRouteFacade.js';
import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  type HttpResponseModel,
} from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { buildImportPlanResponse } from './planImportResponseMapper.js';

export function mapImportPlanUseCaseResult(
  result: ImportPlanUseCaseResult
): PlanRouteFacadeResponse<ReturnType<typeof buildImportPlanResponse>> {
  if (result.kind === IMPORT_PLAN_RESULT_KIND.scopeMismatch) {
    return {
      kind: 'rejected',
      response: createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.forbidden,
        reason: HTTP_ERROR_REASON.tenantAccessDenied,
        details: { cause: 'plan_scope_mismatch' },
      }),
    };
  }

  return {
    kind: 'accepted',
    payload: buildImportPlanResponse(result.plan, result.planRef),
  };
}

export function mapImportPlanInternalError(): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.internalServerError,
    reason: HTTP_ERROR_REASON.internalError,
  });
}
