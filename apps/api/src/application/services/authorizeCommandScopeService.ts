import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  DeniedReason,
  RequestedScope,
} from '../../domain/auth/types.js';
import type { IAccessDecisionService } from '../ports/accessDecision.js';
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
    requestedScope: RequestedScope & {
      readonly action: TAction;
    },
    requestId: string
  ): Promise<
    | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
    | { readonly ok: false; readonly reason: DeniedReason }
  > {
    const decidedAt = this.clock();
    const outcome = await this.accessDecisionService.decide(principal, requestedScope);
    if (!outcome.ok) {
      await this.audit.record({
        eventType: AUTH_AUDIT_EVENT_TYPE.denied,
        requestId,
        principalId: principal.principalId,
        principalType: principal.principalType,
        action: requestedScope.action.name,
        denialReason: outcome.reason,
        occurredAt: decidedAt,
      });

      return { ok: false, reason: outcome.reason };
    }

    const context: AuthorizedExecutionContext<TAction> = {
      principal,
      scope: outcome.approvedScope,
      action: requestedScope.action,
      requestId,
      authorizedAt: decidedAt,
    };

    await this.audit.record({
      eventType: AUTH_AUDIT_EVENT_TYPE.granted,
      requestId,
      principalId: principal.principalId,
      principalType: principal.principalType,
      tenantId: outcome.approvedScope.tenantId.value,
      action: requestedScope.action.name,
      occurredAt: decidedAt,
    });

    return { ok: true, context };
  }
}
