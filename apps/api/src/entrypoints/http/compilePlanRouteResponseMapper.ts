/**
 * Owned concern: map compile-plan application results to HTTP responses.
 */
import type { PlanCompileResponseV1SchemaT } from '@dvt/contracts';

import type { CompilePlanResult } from '../../application/services/CompilePlanUseCase.js';

import type { PlanRouteFacadeResponse } from './executePlanRouteFacade.js';
import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  type HttpResponseModel,
} from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';

export function mapCompilePlanUseCaseResult(
  result: CompilePlanResult
): PlanRouteFacadeResponse<PlanCompileResponseV1SchemaT> {
  return {
    kind: 'accepted',
    payload: {
      plan: result.plan,
      compile: {
        persisted: false,
        executabilityValidated: false,
      },
    },
  };
}

export function mapCompilePlanInternalError(): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.internalServerError,
    reason: HTTP_ERROR_REASON.internalError,
  });
}
