/**
 * Owned concern: persist embedded project onboarding state behind API ports.
 */
import { createHash } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import { AUTHORIZATION_ACTION_NAME } from '../../application/ports/accessDecision.js';
import {
  PROJECT_ONBOARDING_CREATE_SCOPE,
  PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
  type CreateProjectCommand,
  type CreateProjectOutcome,
  type EffectiveProjectWorkspaceContext,
  type IProjectOnboardingRepository,
  type ProjectDescriptor,
  type ProjectOnboardingCatalog,
} from '../../application/ports/projectOnboarding.js';
import type { AuthenticatedPrincipal, PrincipalRef } from '../../domain/auth/types.js';

type Queryable = Pick<Pool | PoolClient, 'query'>;

interface EnvironmentGrantJson {
  readonly environmentId: string;
  readonly allowedActions?: readonly string[];
}

interface ProjectGrantJson {
  readonly projectId: string;
  readonly allowedActions?: readonly string[];
  readonly environmentAccess?: readonly EnvironmentGrantJson[];
}

interface TenantGrantJson {
  readonly tenantId: string;
  readonly allowedActions?: readonly string[];
  readonly projectAccess?: readonly ProjectGrantJson[];
}

interface PrincipalAccessRow {
  principal_id: string;
  principal_type: PrincipalRef['principalType'];
  suspended: boolean;
  tenant_access: readonly TenantGrantJson[];
}

interface ProjectRow {
  tenant_id: string;
  project_id: string;
  name: string;
}

interface IdempotencyRow {
  request_hash: string;
  response_json: {
    readonly project: ProjectDescriptor;
    readonly effectiveWorkspace: EffectiveProjectWorkspaceContext;
  };
}

export class EmbeddedProjectOnboardingRepository implements IProjectOnboardingRepository {
  public constructor(
    private readonly pool: Pick<Pool, 'query' | 'connect'>,
    private readonly schema: string = 'dvt'
  ) {}

