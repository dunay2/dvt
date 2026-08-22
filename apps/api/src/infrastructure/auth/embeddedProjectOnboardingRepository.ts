/**
 * Owned concern: persist projects and project-creation idempotency after the
 * application boundary has authorized the command.
 */
import { type ProjectDescriptor, type ProjectWorkspaceDescriptor } from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import type { Pool, PoolClient } from 'pg';

import type {
  IPrincipalGrantRepository,
  PrincipalGrantSnapshot,
} from '../../application/ports/principalGrantRepository.js';
import type {
  CreateProjectOutcome,
  GrantedProjectCatalog,
  IProjectOnboardingRepository,
  PersistProjectCreationCommand,
} from '../../application/ports/projectOnboarding.js';
import type { AuthenticatedPrincipal, PrincipalRef } from '../../domain/auth/types.js';

import { EmbeddedPrincipalGrantRepository } from './embeddedPrincipalGrantRepository.js';

interface ProjectRow {
  tenant_id: string;
  project_id: string;
  name: string;
}

interface IdempotencyRow {
  request_hash: string;
  response_json: {
    readonly project: ProjectDescriptor;
    readonly defaultWorkspace: ProjectWorkspaceDescriptor;
  };
}

type ProjectReference = Readonly<{
  tenantId: string;
  projectId: string;
  environmentIds: readonly string[];
}>;

export class EmbeddedProjectOnboardingRepository implements IProjectOnboardingRepository {
  private readonly principalGrants: IPrincipalGrantRepository;
  private readonly buildTransactionGrants: (client: PoolClient) => IPrincipalGrantRepository;

  public constructor(
    private readonly pool: Pick<Pool, 'query' | 'connect'>,
    private readonly schema: string = 'dvt',
    principalGrants?: IPrincipalGrantRepository,
    buildTransactionGrants?: (client: PoolClient) => IPrincipalGrantRepository
  ) {
    this.principalGrants =
      principalGrants ?? new EmbeddedPrincipalGrantRepository(this.pool, this.schema);
    this.buildTransactionGrants =
      buildTransactionGrants ??
      ((client) => new EmbeddedPrincipalGrantRepository(client, this.schema));
  }

