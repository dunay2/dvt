/**
 * Owned concern: translation of parse/auth/facade/engine outcomes into the
 * canonical HTTP error envelope, excluding runtime-domain error classification.
 */
import type { AuthenticationFailureCode } from '../../application/ports/auth.js';
import {
  START_RUN_ENGINE_ERROR_KIND,
  type StartRunEngineError,
} from '../../application/ports/startRunEngineErrorContract.js';
import {
  START_RUN_FACADE_RESULT_KIND,
  type StartRunFacadeResult,
} from '../../application/ports/startRunFacadeContract.js';
import { START_RUN_PLAN_REJECTION_CODE } from '../../application/ports/startRunResultContract.js';
import type { DeniedReason } from '../../domain/auth/types.js';

import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  HTTP_HEADER,
  normalizeHttpErrorReason,
  type HttpResponseModel,
} from './httpErrorContract.js';
import {
  compactHttpErrorDetails,
  withOptionalHttpErrorDetails,
} from './httpErrorDetails.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import type { RouteParseIssue } from './routeParseIssue.js';

export function mapRouteParseIssue(issue: RouteParseIssue): HttpResponseModel {
  return createHttpErrorResponse({
    type: issue.type,
    reason: issue.reason,
    ...(issue.target === undefined ? {} : { target: issue.target }),
    ...(issue.details === undefined ? {} : { details: issue.details }),
  });
}

export function mapStartRunFacadeResult(result: StartRunFacadeResult): HttpResponseModel {
  switch (result.kind) {
    case START_RUN_FACADE_RESULT_KIND.unauthenticated:
      return mapAuthenticationFailure(result.code);
    case START_RUN_FACADE_RESULT_KIND.unauthorized:
      return mapAuthorizationFailure(result.reason);
    case START_RUN_FACADE_RESULT_KIND.accepted:
      return {
        status: 202,
        body: { runId: result.runId, accepted: result.accepted },
      };
    case START_RUN_FACADE_RESULT_KIND.duplicate:
      return {
        status: 202,
        body: {
          runId: result.runId,
          accepted: result.accepted,
          duplicate: true,
          duplicateOf: result.duplicateOf,
        },
      };
    case START_RUN_FACADE_RESULT_KIND.tenantBackpressure:
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.rateLimited,
        reason: result.code,
        headers: { [HTTP_HEADER.retryAfter]: String(result.retryAfterSeconds) },
      });
    case START_RUN_FACADE_RESULT_KIND.systemBackpressure:
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.serviceUnavailable,
        reason: result.code,
        headers: { [HTTP_HEADER.retryAfter]: String(result.retryAfterSeconds) },
      });
    case START_RUN_FACADE_RESULT_KIND.rateLimited:
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.rateLimited,
        reason: result.code,
        ...(result.retryAfterSeconds === undefined
          ? {}
          : { headers: { [HTTP_HEADER.retryAfter]: String(result.retryAfterSeconds) } }),
      });
    case START_RUN_FACADE_RESULT_KIND.planRejected: {
      const planRejectedDetails = compactHttpErrorDetails({
        message: result.reason,
        ...(result.cause === undefined ? {} : { cause: result.cause }),
        ...(result.supportedVersions === undefined
          ? {}
          : { supportedVersions: result.supportedVersions }),
      });
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: mapPlanRejectionReason(result.code),
        ...withOptionalHttpErrorDetails(planRejectedDetails),
      });
    }
  }
}

export function mapStartRunEngineError(error: StartRunEngineError): HttpResponseModel {
  switch (error.kind) {
    case START_RUN_ENGINE_ERROR_KIND.adapterNotRegistered:
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.adapterNotConfigured,
        details: { adapter: error.adapter },
      });
    case START_RUN_ENGINE_ERROR_KIND.commandInvalid: {
      const commandInvalidDetails = compactHttpErrorDetails({
        message: error.reason,
        cause: normalizeHttpErrorReason(error.code),
      });
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.planRejected,
        ...withOptionalHttpErrorDetails(commandInvalidDetails),
      });
    }
    case START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion: {
      const unsupportedPlanDetails = compactHttpErrorDetails({
        message: `Unsupported plan version: ${error.planVersion}`,
        supportedVersions: error.supportedVersions,
      });
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.unsupportedPlanVersion,
        ...withOptionalHttpErrorDetails(unsupportedPlanDetails),
      });
    }
  }
}

export function mapAuthenticationFailure(code: AuthenticationFailureCode): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.unauthorized,
    reason: code,
  });
}

export function mapAuthorizationFailure(reason: DeniedReason): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.forbidden,
    reason,
  });
}

function mapPlanRejectionReason(code: string): string {
  return code === START_RUN_PLAN_REJECTION_CODE.rejected
    ? HTTP_ERROR_REASON.planRejected
    : normalizeHttpErrorReason(code);
}