  public async migrate(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)};`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.projects (
        tenant_id       TEXT        NOT NULL,
        project_id      TEXT        NOT NULL,
        name            TEXT        NOT NULL,
        created_by_id   TEXT        NOT NULL,
        created_by_type TEXT        NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tenant_id, project_id)
      );
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS projects_tenant_name_key
        ON ${quoteIdentifier(this.schema)}.projects (tenant_id, lower(name));
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.project_creation_idempotency (
        principal_id     TEXT  NOT NULL,
        principal_type   TEXT  NOT NULL,
        idempotency_key  TEXT  NOT NULL,
        request_hash     TEXT  NOT NULL,
        response_json    JSONB NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (principal_id, principal_type, idempotency_key)
      );
    `);
  }

  public async listProjects(principal: AuthenticatedPrincipal): Promise<ProjectOnboardingCatalog> {
    const access = await loadPrincipalAccess(this.pool, this.schema, principal);
    if (access === null || access.suspended) {
      return { tenants: [], projects: [] };
    }

    const tenants = access.tenant_access
      .filter((tenant) => isAssertedValueAllowed(principal.assertedTenantIds, tenant.tenantId))
      .map((tenant) => ({
        tenantId: tenant.tenantId,
        canCreateProject: canCreateProject(principal, tenant),
      }));
    const projectRefs = tenants.flatMap((tenant) =>
      normalizeProjects(findTenant(access.tenant_access, tenant.tenantId).projectAccess).map(
        (project) => ({
          tenantId: tenant.tenantId,
          projectId: project.projectId,
          environmentIds: normalizeEnvironments(project.environmentAccess).map(
            (environment) => environment.environmentId
          ),
        })
      )
    );

    return {
      tenants,
      projects: await loadProjectDescriptors(this.pool, this.schema, projectRefs),
    };
  }

  public async createProject(
    principal: AuthenticatedPrincipal,
    command: CreateProjectCommand
  ): Promise<CreateProjectOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const outcome = await this.createProjectInTransaction(client, principal, command);
      await client.query('COMMIT');
      return outcome;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async createProjectInTransaction(
    client: PoolClient,
    principal: AuthenticatedPrincipal,
    command: CreateProjectCommand
  ): Promise<CreateProjectOutcome> {
    const requestHash = hashCreateProjectRequest(command);
    const replay = await loadIdempotency(client, this.schema, principal, command.idempotencyKey);
    if (replay !== null) {
      if (replay.request_hash !== requestHash) {
        return { kind: 'idempotency_conflict' };
      }

      return {
        kind: 'replayed',
        project: replay.response_json.project,
        effectiveWorkspace: replay.response_json.effectiveWorkspace,
      };
    }

    const access = await loadPrincipalAccess(client, this.schema, principal);
    if (access === null || access.suspended) {
      return { kind: 'tenant_not_granted' };
    }

    const tenant = findTenant(access.tenant_access, command.tenantId);
    if (tenant.tenantId.length === 0) {
      return { kind: 'tenant_not_granted' };
    }

    if (!canCreateProject(principal, tenant)) {
      return { kind: 'action_not_granted' };
    }

    const duplicate = await client.query<ProjectRow>(
      `SELECT tenant_id, project_id, name
         FROM ${quoteIdentifier(this.schema)}.projects
        WHERE tenant_id = $1
          AND lower(name) = lower($2)
        LIMIT 1`,
      [command.tenantId, command.name]
    );
    if (duplicate.rows.length > 0) {
      return { kind: 'duplicate_project_name' };
    }

    const project = {
      tenantId: command.tenantId,
      projectId: buildProjectId(command),
      name: command.name,
      environmentIds: [PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID],
    };
    const effectiveWorkspace = {
      tenantId: project.tenantId,
      projectId: project.projectId,
      environmentId: PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
    };

    await client.query(
      `INSERT INTO ${quoteIdentifier(this.schema)}.projects
        (tenant_id, project_id, name, created_by_id, created_by_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        project.tenantId,
        project.projectId,
        project.name,
        principal.principalId,
        principal.principalType,
      ]
    );
    await saveProjectGrant(client, this.schema, principal, access.tenant_access, project);
    await saveIdempotency(client, this.schema, principal, command.idempotencyKey, requestHash, {
      project,
      effectiveWorkspace,
    });

    return { kind: 'created', project, effectiveWorkspace };
  }
}

async function loadPrincipalAccess(
  queryable: Queryable,
  schema: string,
  principal: PrincipalRef
): Promise<PrincipalAccessRow | null> {
  const result = await queryable.query<PrincipalAccessRow>(
    `SELECT principal_id, principal_type, suspended, tenant_access
       FROM ${quoteIdentifier(schema)}.principal_grants
      WHERE principal_id = $1
        AND principal_type = $2
      LIMIT 1`,
    [principal.principalId, principal.principalType]
  );

  return result.rows[0] ?? null;
}

async function loadProjectDescriptors(
  queryable: Queryable,
  schema: string,
  projectRefs: readonly {
    readonly tenantId: string;
    readonly projectId: string;
    readonly environmentIds: readonly string[];
  }[]
): Promise<readonly ProjectDescriptor[]> {
  const projects: ProjectDescriptor[] = [];
  for (const ref of projectRefs) {
    const result = await queryable.query<ProjectRow>(
      `SELECT tenant_id, project_id, name
         FROM ${quoteIdentifier(schema)}.projects
        WHERE tenant_id = $1
          AND project_id = $2
        LIMIT 1`,
      [ref.tenantId, ref.projectId]
    );
    const row = result.rows[0];
    projects.push({
      tenantId: ref.tenantId,
      projectId: ref.projectId,
      name: row?.name ?? ref.projectId,
      environmentIds: ref.environmentIds,
    });
  }

  return projects;
}

async function loadIdempotency(
  queryable: Queryable,
  schema: string,
  principal: PrincipalRef,
  idempotencyKey: string
): Promise<IdempotencyRow | null> {
  const result = await queryable.query<IdempotencyRow>(
    `SELECT request_hash, response_json
       FROM ${quoteIdentifier(schema)}.project_creation_idempotency
      WHERE principal_id = $1
        AND principal_type = $2
        AND idempotency_key = $3
      LIMIT 1`,
    [principal.principalId, principal.principalType, idempotencyKey]
  );

  return result.rows[0] ?? null;
}

async function saveProjectGrant(
  queryable: Queryable,
  schema: string,
  principal: PrincipalRef,
  tenantAccess: readonly TenantGrantJson[],
  project: ProjectDescriptor
): Promise<void> {
  const workspaceProjectActions = [
    AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView,
    AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave,
    AUTHORIZATION_ACTION_NAME.workspaceFilesView,
    AUTHORIZATION_ACTION_NAME.workspaceSourceImportView,
    AUTHORIZATION_ACTION_NAME.workspaceSourceImportImport,
  ];
  const updatedTenants = tenantAccess.map((tenant) =>
    tenant.tenantId === project.tenantId
      ? {
          ...tenant,
          projectAccess: [
            ...normalizeProjects(tenant.projectAccess),
            {
              projectId: project.projectId,
              allowedActions: workspaceProjectActions,
              environmentAccess: [
                {
                  environmentId: PROJECT_ONBOARDING_DEFAULT_ENVIRONMENT_ID,
                  allowedActions: workspaceProjectActions,
                },
              ],
            },
          ],
        }
      : tenant
  );

  await queryable.query(
    `UPDATE ${quoteIdentifier(schema)}.principal_grants
        SET tenant_access = $3::jsonb,
            updated_at = NOW()
      WHERE principal_id = $1
        AND principal_type = $2`,
    [principal.principalId, principal.principalType, JSON.stringify(updatedTenants)]
  );
}

async function saveIdempotency(
  queryable: Queryable,
  schema: string,
  principal: PrincipalRef,
  idempotencyKey: string,
  requestHash: string,
  response: IdempotencyRow['response_json']
): Promise<void> {
  await queryable.query(
    `INSERT INTO ${quoteIdentifier(schema)}.project_creation_idempotency
      (principal_id, principal_type, idempotency_key, request_hash, response_json)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      principal.principalId,
      principal.principalType,
      idempotencyKey,
      requestHash,
      JSON.stringify(response),
    ]
  );
}

