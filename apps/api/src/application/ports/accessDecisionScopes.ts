/**
 * Owned concern: define protected API access scope resources and scope builders.
 */
import type { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

export const ACCESS_SCOPE_RESOURCE = {
  tenant: 'tenant',
  project: 'project',
  environment: 'environment',
  workspaceGraphDraft: 'workspace-graph-draft',
} as const;

export type AccessScopeResource =
  (typeof ACCESS_SCOPE_RESOURCE)[keyof typeof ACCESS_SCOPE_RESOURCE];

export type TenantAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.tenant;
  readonly tenantId: TenantId;
  readonly projectId?: never;
  readonly environmentId?: never;
};

export type ProjectAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.project;
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId?: never;
};

export type EnvironmentAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.environment;
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

export type WorkspaceGraphDraftAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.workspaceGraphDraft;
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

export type ExecutionScope =
  | TenantAccessScope
  | ProjectAccessScope
  | EnvironmentAccessScope
  | WorkspaceGraphDraftAccessScope;

export function buildTenantAccessScope(tenantId: TenantId): TenantAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.tenant,
    tenantId,
  };
}

export function buildProjectAccessScope(
  tenantId: TenantId,
  projectId: ProjectId
): ProjectAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.project,
    tenantId,
    projectId,
  };
}

export function buildEnvironmentAccessScope(
  tenantId: TenantId,
  projectId: ProjectId,
  environmentId: EnvironmentId
): EnvironmentAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.environment,
    tenantId,
    projectId,
    environmentId,
  };
}

export function buildWorkspaceGraphDraftAccessScope(
  tenantId: TenantId,
  projectId: ProjectId,
  environmentId: EnvironmentId
): WorkspaceGraphDraftAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.workspaceGraphDraft,
    tenantId,
    projectId,
    environmentId,
  };
}
