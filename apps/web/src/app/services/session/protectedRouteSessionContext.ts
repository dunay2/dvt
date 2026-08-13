/** Owned concern: resolve session, granted workspaces, and validated browser selection. */
import { WorkspaceContextResponseSchema, asNonBlankString } from '@dvt/contracts';
import type { ProjectWorkspaceDescriptor, WorkspaceContextResponse } from '@dvt/contracts';

import type { ApiClient } from '../api/createApiClient';
import type { WorkspaceScopeIdentity } from '../../ports/workspaceScopeSelection';
import {
  DEFAULT_USER_PERMISSIONS,
  useAuthorizationStore,
  type UserPermissions,
} from '../../stores/authorizationStore';
import { useSessionStore } from '../../stores/sessionStore';
import {
  resolveSelectedWorkspaceScope,
  sameWorkspaceScopeIdentity,
} from './workspaceScopeSelectionPort';

type SessionResponse = {
  readonly permissions?: Partial<UserPermissions>;
  readonly grants?: {
    readonly scopes?: readonly string[];
  };
};

function resolveRouteWorkspaceContext(
  currentContext: WorkspaceScopeIdentity,
  workspaceContext: WorkspaceContextResponse
): ProjectWorkspaceDescriptor {
  return (
    workspaceContext.availableWorkspaces.find((workspace) =>
      sameWorkspaceScopeIdentity(workspace, currentContext)
    ) ?? workspaceContext.defaultWorkspace
  );
}

function readServerPermission(
  permissions: Partial<UserPermissions> | undefined,
  key: keyof UserPermissions
): boolean | undefined {
  const value = permissions?.[key];
  return typeof value === 'boolean' ? value : undefined;
}

function hasAnyScope(scopes: ReadonlySet<string>, expectedScopes: readonly string[]): boolean {
  return expectedScopes.some((scope) => scopes.has(scope));
}

function projectPermissionsFromSession(session: SessionResponse): UserPermissions {
  const scopes = new Set(session.grants?.scopes ?? []);

  return {
    canPlan:
      readServerPermission(session.permissions, 'canPlan') ??
      hasAnyScope(scopes, ['run:start', 'plan:preview', 'plan:compile']),
    canRun:
      readServerPermission(session.permissions, 'canRun') ?? hasAnyScope(scopes, ['run:start']),
    canEditEdges:
      readServerPermission(session.permissions, 'canEditEdges') ??
      hasAnyScope(scopes, ['workspace:graph-draft:save']),
    canPersistGraphDraft:
      readServerPermission(session.permissions, 'canPersistGraphDraft') ??
      hasAnyScope(scopes, ['workspace:graph-draft:save']),
    canManagePlugins:
      readServerPermission(session.permissions, 'canManagePlugins') ??
      hasAnyScope(scopes, ['plugin:manage', 'plugins:manage']),
    canManageRBAC:
      readServerPermission(session.permissions, 'canManageRBAC') ??
      hasAnyScope(scopes, ['rbac:manage', 'admin:rbac:manage']),
  };
}

export async function resolveProtectedRouteSessionContext(apiClient: Pick<ApiClient, 'getJson'>) {
  const session = await apiClient.getJson<SessionResponse>('/session', {
    includeSessionHeaders: false,
  });

  const workspaceContext = WorkspaceContextResponseSchema.parse(
    await apiClient.getJson<unknown>('/workspace/context', {
      includeSessionHeaders: false,
    })
  );

  const selectedWorkspaceContext = resolveRouteWorkspaceContext(
    useSessionStore.getState(),
    workspaceContext
  );
  const resolvedWorkspaceContext = resolveSelectedWorkspaceScope({
    currentScope: selectedWorkspaceContext,
    defaultWorkspace: workspaceContext.defaultWorkspace,
    availableWorkspaces: workspaceContext.availableWorkspaces,
  });

  useAuthorizationStore
    .getState()
    .setUserPermissions({ ...DEFAULT_USER_PERMISSIONS, ...projectPermissionsFromSession(session) });
  useSessionStore.getState().setWorkspaceScopeSelectionContext({
    selectedScope: {
      tenantId: asNonBlankString(resolvedWorkspaceContext.selectedScope.tenantId),
      projectId: asNonBlankString(resolvedWorkspaceContext.selectedScope.projectId),
      projectName: resolvedWorkspaceContext.selectedScope.projectName,
      environmentId: asNonBlankString(resolvedWorkspaceContext.selectedScope.environmentId),
    },
    targetAdapter: workspaceContext.deploymentScope.targetAdapter,
    availableTargetAdapters: workspaceContext.deploymentScope.availableTargetAdapters,
    availableWorkspaces: resolvedWorkspaceContext.availableWorkspaces.map((workspace) => ({
      tenantId: asNonBlankString(workspace.tenantId),
      projectId: asNonBlankString(workspace.projectId),
      projectName: workspace.projectName,
      environmentId: asNonBlankString(workspace.environmentId),
    })),
  });
}
