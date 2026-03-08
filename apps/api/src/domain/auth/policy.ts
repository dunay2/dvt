import type {
  AuthenticatedPrincipal,
  AuthorizationOutcome,
  EffectivePrincipalAccess,
  RequestedScope,
} from './types.js';

export interface IAuthorizationPolicy {
  evaluate(
    principal: AuthenticatedPrincipal,
    effectiveAccess: EffectivePrincipalAccess,
    requestedScope: RequestedScope
  ): AuthorizationOutcome;
}

export class TenantHierarchyAuthorizationPolicy implements IAuthorizationPolicy {
  public evaluate(
    principal: AuthenticatedPrincipal,
    effectiveAccess: EffectivePrincipalAccess,
    requestedScope: RequestedScope
  ): AuthorizationOutcome {
    if (effectiveAccess.suspended) {
      return {
        kind: 'deny',
        reason: 'PRINCIPAL_SUSPENDED',
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
        },
      };
    }

    const tenantGrant = effectiveAccess.tenantAccess.get(requestedScope.tenantId.value);
    if (!tenantGrant) {
      return {
        kind: 'deny',
        reason: 'TENANT_NOT_GRANTED',
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
        },
      };
    }

    if (
      principal.assertedTenantIds.length > 0 &&
      !principal.assertedTenantIds.includes(requestedScope.tenantId.value)
    ) {
      return {
        kind: 'deny',
        reason: 'TOKEN_ASSERTION_CONFLICT',
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
          matchedTenantId: tenantGrant.tenantId,
        },
      };
    }

    const actionName = requestedScope.action.name;

    if (requestedScope.projectId === undefined) {
      if (!tenantGrant.allowedActions.includes(actionName)) {
        return {
          kind: 'deny',
          reason: 'ACTION_NOT_GRANTED',
          rationale: {
            evaluatedPrincipalId: principal.subjectId,
            source: 'effective-access',
            matchedTenantId: tenantGrant.tenantId,
          },
        };
      }

      return {
        kind: 'allow',
        approvedScope: { tenantId: requestedScope.tenantId },
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
          matchedTenantId: tenantGrant.tenantId,
          matchedAction: actionName,
        },
      };
    }

    const projectGrant = tenantGrant.projectAccess.get(requestedScope.projectId.value);
    if (!projectGrant) {
      return {
        kind: 'deny',
        reason: 'PROJECT_NOT_GRANTED',
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
          matchedTenantId: tenantGrant.tenantId,
        },
      };
    }

    if (requestedScope.environmentId === undefined) {
      const allowed =
        projectGrant.allowedActions.includes(actionName) ||
        tenantGrant.allowedActions.includes(actionName);

      if (!allowed) {
        return {
          kind: 'deny',
          reason: 'ACTION_NOT_GRANTED',
          rationale: {
            evaluatedPrincipalId: principal.subjectId,
            source: 'effective-access',
            matchedTenantId: tenantGrant.tenantId,
            matchedProjectId: projectGrant.projectId,
          },
        };
      }

      return {
        kind: 'allow',
        approvedScope: {
          tenantId: requestedScope.tenantId,
          projectId: requestedScope.projectId,
        },
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
          matchedTenantId: tenantGrant.tenantId,
          matchedProjectId: projectGrant.projectId,
          matchedAction: actionName,
        },
      };
    }

    const environmentGrant = projectGrant.environmentAccess.get(requestedScope.environmentId.value);
    if (!environmentGrant) {
      return {
        kind: 'deny',
        reason: 'ENVIRONMENT_NOT_GRANTED',
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
          matchedTenantId: tenantGrant.tenantId,
          matchedProjectId: projectGrant.projectId,
        },
      };
    }

    const allowed =
      environmentGrant.allowedActions.includes(actionName) ||
      projectGrant.allowedActions.includes(actionName) ||
      tenantGrant.allowedActions.includes(actionName);

    if (!allowed) {
      return {
        kind: 'deny',
        reason: 'ACTION_NOT_GRANTED',
        rationale: {
          evaluatedPrincipalId: principal.subjectId,
          source: 'effective-access',
          matchedTenantId: tenantGrant.tenantId,
          matchedProjectId: projectGrant.projectId,
          matchedEnvironmentId: environmentGrant.environmentId,
        },
      };
    }

    return {
      kind: 'allow',
      approvedScope: {
        tenantId: requestedScope.tenantId,
        projectId: requestedScope.projectId,
        environmentId: requestedScope.environmentId,
      },
      rationale: {
        evaluatedPrincipalId: principal.subjectId,
        source: 'effective-access',
        matchedTenantId: tenantGrant.tenantId,
        matchedProjectId: projectGrant.projectId,
        matchedEnvironmentId: environmentGrant.environmentId,
        matchedAction: actionName,
      },
    };
  }
}
