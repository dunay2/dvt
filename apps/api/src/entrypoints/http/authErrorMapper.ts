import {
  AdapterNotRegisteredError,
  AuthorizationError,
  OutboxRateLimitExceededError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';

import type { AuthenticationFailureCode } from '../../application/ports/auth.js';
import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_KIND,
  type StartRunEngineError,
} from '../../application/ports/startRunEngineErrorContract.js';
import {
  START_RUN_FACADE_RESULT_KIND,
  type StartRunFacadeResult,
} from '../../application/ports/startRunFacadeContract.js';
import {
  formatUnsupportedPlanVersionReason,
  START_RUN_PLAN_REJECTION_CODE,
} from '../../application/ports/startRunResultContract.js';
import type { DeniedReason } from '../../domain/auth/types.js';
import { HTTP_STATUS_CODE, type HttpStatusCode } from '../../routes/httpStatus.js';

import { HTTP_BODY_CODE, HTTP_ERROR, HTTP_HEADER } from './httpResponseConstants.js';

export interface HttpResponseModel {
  readonly status: HttpStatusCode;
  readonly body: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
}

export function mapStartRunFacadeResult(result: StartRunFacadeResult): HttpResponseModel {
  switch (result.kind) {
    case START_RUN_FACADE_RESULT_KIND.unauthenticated:
      return {
        status: HTTP_STATUS_CODE.unauthorized,
        body: { error: HTTP_ERROR.unauthorized, code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.unauthorized:
      return {
        status: HTTP_STATUS_CODE.forbidden,
        body: { error: HTTP_ERROR.forbidden, code: result.reason },
      };
    case START_RUN_FACADE_RESULT_KIND.accepted:
      return {
        status: HTTP_STATUS_CODE.accepted,
        body: { runId: result.runId, accepted: result.accepted },
      };
    case START_RUN_FACADE_RESULT_KIND.duplicate:
      return {
        status: HTTP_STATUS_CODE.accepted,
        body: {
          runId: result.runId,
          accepted: result.accepted,
          duplicate: true,
          duplicateOf: result.duplicateOf,
        },
      };
    case START_RUN_FACADE_RESULT_KIND.tenantBackpressure:
      return {
        status: HTTP_STATUS_CODE.tooManyRequests,
        headers: { [HTTP_HEADER.retryAfter]: String(result.retryAfterSeconds) },
        body: { error: HTTP_ERROR.tooManyRequests, code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.systemBackpressure:
      return {
        status: HTTP_STATUS_CODE.serviceUnavailable,
        headers: { [HTTP_HEADER.retryAfter]: String(result.retryAfterSeconds) },
        body: { error: HTTP_ERROR.serviceUnavailable, code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.rateLimited:
      return {
        status: HTTP_STATUS_CODE.tooManyRequests,
        ...(result.retryAfterSeconds === undefined
          ? {}
          : { headers: { [HTTP_HEADER.retryAfter]: String(result.retryAfterSeconds) } }),
        body: { error: HTTP_ERROR.tooManyRequests, code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.planRejected:
      return {
        status: HTTP_STATUS_CODE.unprocessableEntity,
        body: {
          error: HTTP_ERROR.planRejected,
          code: result.code,
          reason: result.reason,
          ...(result.cause === undefined ? {} : { cause: result.cause }),
          ...(result.supportedVersions === undefined
            ? {}
            : { supportedVersions: result.supportedVersions }),
        },
      };
  }
}

export function mapStartRunEngineError(error: StartRunEngineError): HttpResponseModel {
  switch (error.kind) {
    case START_RUN_ENGINE_ERROR_KIND.adapterNotRegistered:
      return {
        status: HTTP_STATUS_CODE.unprocessableEntity,
        body: { error: HTTP_ERROR.adapterNotConfigured, adapter: error.adapter },
      };
    case START_RUN_ENGINE_ERROR_KIND.commandInvalid:
      return {
        status: HTTP_STATUS_CODE.unprocessableEntity,
        body: {
          error: HTTP_ERROR.planRejected,
          code: START_RUN_PLAN_REJECTION_CODE.rejected,
          reason: error.reason,
          cause: error.code,
        },
      };
    case START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion:
      return {
        status: HTTP_STATUS_CODE.unprocessableEntity,
        body: {
          error: HTTP_ERROR.planRejected,
          code: START_RUN_PLAN_REJECTION_CODE.unsupportedPlanVersion,
          reason: formatUnsupportedPlanVersionReason(error.planVersion),
          supportedVersions: error.supportedVersions,
        },
      };
  }
}

export function mapAuthenticationFailure(code: AuthenticationFailureCode): HttpResponseModel {
  return { status: HTTP_STATUS_CODE.unauthorized, body: { error: HTTP_ERROR.unauthorized, code } };
}

export function mapAuthorizationFailure(reason: DeniedReason): HttpResponseModel {
  return {
    status: HTTP_STATUS_CODE.forbidden,
    body: { error: HTTP_ERROR.forbidden, code: reason },
  };
}

export function mapRuntimeDomainError(error: unknown): HttpResponseModel | null {
  if (error instanceof RunMetadataNotFoundError) {
    return {
      status: HTTP_STATUS_CODE.notFound,
      body: { error: HTTP_ERROR.notFound, code: HTTP_BODY_CODE.runNotFound },
    };
  }

  if (error instanceof SignalNotImplementedError) {
    return {
      status: HTTP_STATUS_CODE.unprocessableEntity,
      body: { error: HTTP_ERROR.unprocessableEntity, code: error.code },
    };
  }

  if (error instanceof AdapterNotRegisteredError) {
    return {
      status: HTTP_STATUS_CODE.unprocessableEntity,
      body: { error: HTTP_ERROR.adapterNotConfigured, code: error.code },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      status: HTTP_STATUS_CODE.forbidden,
      body: { error: HTTP_ERROR.forbidden, code: HTTP_BODY_CODE.tenantAccessDenied },
    };
  }

  if (
    error instanceof RunAlreadyExistsError ||
    getErrorCode(error) === START_RUN_ENGINE_ERROR_CODE.intentActiveConflict
  ) {
    return {
      status: HTTP_STATUS_CODE.conflict,
      body: { error: HTTP_ERROR.conflict, code: HTTP_BODY_CODE.runAlreadyExists },
    };
  }

  if (error instanceof OutboxRateLimitExceededError) {
    return {
      status: HTTP_STATUS_CODE.tooManyRequests,
      body: { error: HTTP_ERROR.tooManyRequests, code: error.code },
    };
  }

  return null;
}

function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const code = (error as Error & { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
