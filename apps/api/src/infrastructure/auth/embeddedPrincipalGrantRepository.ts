/**
 * Owned concern: map and persist the embedded principal-grant JSON document.
 */
import type { Pool, PoolClient } from 'pg';

import type {
  EnvironmentGrant,
  IPrincipalGrantRepository,
  PrincipalGrantSnapshot,
  ProjectGrant,
  TenantGrant,
} from '../../application/ports/principalGrantRepository.js';
import type { PrincipalRef, PrincipalType } from '../../domain/auth/types.js';

type Queryable = Pick<Pool | PoolClient, 'query'>;

interface EnvironmentGrantJson {
  readonly environmentId?: unknown;
  readonly allowedActions?: unknown;
}

interface ProjectGrantJson {
  readonly projectId?: unknown;
  readonly allowedActions?: unknown;
  readonly environmentAccess?: unknown;
}

interface TenantGrantJson {
  readonly tenantId?: unknown;
  readonly allowedActions?: unknown;
  readonly projectAccess?: unknown;
}

interface PrincipalAccessRow {
  principal_id: string;
  principal_type: PrincipalType;
  suspended: boolean;
  tenant_access: unknown;
}

export class InvalidPrincipalGrantError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPrincipalGrantError';
  }
}

export class EmbeddedPrincipalGrantRepository implements IPrincipalGrantRepository {
  public constructor(
    private readonly queryable: Queryable,
    private readonly schema: string = 'dvt'
  ) {}

  public async migrate(): Promise<void> {
    await this.queryable.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)};`);
    await this.queryable.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.principal_grants (
        principal_id   TEXT    NOT NULL,
        principal_type TEXT    NOT NULL CHECK (principal_type IN ('user', 'service')),
        suspended      BOOLEAN NOT NULL DEFAULT FALSE,
        tenant_access  JSONB   NOT NULL DEFAULT '[]',
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (principal_id, principal_type)
      );
    `);
  }

  public async load(
    principal: PrincipalRef,
    options: Readonly<{ forUpdate?: boolean }> = {}
  ): Promise<PrincipalGrantSnapshot | null> {
    const lockClause = options.forUpdate === true ? ' FOR UPDATE' : '';
    const result = await this.queryable.query<PrincipalAccessRow>(
      `SELECT principal_id, principal_type, suspended, tenant_access
         FROM ${quoteIdentifier(this.schema)}.principal_grants
        WHERE principal_id = $1
          AND principal_type = $2
        LIMIT 1${lockClause}`,
      [principal.principalId, principal.principalType]
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }

    return {
      principal: {
        principalId: row.principal_id,
        principalType: row.principal_type,
      },
      suspended: row.suspended,
      tenantAccess: parseTenantAccess(row.tenant_access),
    };
  }

  public async save(snapshot: PrincipalGrantSnapshot): Promise<void> {
    await this.queryable.query(
      `UPDATE ${quoteIdentifier(this.schema)}.principal_grants
          SET suspended = $3,
              tenant_access = $4::jsonb,
              updated_at = NOW()
        WHERE principal_id = $1
          AND principal_type = $2`,
      [
        snapshot.principal.principalId,
        snapshot.principal.principalType,
        snapshot.suspended,
        JSON.stringify(normalizeTenantAccess(snapshot.tenantAccess)),
      ]
    );
  }
}

function parseTenantAccess(value: unknown): readonly TenantGrant[] {
  if (!Array.isArray(value)) {
    throw new InvalidPrincipalGrantError('tenant_access must be an array');
  }

  return normalizeTenantAccess(
    value.map((entry, index) => {
      const grant = readRecord<TenantGrantJson>(entry, `tenant_access[${index}]`);
      return {
        tenantId: readNonBlankString(grant.tenantId, `tenant_access[${index}].tenantId`),
        allowedActions: readStringArray(
          grant.allowedActions,
          `tenant_access[${index}].allowedActions`
        ),
        projectAccess: readArray(grant.projectAccess, `tenant_access[${index}].projectAccess`).map(
          (project, projectIndex) => parseProjectGrant(project, index, projectIndex)
        ),
      };
    })
  );
}

function parseProjectGrant(
  value: unknown,
  tenantIndex: number,
  projectIndex: number
): ProjectGrant {
  const path = `tenant_access[${tenantIndex}].projectAccess[${projectIndex}]`;
  const grant = readRecord<ProjectGrantJson>(value, path);
  return {
    projectId: readNonBlankString(grant.projectId, `${path}.projectId`),
    allowedActions: readStringArray(grant.allowedActions, `${path}.allowedActions`),
    environmentAccess: readArray(grant.environmentAccess, `${path}.environmentAccess`).map(
      (environment, environmentIndex) => parseEnvironmentGrant(environment, path, environmentIndex)
    ),
  };
}

function parseEnvironmentGrant(
  value: unknown,
  projectPath: string,
  environmentIndex: number
): EnvironmentGrant {
  const path = `${projectPath}.environmentAccess[${environmentIndex}]`;
  const grant = readRecord<EnvironmentGrantJson>(value, path);
  return {
    environmentId: readNonBlankString(grant.environmentId, `${path}.environmentId`),
    allowedActions: readStringArray(grant.allowedActions, `${path}.allowedActions`),
  };
}

function normalizeTenantAccess(grants: readonly TenantGrant[]): readonly TenantGrant[] {
  return [...grants]
    .map((tenant) => ({
      tenantId: tenant.tenantId,
      allowedActions: normalizeStrings(tenant.allowedActions),
      projectAccess: [...tenant.projectAccess]
        .map((project) => ({
          projectId: project.projectId,
          allowedActions: normalizeStrings(project.allowedActions),
          environmentAccess: [...project.environmentAccess]
            .map((environment) => ({
              environmentId: environment.environmentId,
              allowedActions: normalizeStrings(environment.allowedActions),
            }))
            .sort((left, right) => left.environmentId.localeCompare(right.environmentId)),
        }))
        .sort((left, right) => left.projectId.localeCompare(right.projectId)),
    }))
    .sort((left, right) => left.tenantId.localeCompare(right.tenantId));
}

function normalizeStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function readRecord<T>(value: unknown, path: string): T {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidPrincipalGrantError(`${path} must be an object`);
  }
  return value as T;
}

function readArray(value: unknown, path: string): readonly unknown[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new InvalidPrincipalGrantError(`${path} must be an array`);
  }
  return value;
}

function readStringArray(value: unknown, path: string): readonly string[] {
  return readArray(value, path).map((entry, index) =>
    readNonBlankString(entry, `${path}[${index}]`)
  );
}

function readNonBlankString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidPrincipalGrantError(`${path} must be a non-blank string`);
  }
  return value.trim();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
