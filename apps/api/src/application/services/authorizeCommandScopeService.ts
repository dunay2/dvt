/**
 * Owned concern: authorize one protected API command/query scope through the
 * DVT-owned access-decision port and emit the matching audit event.
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';
import type {
  AccessDecision,
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

type AuthorizationResult<TAction extends AuthorizationAction = AuthorizationAction> =
  | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
  | { readonly ok: false; readonly reason: DeniedReason };

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
  ): Promise<AuthorizationResult<TAction>> {
    const decidedAt = this.clock();
    const outcome = await this.accessDecisionService.decide(principal, requestedScope);
    if (!outcome.ok) {
      await this.recordDeniedDecision(
        principal,
        requestedScope,
        requestId,
        decidedAt,
        outcome.reason
      );

      return { ok: false, reason: outcome.reason };
    }

    const context: AuthorizedExecutionContext<TAction> = {
      principal,
      scope: outcome.approvedScope,
      action: requestedScope.action,
      requestId,
      authorizedAt: decidedAt,
    };

    await this.recordGrantedDecision(
      principal,
      requestedScope,
      requestId,
      decidedAt,
      outcome.approvedScope
    );

    return { ok: true, context };
  }

  public async authorizeMany(
    principal: AuthenticatedPrincipal,
    requestedScopes: readonly RequestedScope[],
    requestId: string
  ): Promise<readonly AuthorizationResult[]> {
    const decidedAt = this.clock();
    const outcomes = await this.accessDecisionService.decideMany(principal, requestedScopes);
    if (outcomes.length !== requestedScopes.length) {
      throw new Error('Access decision batch result length does not match requested scopes');
    }

    const results: AuthorizationResult[] = [];
    for (const [index, requestedScope] of requestedScopes.entries()) {
      const outcome = outcomes[index]!;
      results.push(
        await this.toAuthorizationResult(principal, requestedScope, requestId, decidedAt, outcome)
      );
    }
    return results;
  }

  private async toAuthorizationResult(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope,
    requestId: string,
    decidedAt: Date,
    outcome: AccessDecision
  ): Promise<AuthorizationResult> {
    if (!outcome.ok) {
      await this.recordDeniedDecision(
        principal,
        requestedScope,
        requestId,
        decidedAt,
        outcome.reason
      );
      return { ok: false, reason: outcome.reason };
    }

    await this.recordGrantedDecision(
      principal,
      requestedScope,
      requestId,
      decidedAt,
      outcome.approvedScope
    );
    return {
      ok: true,
      context: {
        principal,
        scope: outcome.approvedScope,
        action: requestedScope.action,
        requestId,
        authorizedAt: decidedAt,
      },
    };
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
      tenantId: requestedScope.tenantId.value,
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
