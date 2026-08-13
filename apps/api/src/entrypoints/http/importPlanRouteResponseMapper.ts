/**
 * Owned concern: map import-plan application results to HTTP responses.
 */
import type { ExecutionPlan, PlanRef } from '@dvt/contracts';

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

export interface ImportPlanRouteResponse {
  readonly plan: ExecutionPlan;
  readonly planRef: PlanRef;
}

export function mapImportPlanUseCaseResult(
  result: ImportPlanUseCaseResult
): PlanRouteFacadeResponse<ImportPlanRouteResponse> {
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
    payload: {
      plan: result.plan,
      planRef: result.planRef,
    },
  };
}

export function mapImportPlanInternalError(): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.internalServerError,
    reason: HTTP_ERROR_REASON.internalError,
  });
}
