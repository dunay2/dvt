import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  DeniedReason,
  EffectivePrincipalAccess,
  ExecutionScope,
  PrincipalRef,
} from '../../domain/auth/types.js';

export type { DeniedReason } from '../../domain/auth/types.js';

export type AuthenticationFailureCode =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'INVALID_SIGNATURE'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_NOT_YET_VALID'
  | 'UNSUPPORTED_ALGORITHM';

export type AuthenticationResult =
  | { readonly ok: true; readonly principal: AuthenticatedPrincipal }
  | { readonly ok: false; readonly code: AuthenticationFailureCode };

export interface IAuthenticator {
  authenticateBearerToken(token: string | undefined): Promise<AuthenticationResult>;
}

export interface AuthAuditEvent {
  readonly eventType: 'AUTH_GRANTED' | 'AUTH_DENIED';
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

export interface StartRunPlanRef {
  readonly uri: string;
  readonly sha256: string;
  readonly schemaVersion: string;
  readonly planId: string;
  readonly planVersion: string;
}

export interface StartRunCommand {
  readonly planRef: StartRunPlanRef;
  readonly runId: string;
  readonly targetAdapter: 'temporal' | 'mock';
  readonly selection: ReadonlyArray<string>;
}

export interface AuthorizedCommandExecutionContext {
  readonly principal: AuthenticatedPrincipal;
  readonly scope: ExecutionScope;
  readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
  readonly requestId: string;
  readonly authorizedAt: Date;
}

export interface StartRunResult {
  readonly runId: string;
  readonly accepted: boolean;
}

export interface IStartRunUseCase {
  execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunResult>;
}

export type StartRunFacadeResult =
  | { readonly kind: 'unauthenticated'; readonly code: AuthenticationFailureCode }
  | { readonly kind: 'unauthorized'; readonly reason: DeniedReason }
  | { readonly kind: 'accepted'; readonly result: StartRunResult };
