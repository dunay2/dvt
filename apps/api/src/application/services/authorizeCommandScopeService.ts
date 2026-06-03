/**
 * Owned concern: authorize one protected API command/query scope through the
 * DVT-owned access-decision port and emit the matching audit event.
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';
import type {
  AuthorizationAction,
  DeniedReason,
  IAccessDecisionService,
  RequestedScope,
} from '../ports/accessDecision.js';
import {
  AUTH_AUDIT_EVENT_TYPE,
  type AuthorizedExecutionContext,
  type IAuthAuditPort,
} from '../ports/auth.js';

export class AuthorizeCommandScopeService {
  public constructor(
    private readonly accessDecisionService: IAccessDecisionService,
    private readonly audit: IAuthAuditPort,
    private readonly clock: () => Date
  ) {}

  public async authorize<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope<TAction>,
    requestId: string
  ): Promise<
    | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
    | { readonly ok: false; readonly reason: DeniedReason }
  > {
    const decidedAt = this.clock();
    const outcome = await this.accessDecisionService.decide(principal, requestedScope);
    if (!outcome.ok) {
      await this.recordDeniedDecision(principal, requestedScope, requestId, decidedAt, outcome.reason);

      return { ok: false, reason: outcome.reason };
    }

    const context: AuthorizedExecutionContext<TAction> = {
      principal,
      scope: outcome.approvedScope,
      action: requestedScope.action,
      requestId,
      authorizedAt: decidedAt,
    };

    await this.recordGrantedDecision(principal, requestedScope, requestId, decidedAt, outcome.approvedScope);

    return { ok: true, context };
  }

  private recordDeniedDecision<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope<TAction>,
    requestId: string,
    occurredAt: Date,
    denialReason: DeniedReason
  ): Promise<void> {
    return this.audit.record({
      eventType: AUTH_AUDIT_EVENT_TYPE.denied,
      requestId,
      principalId: principal.principalId,
      principalType: principal.principalType,
      action: requestedScope.action.name,
      denialReason,
      occurredAt,
    });
  }

  private recordGrantedDecision<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope<TAction>,
    requestId: string,
    occurredAt: Date,
    approvedScope: AuthorizedExecutionContext<TAction>['scope']
  ): Promise<void> {
    return this.audit.record({
      eventType: AUTH_AUDIT_EVENT_TYPE.granted,
      requestId,
      principalId: principal.principalId,
      principalType: principal.principalType,
      tenantId: approvedScope.tenantId.value,
      action: requestedScope.action.name,
      occurredAt,
    });
  }
}
