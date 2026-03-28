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
import { HTTP_STATUS, type HttpStatusCode } from '../../routes/httpStatus.js';

export interface HttpResponseModel {
  readonly status: HttpStatusCode;
  readonly body: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
}

export function mapStartRunFacadeResult(result: StartRunFacadeResult): HttpResponseModel {
  switch (result.kind) {
    case START_RUN_FACADE_RESULT_KIND.unauthenticated:
      return { status: HTTP_STATUS.unauthorized, body: { error: 'UNAUTHORIZED', code: result.code } };
    case START_RUN_FACADE_RESULT_KIND.unauthorized:
      return { status: HTTP_STATUS.forbidden, body: { error: 'FORBIDDEN', code: result.reason } };
    case START_RUN_FACADE_RESULT_KIND.accepted:
      return {
        status: HTTP_STATUS.accepted,
        body: { runId: result.runId, accepted: result.accepted },
      };
    case START_RUN_FACADE_RESULT_KIND.duplicate:
      return {
        status: HTTP_STATUS.accepted,
        body: {
          runId: result.runId,
          accepted: result.accepted,
          duplicate: true,
          duplicateOf: result.duplicateOf,
        },
      };
    case START_RUN_FACADE_RESULT_KIND.tenantBackpressure:
      return {
        status: HTTP_STATUS.tooManyRequests,
        headers: { 'retry-after': String(result.retryAfterSeconds) },
        body: { error: 'TOO_MANY_REQUESTS', code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.systemBackpressure:
      return {
        status: HTTP_STATUS.serviceUnavailable,
        headers: { 'retry-after': String(result.retryAfterSeconds) },
        body: { error: 'SERVICE_UNAVAILABLE', code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.rateLimited:
      return {
        status: HTTP_STATUS.tooManyRequests,
        ...(result.retryAfterSeconds === undefined
          ? {}
          : { headers: { 'retry-after': String(result.retryAfterSeconds) } }),
        body: { error: 'TOO_MANY_REQUESTS', code: result.code },
      };
    case START_RUN_FACADE_RESULT_KIND.planRejected:
      return {
        status: HTTP_STATUS.unprocessableEntity,
        body: {
          error: 'PLAN_REJECTED',
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
        status: HTTP_STATUS.unprocessableEntity,
        body: { error: 'ADAPTER_NOT_CONFIGURED', adapter: error.adapter },
      };
    case START_RUN_ENGINE_ERROR_KIND.commandInvalid:
      return {
        status: HTTP_STATUS.unprocessableEntity,
        body: {
          error: 'PLAN_REJECTED',
          code: START_RUN_PLAN_REJECTION_CODE.rejected,
          reason: error.reason,
          cause: error.code,
        },
      };
    case START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion:
      return {
        status: HTTP_STATUS.unprocessableEntity,
        body: {
          error: 'PLAN_REJECTED',
          code: START_RUN_PLAN_REJECTION_CODE.unsupportedPlanVersion,
          reason: formatUnsupportedPlanVersionReason(error.planVersion),
          supportedVersions: error.supportedVersions,
        },
      };
  }
}

export function mapAuthenticationFailure(code: AuthenticationFailureCode): HttpResponseModel {
  return { status: HTTP_STATUS.unauthorized, body: { error: 'UNAUTHORIZED', code } };
}

export function mapAuthorizationFailure(reason: DeniedReason): HttpResponseModel {
  return { status: HTTP_STATUS.forbidden, body: { error: 'FORBIDDEN', code: reason } };
}

export function mapRuntimeDomainError(error: unknown): HttpResponseModel | null {
  if (error instanceof RunMetadataNotFoundError) {
    return { status: HTTP_STATUS.notFound, body: { error: 'NOT_FOUND', code: 'RUN_NOT_FOUND' } };
  }

  if (error instanceof SignalNotImplementedError) {
    return {
      status: HTTP_STATUS.unprocessableEntity,
      body: { error: 'UNPROCESSABLE_ENTITY', code: error.code },
    };
  }

  if (error instanceof AdapterNotRegisteredError) {
    return {
      status: HTTP_STATUS.unprocessableEntity,
      body: { error: 'ADAPTER_NOT_CONFIGURED', code: error.code },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      status: HTTP_STATUS.forbidden,
      body: { error: 'FORBIDDEN', code: 'TENANT_ACCESS_DENIED' },
    };
  }

  if (
    error instanceof RunAlreadyExistsError ||
    getErrorCode(error) === START_RUN_ENGINE_ERROR_CODE.intentActiveConflict
  ) {
    return { status: HTTP_STATUS.conflict, body: { error: 'CONFLICT', code: 'RUN_ALREADY_EXISTS' } };
  }

  if (error instanceof OutboxRateLimitExceededError) {
    return {
      status: HTTP_STATUS.tooManyRequests,
      body: { error: 'TOO_MANY_REQUESTS', code: error.code },
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
