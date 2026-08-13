/**
 * Owned concern: project effective workspace context from embedded principal
 * grants without leaking grant-storage semantics to route handlers.
 */
import type { ProjectWorkspaceDescriptor } from '@dvt/contracts';
import type { Pool } from 'pg';

import type { IPrincipalGrantRepository } from '../../application/ports/principalGrantRepository.js';
import type { PrincipalGrantSnapshot } from '../../application/ports/principalGrantRepository.js';
import type {
  EffectiveWorkspaceContextEnvelope,
  IWorkspaceContextQuery,
} from '../../application/ports/workspaceContext.js';
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

interface ProjectNameRow {
  tenant_id: string;
  project_id: string;
  name: string;
}

export class EmbeddedWorkspaceContextQuery implements IWorkspaceContextQuery {
  public constructor(
    private readonly principalGrants: Pick<IPrincipalGrantRepository, 'load'>,
    private readonly projectCatalog: Pick<Pool, 'query'>,
    private readonly schema: string = 'dvt'
  ) {}

  public async getEffectiveWorkspaceContext(
    principal: AuthenticatedPrincipal
  ): Promise<EffectiveWorkspaceContextEnvelope | null> {
    const grants = await this.principalGrants.load(principal);
    if (grants === null || grants.suspended) {
      return null;
    }

    const workspaceRefs = projectWorkspaceRefs(principal, grants.tenantAccess);
    const projectNames = await this.loadProjectNames(workspaceRefs);
    const availableWorkspaces = workspaceRefs.flatMap((workspace): ProjectWorkspaceDescriptor[] => {
      const projectName = projectNames.get(projectKey(workspace));
      return projectName === undefined ? [] : [{ ...workspace, projectName }];
    });
    const defaultWorkspace = availableWorkspaces[0];
    if (defaultWorkspace === undefined) {
      return null;
    }

    return {
      defaultWorkspace,
      availableWorkspaces,
    };
  }

  private async loadProjectNames(
    workspaces: readonly Omit<ProjectWorkspaceDescriptor, 'projectName'>[]
  ): Promise<ReadonlyMap<string, string>> {
    const projects = Array.from(
      new Map(workspaces.map((workspace) => [projectKey(workspace), workspace])).values()
    );
    if (projects.length === 0) {
      return new Map();
    }

    const result = await this.projectCatalog.query<ProjectNameRow>(
      `WITH requested(tenant_id, project_id) AS (
         SELECT * FROM UNNEST($1::text[], $2::text[])
       )
       SELECT project.tenant_id, project.project_id, project.name
         FROM ${quoteIdentifier(this.schema)}.projects AS project
         JOIN requested
           ON requested.tenant_id = project.tenant_id
          AND requested.project_id = project.project_id`,
      [projects.map((project) => project.tenantId), projects.map((project) => project.projectId)]
    );

    return new Map(
      result.rows.map((project) => [
        projectKey({ tenantId: project.tenant_id, projectId: project.project_id }),
        project.name,
      ])
    );
  }
}

function projectWorkspaceRefs(
  principal: AuthenticatedPrincipal,
  tenantAccess: PrincipalGrantSnapshot['tenantAccess']
): readonly Omit<ProjectWorkspaceDescriptor, 'projectName'>[] {
  const workspaces: Omit<ProjectWorkspaceDescriptor, 'projectName'>[] = [];
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

  return workspaces.sort((left, right) =>
    `${projectKey(left)}\u0000${left.environmentId}`.localeCompare(
      `${projectKey(right)}\u0000${right.environmentId}`
    )
  );
}

function isAssertedValueAllowed(assertedValues: readonly string[], value: string): boolean {
  return assertedValues.length === 0 || assertedValues.includes(value);
}

function projectKey(value: Readonly<{ tenantId: string; projectId: string }>): string {
  return `${value.tenantId}\u0000${value.projectId}`;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
