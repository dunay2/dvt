import type { IAuthorizationPolicy } from '../../domain/auth/policy.js';
import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  DeniedReason,
  RequestedScope,
} from '../../domain/auth/types.js';
import type {
  AuthorizedExecutionContext,
  IAuthAuditPort,
  IPrincipalAccessRepository,
} from '../ports/auth.js';

export class AuthorizeCommandScopeService {
  public constructor(
    private readonly accessRepository: IPrincipalAccessRepository,
    private readonly policy: IAuthorizationPolicy,
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
    const effectiveAccess = await this.accessRepository.loadEffectiveAccess({
      principalId: principal.principalId,
      principalType: principal.principalType,
    });

    if (effectiveAccess === null) {
      await this.audit.record({
        eventType: 'AUTH_DENIED',
        requestId,
        principalId: principal.principalId,
        principalType: principal.principalType,
        action: requestedScope.action.name,
        denialReason: 'TENANT_NOT_GRANTED',
        occurredAt: this.clock(),
      });

      return { ok: false, reason: 'TENANT_NOT_GRANTED' };
    }

    const outcome = this.policy.evaluate(principal, effectiveAccess, requestedScope);
    if (outcome.kind === 'deny') {
      await this.audit.record({
        eventType: 'AUTH_DENIED',
        requestId,
        principalId: principal.principalId,
        principalType: principal.principalType,
        action: requestedScope.action.name,
        denialReason: outcome.reason,
        occurredAt: this.clock(),
      });

      return { ok: false, reason: outcome.reason };
    }

    const context: AuthorizedExecutionContext<TAction> = {
      principal,
      scope: outcome.approvedScope,
      action: requestedScope.action,
      requestId,
      authorizedAt: this.clock(),
    };

    await this.audit.record({
      eventType: 'AUTH_GRANTED',
      requestId,
      principalId: principal.principalId,
      principalType: principal.principalType,
      tenantId: outcome.approvedScope.tenantId.value,
      action: requestedScope.action.name,
      occurredAt: this.clock(),
    });

    return { ok: true, context };
  }
}
