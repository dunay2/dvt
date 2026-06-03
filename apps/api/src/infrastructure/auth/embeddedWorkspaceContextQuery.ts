/**
 * Owned concern: project effective workspace context from embedded principal
 * grants without leaking grant-storage semantics to route handlers.
 */
import type { Pool } from 'pg';

import type {
  EffectiveWorkspaceContext,
  EffectiveWorkspaceContextEnvelope,
  IWorkspaceContextQuery,
} from '../../application/ports/workspaceContext.js';
import type { AuthenticatedPrincipal, PrincipalRef } from '../../domain/auth/types.js';

interface EnvironmentGrantJson {
  readonly environmentId: string;
}

interface ProjectGrantJson {
  readonly projectId: string;
  readonly environmentAccess: ReadonlyArray<EnvironmentGrantJson>;
}

interface TenantGrantJson {
  readonly tenantId: string;
  readonly projectAccess: ReadonlyArray<ProjectGrantJson>;
}

interface PrincipalAccessRow {
  principal_id: string;
  principal_type: PrincipalRef['principalType'];
  suspended: boolean;
  tenant_access: ReadonlyArray<TenantGrantJson>;
}

export class EmbeddedWorkspaceContextQuery implements IWorkspaceContextQuery {
  public constructor(
    private readonly pool: Pick<Pool, 'query'>,
    private readonly schema: string = 'dvt'
  ) {}

  public async getEffectiveWorkspaceContext(
    principal: AuthenticatedPrincipal
  ): Promise<EffectiveWorkspaceContextEnvelope | null> {
    const result = await this.pool.query<PrincipalAccessRow>(
      `SELECT principal_id, principal_type, suspended, tenant_access
         FROM ${this.schema}.principal_grants
        WHERE principal_id = $1
          AND principal_type = $2
        LIMIT 1`,
      [principal.principalId, principal.principalType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0]!;
    if (row.suspended) {
      return null;
    }

    const availableWorkspaces = projectAvailableWorkspaces(principal, row.tenant_access);
    const effectiveWorkspace = availableWorkspaces[0];
    if (effectiveWorkspace === undefined) {
      return null;
    }

    return {
      effectiveWorkspace,
      availableWorkspaces,
    };
  }
}

function projectAvailableWorkspaces(
  principal: AuthenticatedPrincipal,
  tenantAccess: ReadonlyArray<TenantGrantJson>
): readonly EffectiveWorkspaceContext[] {
  const workspaces: EffectiveWorkspaceContext[] = [];
  for (const tenantGrant of tenantAccess) {
    if (!isAssertedValueAllowed(principal.assertedTenantIds, tenantGrant.tenantId)) {
      continue;
    }

    for (const projectGrant of tenantGrant.projectAccess) {
      if (!isAssertedValueAllowed(principal.assertedProjectIds, projectGrant.projectId)) {
        continue;
      }

      for (const environmentGrant of projectGrant.environmentAccess) {
        workspaces.push({
          tenantId: tenantGrant.tenantId,
          projectId: projectGrant.projectId,
          environmentId: environmentGrant.environmentId,
        });
      }
    }
  }

  return workspaces;
}

function isAssertedValueAllowed(assertedValues: readonly string[], value: string): boolean {
  return assertedValues.length === 0 || assertedValues.includes(value);
}
