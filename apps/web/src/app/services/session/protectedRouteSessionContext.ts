/** Owned concern: resolve protected route session and server-owned workspace context. */
import { asNonBlankString } from '@dvt/contracts';

import type { ApiClient } from '../api/createApiClient';
import {
  DEFAULT_USER_PERMISSIONS,
  useAuthorizationStore,
  type UserPermissions,
} from '../../stores/authorizationStore';
import { useSessionStore } from '../../stores/sessionStore';

type SessionResponse = {
  readonly permissions?: Partial<UserPermissions>;
  readonly grants?: {
    readonly scopes?: readonly string[];
  };
};

type EffectiveWorkspaceContext = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
};

type EffectiveWorkspaceContextResponse = {
  readonly effectiveWorkspace: EffectiveWorkspaceContext;
  readonly availableWorkspaces: readonly EffectiveWorkspaceContext[];
};

function sameWorkspaceContext(left: EffectiveWorkspaceContext, right: EffectiveWorkspaceContext) {
  return (
    left.tenantId === right.tenantId &&
    left.projectId === right.projectId &&
    left.environmentId === right.environmentId
  );
}

function resolveRouteWorkspaceContext(
  currentContext: EffectiveWorkspaceContext,
  workspaceContext: EffectiveWorkspaceContextResponse
): EffectiveWorkspaceContext {
  return (
    workspaceContext.availableWorkspaces.find((workspace) =>
      sameWorkspaceContext(workspace, currentContext)
    ) ?? workspaceContext.effectiveWorkspace
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

  const workspaceContext = await apiClient.getJson<EffectiveWorkspaceContextResponse>(
    '/workspace/context',
    {
      includeSessionHeaders: false,
    }
  );

  const selectedWorkspaceContext = resolveRouteWorkspaceContext(
    useSessionStore.getState(),
    workspaceContext
  );

  useAuthorizationStore
    .getState()
    .setUserPermissions({ ...DEFAULT_USER_PERMISSIONS, ...projectPermissionsFromSession(session) });
  useSessionStore.getState().setSessionContext({
    tenantId: asNonBlankString(selectedWorkspaceContext.tenantId),
    projectId: asNonBlankString(selectedWorkspaceContext.projectId),
    environmentId: asNonBlankString(selectedWorkspaceContext.environmentId),
  });
}
