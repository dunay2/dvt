import {
  AdapterNotRegisteredError,
  AuthorizationError,
  OutboxRateLimitExceededError,
  RecoverySourceNotTerminalError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  RunNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';

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
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import type { RouteParseIssue } from './routeParseIssue.js';

export { HTTP_HEADER, type HttpResponseModel } from './httpErrorContract.js';

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
      const planRejectedDetails = compactDetails({
        message: result.reason,
        ...(result.cause === undefined ? {} : { cause: result.cause }),
        ...(result.supportedVersions === undefined
          ? {}
          : { supportedVersions: result.supportedVersions }),
      });
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: mapPlanRejectionReason(result.code),
        ...withDetails(planRejectedDetails),
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
      const commandInvalidDetails = compactDetails({
        message: error.reason,
        cause: normalizeHttpErrorReason(error.code),
      });
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.planRejected,
        ...withDetails(commandInvalidDetails),
      });
    }
    case START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion: {
      const unsupportedPlanDetails = compactDetails({
        message: `Unsupported plan version: ${error.planVersion}`,
        supportedVersions: error.supportedVersions,
      });
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.unprocessable,
        reason: HTTP_ERROR_REASON.unsupportedPlanVersion,
        ...withDetails(unsupportedPlanDetails),
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

function isRunNotFoundError(error: unknown): error is RunMetadataNotFoundError | RunNotFoundError {
  return error instanceof RunMetadataNotFoundError || error instanceof RunNotFoundError;
}

function isSignalNotImplementedError(error: unknown): error is SignalNotImplementedError {
  return error instanceof SignalNotImplementedError;
}

function isAdapterNotRegisteredError(error: unknown): error is AdapterNotRegisteredError {
  return error instanceof AdapterNotRegisteredError;
}

function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

function isRunAlreadyExistsError(error: unknown): boolean {
  return error instanceof RunAlreadyExistsError;
}

function isRecoverySourceNotTerminalError(error: unknown): error is RecoverySourceNotTerminalError {
  return error instanceof RecoverySourceNotTerminalError;
}

function isOutboxRateLimitExceededError(error: unknown): error is OutboxRateLimitExceededError {
  return error instanceof OutboxRateLimitExceededError;
}

export function mapRuntimeDomainError(error: unknown): HttpResponseModel | null {
  if (isRunNotFoundError(error)) {
    return mapRunNotFound(error.runId);
  }

  if (isSignalNotImplementedError(error)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: error.code,
    });
  }

  if (isAdapterNotRegisteredError(error)) {
    const adapterNotRegisteredDetails = compactDetails(
      readMessageParams(error, 'provider', 'adapter')
    );
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.adapterNotConfigured,
      ...withDetails(adapterNotRegisteredDetails),
    });
  }

  if (isAuthorizationError(error)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.forbidden,
      reason: HTTP_ERROR_REASON.tenantAccessDenied,
    });
  }

  if (isRunAlreadyExistsError(error)) {
    const runAlreadyExistsDetails = compactDetails({
      ...(typeof getRunId(error) === 'string' ? { runId: getRunId(error) } : {}),
    });
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.conflict,
      reason: HTTP_ERROR_REASON.runAlreadyExists,
      ...withDetails(runAlreadyExistsDetails),
    });
  }

  if (isRecoverySourceNotTerminalError(error)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.sourceRunNotTerminal,
      ...withDetails(
        compactDetails({
          ...readMessageParams(error, 'runId', 'runId'),
          ...readMessageParams(error, 'status', 'status'),
        })
      ),
    });
  }

  if (isOutboxRateLimitExceededError(error)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.rateLimited,
      reason: error.code,
    });
  }

  return null;
}

function mapRunNotFound(runId: string | undefined): HttpResponseModel {
  const runNotFoundDetails = compactDetails({
    ...(typeof runId === 'string' ? { runId } : {}),
  });
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.notFound,
    reason: HTTP_ERROR_REASON.runNotFound,
    ...withDetails(runNotFoundDetails),
  });
}

function mapPlanRejectionReason(code: string): string {
  return code === START_RUN_PLAN_REJECTION_CODE.rejected
    ? HTTP_ERROR_REASON.planRejected
    : normalizeHttpErrorReason(code);
}

function getRunId(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const runId = (error as Error & { runId?: unknown }).runId;
  return typeof runId === 'string' ? runId : undefined;
}

function readMessageParams(
  error: unknown,
  sourceKey: string,
  targetKey: string
): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {};
  }

  const messageParams = (error as Error & { messageParams?: unknown }).messageParams;
  if (messageParams === null || typeof messageParams !== 'object') {
    return {};
  }

  const value = (messageParams as Record<string, unknown>)[sourceKey];
  return value === undefined ? {} : { [targetKey]: value };
}

function compactDetails(
  details: Record<string, unknown>
): Readonly<Record<string, unknown>> | undefined {
  return Object.keys(details).length === 0 ? undefined : details;
}

function withDetails(details: Readonly<Record<string, unknown>> | undefined): {
  readonly details?: Readonly<Record<string, unknown>>;
} {
  return details === undefined ? {} : { details };
}
