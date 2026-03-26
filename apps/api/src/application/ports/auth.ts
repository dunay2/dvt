import type {
  AuthenticatedPrincipal,
  EffectivePrincipalAccess,
  PrincipalRef,
} from '../../domain/auth/types.js';

import type { AuthAuditEventType, AuthenticationFailureCode } from './authContract.js';

export type { DeniedReason } from '../../domain/auth/types.js';

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

export interface IPrincipalAccessRepository {
  loadEffectiveAccess(principal: PrincipalRef): Promise<EffectivePrincipalAccess | null>;
}

export type {
  AuthAuditEventType,
  AuthenticationFailureCode,
  AuthorizedCommandExecutionContext,
  AuthorizedExecutionContext,
} from './authContract.js';
export { AUTH_AUDIT_EVENT_TYPE } from './authContract.js';
