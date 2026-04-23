import type { Pool } from 'pg';

import type { IAccessDecisionService } from '../../application/ports/accessDecision.js';
import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  DeniedReason,
  ExecutionScope,
  PrincipalRef,
  RequestedScope,
} from '../../domain/auth/types.js';

interface EnvironmentGrantJson {
  readonly environmentId: string;
  readonly allowedActions: ReadonlyArray<string>;
}

interface ProjectGrantJson {
  readonly projectId: string;
  readonly allowedActions: ReadonlyArray<string>;
  readonly environmentAccess: ReadonlyArray<EnvironmentGrantJson>;
}

interface TenantGrantJson {
  readonly tenantId: string;
  readonly allowedActions: ReadonlyArray<string>;
  readonly projectAccess: ReadonlyArray<ProjectGrantJson>;
}

interface PrincipalAccessRow {
  principal_id: string;
  principal_type: 'user' | 'service';
  suspended: boolean;
  tenant_access: ReadonlyArray<TenantGrantJson>;
}

interface EnvironmentGrant {
  readonly environmentId: string;
  readonly allowedActions: ReadonlyArray<string>;
}

interface ProjectGrant {
  readonly projectId: string;
  readonly allowedActions: ReadonlyArray<string>;
  readonly environmentAccess: ReadonlyMap<string, EnvironmentGrant>;
}

interface TenantGrant {
  readonly tenantId: string;
  readonly allowedActions: ReadonlyArray<string>;
  readonly projectAccess: ReadonlyMap<string, ProjectGrant>;
}

interface EffectivePrincipalAccess {
  readonly suspended: boolean;
  readonly tenantAccess: ReadonlyMap<string, TenantGrant>;
}

export class EmbeddedAccessDecisionService implements IAccessDecisionService {
  public constructor(
    private readonly pool: Pick<Pool, 'query'>,
    private readonly schema: string = 'dvt'
  ) {}

  public async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS ${this.schema};
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.principal_grants (
        principal_id   TEXT    NOT NULL,
        principal_type TEXT    NOT NULL CHECK (principal_type IN ('user', 'service')),
        suspended      BOOLEAN NOT NULL DEFAULT FALSE,
        tenant_access  JSONB   NOT NULL DEFAULT '[]',
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (principal_id, principal_type)
      );
    `);
  }

  public async decide<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope & { readonly action: TAction }
  ): Promise<
    | { readonly ok: true; readonly approvedScope: ExecutionScope }
    | { readonly ok: false; readonly reason: DeniedReason }
  > {
    const effectiveAccess = await this.loadEffectiveAccess({
      principalId: principal.principalId,
      principalType: principal.principalType,
    });

    if (effectiveAccess === null) {
      return { ok: false, reason: 'TENANT_NOT_GRANTED' };
    }

    if (effectiveAccess.suspended) {
      return { ok: false, reason: 'PRINCIPAL_SUSPENDED' };
    }

    const tenantGrant = effectiveAccess.tenantAccess.get(requestedScope.tenantId.value);
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
    if (requestedScope.projectId === undefined) {
      if (!tenantGrant.allowedActions.includes(actionName)) {
        return { ok: false, reason: 'ACTION_NOT_GRANTED' };
      }

      return {
        ok: true,
        approvedScope: { tenantId: requestedScope.tenantId },
      };
    }

    const projectGrant = tenantGrant.projectAccess.get(requestedScope.projectId.value);
    if (!projectGrant) {
      return { ok: false, reason: 'PROJECT_NOT_GRANTED' };
    }

    if (requestedScope.environmentId === undefined) {
      const allowed =
        projectGrant.allowedActions.includes(actionName) ||
        tenantGrant.allowedActions.includes(actionName);

      if (!allowed) {
        return { ok: false, reason: 'ACTION_NOT_GRANTED' };
      }

      return {
        ok: true,
        approvedScope: {
          tenantId: requestedScope.tenantId,
          projectId: requestedScope.projectId,
        },
      };
    }

    const environmentGrant = projectGrant.environmentAccess.get(requestedScope.environmentId.value);
    if (!environmentGrant) {
      return { ok: false, reason: 'ENVIRONMENT_NOT_GRANTED' };
    }

    const allowed =
      environmentGrant.allowedActions.includes(actionName) ||
      projectGrant.allowedActions.includes(actionName) ||
      tenantGrant.allowedActions.includes(actionName);

    if (!allowed) {
      return { ok: false, reason: 'ACTION_NOT_GRANTED' };
    }

    return {
      ok: true,
      approvedScope: {
        tenantId: requestedScope.tenantId,
        projectId: requestedScope.projectId,
        environmentId: requestedScope.environmentId,
      },
    };
  }

  private async loadEffectiveAccess(
    principal: PrincipalRef
  ): Promise<EffectivePrincipalAccess | null> {
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
    return {
      suspended: row.suspended,
      tenantAccess: buildTenantAccessMap(row.tenant_access),
    };
  }
}

function buildTenantAccessMap(
  grants: ReadonlyArray<TenantGrantJson>
): ReadonlyMap<string, TenantGrant> {
  const map = new Map<string, TenantGrant>();
  for (const grant of grants) {
    map.set(grant.tenantId, {
      tenantId: grant.tenantId,
      allowedActions: grant.allowedActions,
      projectAccess: buildProjectAccessMap(grant.projectAccess),
    });
  }

  return map;
}

function buildProjectAccessMap(
  grants: ReadonlyArray<ProjectGrantJson>
): ReadonlyMap<string, ProjectGrant> {
  const map = new Map<string, ProjectGrant>();
  for (const grant of grants) {
    map.set(grant.projectId, {
      projectId: grant.projectId,
      allowedActions: grant.allowedActions,
      environmentAccess: buildEnvironmentAccessMap(grant.environmentAccess),
    });
  }

  return map;
}

function buildEnvironmentAccessMap(
  grants: ReadonlyArray<EnvironmentGrantJson>
): ReadonlyMap<string, EnvironmentGrant> {
  const map = new Map<string, EnvironmentGrant>();
  for (const grant of grants) {
    map.set(grant.environmentId, {
      environmentId: grant.environmentId,
      allowedActions: grant.allowedActions,
    });
  }

  return map;
}
