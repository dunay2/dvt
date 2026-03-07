import type { AuthenticationFailureCode } from '../../application/ports/auth.js';
import type { DeniedReason } from '../../domain/auth/types.js';
import type { StartRunFacadeResult } from '../../application/ports/auth.js';

export interface HttpResponseModel {
  readonly status: 400 | 401 | 403 | 202;
  readonly body: Readonly<Record<string, unknown>>;
}

export function mapStartRunFacadeResult(result: StartRunFacadeResult): HttpResponseModel {
  switch (result.kind) {
    case 'unauthenticated':
      return { status: 401, body: { error: 'UNAUTHORIZED', code: result.code } };
    case 'unauthorized':
      return { status: 403, body: { error: 'FORBIDDEN', code: result.reason } };
    case 'accepted':
      return {
        status: 202,
        body: { runId: result.result.runId, accepted: result.result.accepted },
      };
  }
}

// Kept for direct use in routes that need granular mapping outside the facade
export function mapAuthenticationFailure(code: AuthenticationFailureCode): HttpResponseModel {
  return { status: 401, body: { error: 'UNAUTHORIZED', code } };
}

export function mapAuthorizationFailure(reason: DeniedReason): HttpResponseModel {
  return { status: 403, body: { error: 'FORBIDDEN', code: reason } };
}
