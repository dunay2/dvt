import {
  AdapterNotRegisteredError,
  AuthorizationError,
  RunMetadataNotFoundError,
  SignalNotImplementedError,
} from '@dvt/engine';

import type {
  AuthenticationFailureCode,
  StartRunFacadeResult,
} from '../../application/ports/auth.js';
import type { DeniedReason } from '../../domain/auth/types.js';

export interface HttpResponseModel {
  readonly status: 200 | 202 | 400 | 401 | 403 | 404 | 422;
  readonly body: Readonly<Record<string, unknown>>;
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
        body: { runId: result.result.runId, accepted: result.result.accepted },
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

  return null;
}
