/**
 * Owned concern: define the protected API authentication and auth-audit port
 * surface consumed by route and application services.
 */
import type { AuthenticatedPrincipal, PrincipalRef } from '../../domain/auth/types.js';

import type { AuthAuditEventType, AuthenticationFailureCode } from './authContract.js';

export type { DeniedReason } from './accessDecision.js';

export type AuthenticationResult =
  | { readonly ok: true; readonly principal: AuthenticatedPrincipal }
  | { readonly ok: false; readonly code: AuthenticationFailureCode };

export interface IAuthenticator {
  authenticateBearerToken(token: string | undefined): Promise<AuthenticationResult>;
}

export interface AuthAuditEvent {
  readonly eventType: AuthAuditEventType;
  readonly requestId: string;
  readonly principalId: string;
  readonly principalType: PrincipalRef['principalType'];
  readonly tenantId?: string;
  readonly action: string;
  readonly denialReason?: string;
  readonly occurredAt: Date;
}

export interface IAuthAuditPort {
  record(event: AuthAuditEvent): Promise<void>;
}

export type {
  AuthAuditEventType,
  AuthenticationFailureCode,
  AuthorizedCommandExecutionContext,
  AuthorizedExecutionContext,
} from './authContract.js';
export { AUTH_AUDIT_EVENT_TYPE } from './authContract.js';