function findTenant(tenantAccess: readonly TenantGrantJson[], tenantId: string): TenantGrantJson {
  return (
    tenantAccess.find((tenant) => tenant.tenantId === tenantId) ?? {
      tenantId: '',
      allowedActions: [],
      projectAccess: [],
    }
  );
}

function canCreateProject(principal: AuthenticatedPrincipal, tenant: TenantGrantJson): boolean {
  return (
    normalizeStrings(tenant.allowedActions).includes(PROJECT_ONBOARDING_CREATE_SCOPE) ||
    principal.rawScopes.includes(PROJECT_ONBOARDING_CREATE_SCOPE)
  );
}

function buildProjectId(command: CreateProjectCommand): string {
  const slug = command.name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 32);
  const suffix = createHash('sha256')
    .update(`${command.tenantId}:${command.name}:${command.idempotencyKey}`)
    .digest('hex')
    .slice(0, 8);

  return `${slug || 'project'}-${suffix}`;
}

function hashCreateProjectRequest(command: CreateProjectCommand): string {
  return createHash('sha256')
    .update(JSON.stringify({ tenantId: command.tenantId, name: command.name }))
    .digest('hex');
}

function isAssertedValueAllowed(assertedValues: readonly string[], value: string): boolean {
  return assertedValues.length === 0 || assertedValues.includes(value);
}

function normalizeProjects(value: readonly ProjectGrantJson[] | undefined) {
  return value ?? [];
}

function normalizeEnvironments(value: readonly EnvironmentGrantJson[] | undefined) {
  return value ?? [];
}

function normalizeStrings(value: readonly string[] | undefined): readonly string[] {
  return value ?? [];
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
