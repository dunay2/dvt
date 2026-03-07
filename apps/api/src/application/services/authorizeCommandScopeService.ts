import type { IAuthorizationPolicy } from '../../domain/auth/policy.js';
import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  DeniedReason,
  RequestedScope,
} from '../../domain/auth/types.js';
import type {
  AuthorizedCommandExecutionContext,
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

  public async authorize(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope & {
      readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
    },
    requestId: string
  ): Promise<
    | { readonly ok: true; readonly context: AuthorizedCommandExecutionContext }
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

    const context: AuthorizedCommandExecutionContext = {
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
