import {
  AdapterNotRegisteredError,
  AuthorizationError,
  OutboxRateLimitExceededError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';

import type {
  AuthenticationFailureCode,
  StartRunFacadeResult,
} from '../../application/ports/auth.js';
import type { DeniedReason } from '../../domain/auth/types.js';

export interface HttpResponseModel {
  readonly status: 200 | 202 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 503;
  readonly body: Readonly<Record<string, unknown>>;
  readonly headers?: Readonly<Record<string, string>>;
}

export function mapStartRunFacadeResult(result: StartRunFacadeResult): HttpResponseModel {
  switch (result.kind) {
    case 'unauthenticated':
      return { status: 401, body: { error: 'UNAUTHORIZED', code: result.code } };
    case 'unauthorized':
      return { status: 403, body: { error: 'FORBIDDEN', code: result.reason } };
    case 'adapter_not_configured':
      return {
        status: 422,
        body: { error: 'ADAPTER_NOT_CONFIGURED', adapter: result.adapter },
      };
    case 'accepted':
      return {
        status: 202,
        body: { runId: result.runId, accepted: result.accepted },
      };
    case 'duplicate':
      return {
        status: 202,
        body: {
          runId: result.runId,
          accepted: result.accepted,
          duplicate: true,
          duplicateOf: result.duplicateOf,
        },
      };
    case 'tenant_backpressure':
      return {
        status: 429,
        headers: { 'retry-after': String(result.retryAfterSeconds) },
        body: { error: 'TOO_MANY_REQUESTS', code: result.code },
      };
    case 'system_backpressure':
      return {
        status: 503,
        headers: { 'retry-after': String(result.retryAfterSeconds) },
        body: { error: 'SERVICE_UNAVAILABLE', code: result.code },
      };
    case 'rate_limited':
      return {
        status: 429,
        ...(result.retryAfterSeconds === undefined
          ? {}
          : { headers: { 'retry-after': String(result.retryAfterSeconds) } }),
        body: { error: 'TOO_MANY_REQUESTS', code: result.code },
      };
    case 'plan_rejected':
      return {
        status: 422,
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

export function mapAuthenticationFailure(code: AuthenticationFailureCode): HttpResponseModel {
  return { status: 401, body: { error: 'UNAUTHORIZED', code } };
}

export function mapAuthorizationFailure(reason: DeniedReason): HttpResponseModel {
  return { status: 403, body: { error: 'FORBIDDEN', code: reason } };
}

export function mapRuntimeDomainError(error: unknown): HttpResponseModel | null {
  if (error instanceof RunMetadataNotFoundError) {
    return { status: 404, body: { error: 'NOT_FOUND', code: 'RUN_NOT_FOUND' } };
  }

  if (error instanceof SignalNotImplementedError) {
    return { status: 422, body: { error: 'UNPROCESSABLE_ENTITY', code: error.code } };
  }

  if (error instanceof AdapterNotRegisteredError) {
    return { status: 422, body: { error: 'ADAPTER_NOT_CONFIGURED', code: error.code } };
  }

  if (error instanceof AuthorizationError) {
    return { status: 403, body: { error: 'FORBIDDEN', code: 'TENANT_ACCESS_DENIED' } };
  }

  if (error instanceof RunAlreadyExistsError || getErrorCode(error) === 'INTENT_ACTIVE_CONFLICT') {
    return { status: 409, body: { error: 'CONFLICT', code: 'RUN_ALREADY_EXISTS' } };
  }

  if (error instanceof OutboxRateLimitExceededError) {
    return { status: 429, body: { error: 'TOO_MANY_REQUESTS', code: error.code } };
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
