/**
 * Owned concern: typed runtime-domain error classification and translation into
 * the canonical HTTP error envelope for protected runtime route consumers.
 */
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

import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  type HttpResponseModel,
} from './httpErrorContract.js';
import {
  compactHttpErrorDetails,
  withOptionalHttpErrorDetails,
} from './httpErrorDetails.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';

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
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.adapterNotConfigured,
      ...withOptionalHttpErrorDetails(
        compactHttpErrorDetails(readMessageParams(error, 'provider', 'adapter'))
      ),
    });
  }

  if (isAuthorizationError(error)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.forbidden,
      reason: HTTP_ERROR_REASON.tenantAccessDenied,
    });
  }

  if (isRunAlreadyExistsError(error)) {
    const runId = getRunId(error);
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.conflict,
      reason: HTTP_ERROR_REASON.runAlreadyExists,
      ...withOptionalHttpErrorDetails(
        compactHttpErrorDetails({ ...(typeof runId === 'string' ? { runId } : {}) })
      ),
    });
  }

  if (isRecoverySourceNotTerminalError(error)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.sourceRunNotTerminal,
      ...withOptionalHttpErrorDetails(
        compactHttpErrorDetails({
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

function mapRunNotFound(runId: string | undefined): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.notFound,
    reason: HTTP_ERROR_REASON.runNotFound,
    ...withOptionalHttpErrorDetails(
      compactHttpErrorDetails({ ...(typeof runId === 'string' ? { runId } : {}) })
    ),
  });
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
