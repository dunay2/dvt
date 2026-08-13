/**
 * Owned concern: provide the embedded-first implementation of the protected
 * API access-decision port over local principal grants.
 *
 * This adapter consumes the canonical DVT action/resource/scope vocabulary and
 * fails closed. It does not expose grant-storage semantics to route or
 * application code.
 */
import { ACCESS_SCOPE_RESOURCE, toExecutionScope } from '../../application/ports/accessDecision.js';
import type {
  AuthorizationAction,
  DeniedReason,
  ExecutionScope,
  IAccessDecisionService,
  RequestedScope,
} from '../../application/ports/accessDecision.js';
import type { IPrincipalGrantRepository } from '../../application/ports/principalGrantRepository.js';
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

export class EmbeddedAccessDecisionService implements IAccessDecisionService {
  public constructor(
    private readonly principalGrants: Pick<IPrincipalGrantRepository, 'load' | 'migrate'>
  ) {}

  public async migrate(): Promise<void> {
    await this.principalGrants.migrate();
  }

  public async decide<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope<TAction>
  ): Promise<
    | { readonly ok: true; readonly approvedScope: ExecutionScope }
    | { readonly ok: false; readonly reason: DeniedReason }
  > {
    const effectiveAccess = await this.principalGrants.load({
      principalId: principal.principalId,
      principalType: principal.principalType,
    });

    if (effectiveAccess === null) {
      return { ok: false, reason: 'TENANT_NOT_GRANTED' };
    }

    if (effectiveAccess.suspended) {
      return { ok: false, reason: 'PRINCIPAL_SUSPENDED' };
    }

    const tenantGrant = effectiveAccess.tenantAccess.find(
      (tenant) => tenant.tenantId === requestedScope.tenantId.value
    );
    if (!tenantGrant) {
      return { ok: false, reason: 'TENANT_NOT_GRANTED' };
    }

    if (
      principal.assertedTenantIds.length > 0 &&
      !principal.assertedTenantIds.includes(requestedScope.tenantId.value)
    ) {
      return { ok: false, reason: 'TOKEN_ASSERTION_CONFLICT' };
    }

    const actionName = requestedScope.action.name;
    switch (requestedScope.resource) {
      case ACCESS_SCOPE_RESOURCE.tenant:
        return buildAllowedDecision(
          requestedScope,
          tenantGrant.allowedActions.includes(actionName)
        );
      case ACCESS_SCOPE_RESOURCE.project: {
        const projectGrant = tenantGrant.projectAccess.find(
          (project) => project.projectId === requestedScope.projectId.value
        );
        if (!projectGrant) {
          return { ok: false, reason: 'PROJECT_NOT_GRANTED' };
        }

        return buildAllowedDecision(
          requestedScope,
          projectGrant.allowedActions.includes(actionName) ||
            tenantGrant.allowedActions.includes(actionName)
        );
      }
      case ACCESS_SCOPE_RESOURCE.environment:
      case ACCESS_SCOPE_RESOURCE.workspaceGraphDraft: {
        const projectGrant = tenantGrant.projectAccess.find(
          (project) => project.projectId === requestedScope.projectId.value
        );
        if (!projectGrant) {
          return { ok: false, reason: 'PROJECT_NOT_GRANTED' };
        }

        const environmentGrant = projectGrant.environmentAccess.find(
          (environment) => environment.environmentId === requestedScope.environmentId.value
        );
        if (!environmentGrant) {
          return { ok: false, reason: 'ENVIRONMENT_NOT_GRANTED' };
        }

        return buildAllowedDecision(
          requestedScope,
          environmentGrant.allowedActions.includes(actionName) ||
            projectGrant.allowedActions.includes(actionName) ||
            tenantGrant.allowedActions.includes(actionName)
        );
      }
    }
  }
}

function buildAllowedDecision<TAction extends AuthorizationAction>(
  requestedScope: RequestedScope<TAction>,
  allowed: boolean
):
  | { readonly ok: true; readonly approvedScope: ExecutionScope }
  | { readonly ok: false; readonly reason: DeniedReason } {
  if (!allowed) {
    return { ok: false, reason: 'ACTION_NOT_GRANTED' };
  }

  return {
    ok: true,
    approvedScope: toExecutionScope(requestedScope),
  };
}