  public async migrate(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)};`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.projects (
        tenant_id       TEXT        NOT NULL,
        project_id      TEXT        NOT NULL,
        name             TEXT        NOT NULL,
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

  public async listGrantedProjects(
    principal: AuthenticatedPrincipal
  ): Promise<GrantedProjectCatalog> {
    const grants = await this.principalGrants.load(principal);
    if (grants === null || grants.suspended) {
      return { grantSnapshot: grants, tenantIds: [], projects: [], integrityFindings: [] };
    }

    const visibleTenants = grants.tenantAccess.filter((tenant) =>
      isAssertedValueAllowed(principal.assertedTenantIds, tenant.tenantId)
    );
    const references = visibleTenants.flatMap((tenant) =>
      tenant.projectAccess
        .filter((project) =>
          isAssertedValueAllowed(principal.assertedProjectIds, project.projectId)
        )
        .map((project) => ({
          tenantId: tenant.tenantId,
          projectId: project.projectId,
          environmentIds: project.environmentAccess.map((environment) => environment.environmentId),
        }))
    );
    const rows = await this.loadProjectRows(references);
    const rowByProject = new Map(rows.map((row) => [projectKey(row), row]));
    const projects: ProjectDescriptor[] = [];
    const integrityFindings: GrantedProjectCatalog['integrityFindings'][number][] = [];

    for (const reference of references) {
      const row = rowByProject.get(projectKey(reference));
      if (row === undefined) {
        integrityFindings.push({
          kind: 'missing_project_record',
          tenantId: reference.tenantId,
          projectId: reference.projectId,
        });
        continue;
      }
      projects.push({
        tenantId: reference.tenantId,
        projectId: reference.projectId,
        name: row.name,
        environmentIds: [...reference.environmentIds].sort(),
      });
    }

    return {
      grantSnapshot: grants,
      tenantIds: visibleTenants.map((tenant) => tenant.tenantId),
      projects,
      integrityFindings,
    };
  }

  public async createProject(
    command: PersistProjectCreationCommand,
    revalidateLockedGrants: (effectiveAccess: PrincipalGrantSnapshot) => boolean
  ): Promise<CreateProjectOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const outcome = await this.createProjectInTransaction(
        client,
        command,
        revalidateLockedGrants
      );
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
    command: PersistProjectCreationCommand,
    revalidateLockedGrants: (effectiveAccess: PrincipalGrantSnapshot) => boolean
  ): Promise<CreateProjectOutcome> {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `${command.principal.principalType}:${command.principal.principalId}:${command.idempotencyKey}`,
    ]);
    const transactionGrants = this.buildTransactionGrants(client);
    const grants = await transactionGrants.load(command.principal, { forUpdate: true });
    if (grants === null || grants.suspended) {
      return { kind: 'tenant_not_granted' };
    }
    const tenant = grants.tenantAccess.find((grant) => grant.tenantId === command.tenantId);
    if (tenant === undefined) {
      return { kind: 'tenant_not_granted' };
    }
    if (!revalidateLockedGrants(grants)) {
      return { kind: 'action_not_granted' };
    }

    const requestHash = hashCreateProjectRequest(command);
    const replay = await loadIdempotency(
      client,
      this.schema,
      command.principal,
      command.idempotencyKey
    );
    if (replay !== null) {
      return replay.request_hash === requestHash
        ? {
            kind: 'replayed',
            project: replay.response_json.project,
            defaultWorkspace: replay.response_json.defaultWorkspace,
          }
        : { kind: 'idempotency_conflict' };
    }

    const project: ProjectDescriptor = {
      tenantId: command.tenantId,
      projectId: buildProjectId(command),
      name: command.name,
      environmentIds: [command.defaultEnvironmentId],
    };
    const inserted = await client.query<{ project_id: string }>(
      `INSERT INTO ${quoteIdentifier(this.schema)}.projects
        (tenant_id, project_id, name, created_by_id, created_by_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING project_id`,
      [
        project.tenantId,
        project.projectId,
        project.name,
        command.principal.principalId,
        command.principal.principalType,
      ]
    );
    if (inserted.rows.length === 0) {
      return { kind: 'duplicate_project_name' };
    }

    const defaultWorkspace: ProjectWorkspaceDescriptor = {
      tenantId: project.tenantId,
      projectId: project.projectId,
      projectName: project.name,
      environmentId: command.defaultEnvironmentId,
    };
    await transactionGrants.save(addProjectGrant(grants, command, project));
    await saveIdempotency(
      client,
      this.schema,
      command.principal,
      command.idempotencyKey,
      requestHash,
      {
        project,
        defaultWorkspace,
      }
    );

    return { kind: 'created', project, defaultWorkspace };
  }

  private async loadProjectRows(
    references: readonly ProjectReference[]
  ): Promise<readonly ProjectRow[]> {
    if (references.length === 0) {
      return [];
    }
    const result = await this.pool.query<ProjectRow>(
      `WITH requested(tenant_id, project_id) AS (
         SELECT * FROM UNNEST($1::text[], $2::text[])
       )
       SELECT project.tenant_id, project.project_id, project.name
         FROM ${quoteIdentifier(this.schema)}.projects AS project
         JOIN requested
           ON requested.tenant_id = project.tenant_id
          AND requested.project_id = project.project_id`,
      [
        references.map((reference) => reference.tenantId),
        references.map((reference) => reference.projectId),
      ]
    );
    return result.rows;
  }
}

async function loadIdempotency(
  client: PoolClient,
  schema: string,
  principal: PrincipalRef,
  idempotencyKey: string
): Promise<IdempotencyRow | null> {
  const result = await client.query<IdempotencyRow>(
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

async function saveIdempotency(
  client: PoolClient,
  schema: string,
  principal: PrincipalRef,
  idempotencyKey: string,
  requestHash: string,
  response: IdempotencyRow['response_json']
): Promise<void> {
  await client.query(
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

function addProjectGrant(
  snapshot: PrincipalGrantSnapshot,
  command: PersistProjectCreationCommand,
  project: ProjectDescriptor
): PrincipalGrantSnapshot {
  return {
    ...snapshot,
    tenantAccess: snapshot.tenantAccess.map((tenant) =>
      tenant.tenantId === project.tenantId
        ? {
            ...tenant,
            projectAccess: [
              ...tenant.projectAccess,
              {
                projectId: project.projectId,
                allowedActions: command.creatorWorkspaceActions,
                environmentAccess: [
                  {
                    environmentId: command.defaultEnvironmentId,
                    allowedActions: command.creatorWorkspaceActions,
                  },
                ],
              },
            ],
          }
        : tenant
    ),
  };
}

function buildProjectId(command: PersistProjectCreationCommand): string {
  const slug = command.name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 32);
  const suffix = sha256HexUtf8(
    jcsCanonicalize({
      tenantId: command.tenantId,
      name: command.name,
      idempotencyKey: command.idempotencyKey,
    })
  ).slice(0, 8);
  return `${slug || 'project'}-${suffix}`;
}

function hashCreateProjectRequest(command: PersistProjectCreationCommand): string {
  return sha256HexUtf8(jcsCanonicalize({ tenantId: command.tenantId, name: command.name }));
}

function isAssertedValueAllowed(assertedValues: readonly string[], value: string): boolean {
  return assertedValues.length === 0 || assertedValues.includes(value);
}

function projectKey(
  value: Readonly<{
    tenant_id?: string;
    project_id?: string;
    tenantId?: string;
    projectId?: string;
  }>
): string {
  return `${value.tenant_id ?? value.tenantId}\u0000${value.project_id ?? value.projectId}`;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
