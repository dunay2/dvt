import type {
  DbtManifestRef,
  ExecutabilityRejectionCode,
  ExecutionPlanV2,
  GraphNode,
  PlannerEnvironmentContext,
  PlannerGraphSourceV1,
  PlannerPolicyClassSet,
} from '@dvt/contracts';

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
  readonly planRef?: StartRunPlanRef;
  readonly graphSource?: PlannerGraphSourceV1;
  readonly manifestRef?: DbtManifestRef;
  readonly manifest?: Record<string, unknown>;
  readonly nodes?: ReadonlyArray<GraphNode>;
  readonly policies?: PlannerPolicyClassSet;
  readonly environment?: PlannerEnvironmentContext;
  readonly observability?: ExecutionPlanV2['observability'];
  readonly runId: string;
  readonly targetAdapter: 'temporal' | 'mock';
  readonly selection: ReadonlyArray<string>;
}

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

export interface StartRunAcceptedResult {
  readonly kind: 'accepted';
  readonly runId: string;
  readonly accepted: true;
}

export interface StartRunDuplicateResult {
  readonly kind: 'duplicate';
  readonly runId: string;
  readonly accepted: true;
  readonly duplicateOf: 'run' | 'intent';
}

export interface StartRunTenantBackpressureResult {
  readonly kind: 'tenant_backpressure';
  readonly accepted: false;
  readonly code: 'TENANT_BACKPRESSURE';
  readonly retryAfterSeconds: number;
}

export interface StartRunSystemBackpressureResult {
  readonly kind: 'system_backpressure';
  readonly accepted: false;
  readonly code: 'SYSTEM_BACKPRESSURE' | 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE';
  readonly retryAfterSeconds: number;
}

export interface StartRunRateLimitedResult {
  readonly kind: 'rate_limited';
  readonly accepted: false;
  readonly code: 'OUTBOX_RATE_LIMIT_EXCEEDED';
  readonly retryAfterSeconds?: number;
}

export interface StartRunPlanRejectedResult {
  readonly kind: 'plan_rejected';
  readonly accepted: false;
  readonly code: ExecutabilityRejectionCode;
  readonly reason: string;
  readonly cause?: string;
}

export type StartRunResult =
  | StartRunAcceptedResult
  | StartRunDuplicateResult
  | StartRunTenantBackpressureResult
  | StartRunSystemBackpressureResult
  | StartRunRateLimitedResult
  | StartRunPlanRejectedResult;

export interface IStartRunUseCase {
  execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunResult>;
}

export type StartRunFacadeResult =
  | { readonly kind: 'unauthenticated'; readonly code: AuthenticationFailureCode }
  | { readonly kind: 'unauthorized'; readonly reason: DeniedReason }
  | { readonly kind: 'adapter_not_configured'; readonly adapter: string }
  | StartRunAcceptedResult
  | StartRunDuplicateResult
  | StartRunTenantBackpressureResult
  | StartRunSystemBackpressureResult
  | StartRunRateLimitedResult
  | StartRunPlanRejectedResult;
