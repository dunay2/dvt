import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  ExecutionScope,
} from '../../domain/auth/types.js';

export const AUTH_AUDIT_EVENT_TYPE = {
  granted: 'AUTH_GRANTED',
  denied: 'AUTH_DENIED',
} as const;

export type AuthAuditEventType =
  (typeof AUTH_AUDIT_EVENT_TYPE)[keyof typeof AUTH_AUDIT_EVENT_TYPE];

export type AuthenticationFailureCode =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'INVALID_SIGNATURE'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_NOT_YET_VALID'
  | 'UNSUPPORTED_ALGORITHM';

export interface AuthorizedExecutionContext<
  TAction extends AuthorizationAction = AuthorizationAction,
> {
  readonly principal: AuthenticatedPrincipal;
  readonly scope: ExecutionScope;
  readonly action: TAction;
  readonly requestId: string;
  readonly authorizedAt: Date;
}

export type AuthorizedCommandExecutionContext = AuthorizedExecutionContext<
  Extract<AuthorizationAction, { readonly kind: 'command' }>
>;
