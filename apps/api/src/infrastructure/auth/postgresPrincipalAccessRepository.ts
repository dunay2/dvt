import type { Pool } from 'pg';

import type { IPrincipalAccessRepository } from '../../application/ports/auth.js';
import type {
  EffectivePrincipalAccess,
  EnvironmentGrant,
  PrincipalRef,
  ProjectGrant,
  TenantGrant,
} from '../../domain/auth/types.js';

// ---------------------------------------------------------------------------
// JSON shape stored in the tenant_access JSONB column
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Migration DDL
// ---------------------------------------------------------------------------

export class PostgresPrincipalAccessRepository implements IPrincipalAccessRepository {
  public constructor(
    private readonly pool: Pool,
    private readonly schema: string = 'dvt'
  ) {}

  public async migrate(): Promise<void> {
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

  public async loadEffectiveAccess(
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
      principal: {
        principalId: row.principal_id,
        principalType: row.principal_type,
      },
      suspended: row.suspended,
      tenantAccess: buildTenantAccessMap(row.tenant_access),
    };
  }
}

// ---------------------------------------------------------------------------
// JSON → domain type helpers
// ---------------------------------------------------------------------------

function buildTenantAccessMap(
  grants: ReadonlyArray<TenantGrantJson>
): ReadonlyMap<string, TenantGrant> {
  const map = new Map<string, TenantGrant>();
  for (const g of grants) {
    map.set(g.tenantId, {
      tenantId: g.tenantId,
      allowedActions: g.allowedActions,
      projectAccess: buildProjectAccessMap(g.projectAccess),
    });
  }
  return map;
}

function buildProjectAccessMap(
  grants: ReadonlyArray<ProjectGrantJson>
): ReadonlyMap<string, ProjectGrant> {
  const map = new Map<string, ProjectGrant>();
  for (const g of grants) {
    map.set(g.projectId, {
      projectId: g.projectId,
      allowedActions: g.allowedActions,
      environmentAccess: buildEnvironmentAccessMap(g.environmentAccess),
    });
  }
  return map;
}

function buildEnvironmentAccessMap(
  grants: ReadonlyArray<EnvironmentGrantJson>
): ReadonlyMap<string, EnvironmentGrant> {
  const map = new Map<string, EnvironmentGrant>();
  for (const g of grants) {
    map.set(g.environmentId, {
      environmentId: g.environmentId,
      allowedActions: g.allowedActions,
    });
  }
  return map;
}
