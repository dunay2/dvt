import type { CompileExternalPlanResult } from '../../application/services/CompileExternalPlanUseCase.js';

import type { PlanRouteFacadeResponse } from './executePlanRouteFacade.js';
import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  type HttpResponseModel,
} from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { buildPlanCompileResponse } from './planCompileResponseMapper.js';

export function mapCompilePlanUseCaseResult(
  result: CompileExternalPlanResult
): PlanRouteFacadeResponse<ReturnType<typeof buildPlanCompileResponse>> {
  return {
    kind: 'accepted',
    payload: buildPlanCompileResponse(result),
  };
}

export function mapCompilePlanInternalError(): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.internalServerError,
    reason: HTTP_ERROR_REASON.internalError,
  });
}
