// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { classifyProtectedRouteSessionError } from '../../bootstrap/AuthRouteGate';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../../stores/authorizationStore';
import { useSessionStore } from '../../stores/sessionStore';
import { resolveProtectedRouteSessionContext } from './protectedRouteSessionContext';

const TEST_DEPLOYMENT_SCOPE = {
  targetAdapter: 'temporal' as const,
  availableTargetAdapters: ['temporal' as const],
};

describe('resolveProtectedRouteSessionContext', () => {
  const originalSessionState = useSessionStore.getState();
  const originalAuthorizationState = useAuthorizationStore.getState();

  beforeEach(() => {
    useSessionStore.setState({
      tenantId: 'local-tenant',
      projectId: 'local-project',
      environmentId: 'local-env',
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
      availableWorkspaces: [],
      workspaceScopeSelectionStatus: 'unresolved',
      workspaceScopeSelectionRejectionReason: undefined,
      rejectedWorkspaceScope: undefined,
    });
    useAuthorizationStore.setState({
      userPermissions: DEFAULT_USER_PERMISSIONS,
      setUserPermissions: originalAuthorizationState.setUserPermissions,
    });
  });

  afterEach(() => {
    useSessionStore.setState({
      tenantId: originalSessionState.tenantId,
      projectId: originalSessionState.projectId,
      environmentId: originalSessionState.environmentId,
      targetAdapter: originalSessionState.targetAdapter,
      availableTargetAdapters: originalSessionState.availableTargetAdapters,
      availableWorkspaces: originalSessionState.availableWorkspaces,
      workspaceScopeSelectionStatus: originalSessionState.workspaceScopeSelectionStatus,
      workspaceScopeSelectionRejectionReason:
        originalSessionState.workspaceScopeSelectionRejectionReason,
      rejectedWorkspaceScope: originalSessionState.rejectedWorkspaceScope,
    });
    useAuthorizationStore.setState({
      userPermissions: originalAuthorizationState.userPermissions,
      setUserPermissions: originalAuthorizationState.setUserPermissions,
    });
  });

  it('resolves session and then applies backend-owned workspace context', async () => {
    const getJson = vi.fn(async (endpoint: string) => {
      if (endpoint === '/session') {
        return {
          principal: { principalId: 'u-1' },
          grants: { tenantIds: ['tenant-a'], projectIds: ['project-a'], scopes: [] },
          permissions: {
            canPlan: true,
            canRun: true,
            canEditEdges: true,
            canPersistGraphDraft: true,
            canManagePlugins: false,
            canManageRBAC: false,
          },
        };
      }

      if (endpoint === '/workspace/context') {
        return {
          defaultWorkspace: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            projectName: 'Analytics',
            environmentId: 'prod',
          },
          availableWorkspaces: [
            {
              tenantId: 'tenant-a',
              projectId: 'project-a',
              projectName: 'Analytics',
              environmentId: 'prod',
            },
          ],
          deploymentScope: TEST_DEPLOYMENT_SCOPE,
        };
      }

      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    await resolveProtectedRouteSessionContext({ getJson } as never);

    expect(getJson).toHaveBeenNthCalledWith(1, '/session', {
      includeSessionHeaders: false,
    });
    expect(getJson).toHaveBeenNthCalledWith(2, '/workspace/context', {
      includeSessionHeaders: false,
    });
    expect(useSessionStore.getState()).toMatchObject({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
      availableWorkspaces: [
        {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          projectName: 'Analytics',
          environmentId: 'prod',
        },
      ],
      workspaceScopeSelectionStatus: 'selected',
    });
    expect(useAuthorizationStore.getState().userPermissions).toEqual({
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canPersistGraphDraft: true,
      canManagePlugins: false,
      canManageRBAC: false,
    });
  });

  it('derives UI permissions from server-granted session scopes when explicit permissions are absent', async () => {
    const getJson = vi.fn(async (endpoint: string) => {
      if (endpoint === '/session') {
        return {
          principal: { principalId: 'u-1' },
          grants: {
            tenantIds: ['tenant-a'],
            projectIds: ['project-a'],
            scopes: ['run:start', 'workspace:graph-draft:save', 'plugins:manage'],
          },
        };
      }

      if (endpoint === '/workspace/context') {
        return {
          defaultWorkspace: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            projectName: 'Analytics',
            environmentId: 'prod',
          },
          availableWorkspaces: [
            {
              tenantId: 'tenant-a',
              projectId: 'project-a',
              projectName: 'Analytics',
              environmentId: 'prod',
            },
          ],
          deploymentScope: TEST_DEPLOYMENT_SCOPE,
        };
      }

      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    await resolveProtectedRouteSessionContext({ getJson } as never);

    expect(useAuthorizationStore.getState().userPermissions).toEqual({
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canPersistGraphDraft: true,
      canManagePlugins: true,
      canManageRBAC: false,
    });
  });

  it('keeps draft persistence authority when explicit graph editing is denied', async () => {
    const getJson = vi.fn(async (endpoint: string) => {
      if (endpoint === '/session') {
        return {
          principal: { principalId: 'u-1' },
          grants: {
            tenantIds: ['tenant-a'],
            projectIds: ['project-a'],
            scopes: ['workspace:graph-draft:save'],
          },
          permissions: {
            canEditEdges: false,
          },
        };
      }

      if (endpoint === '/workspace/context') {
        return {
          defaultWorkspace: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            projectName: 'Analytics',
            environmentId: 'prod',
          },
          availableWorkspaces: [
            {
              tenantId: 'tenant-a',
              projectId: 'project-a',
              projectName: 'Analytics',
              environmentId: 'prod',
            },
          ],
          deploymentScope: TEST_DEPLOYMENT_SCOPE,
        };
      }

      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    await resolveProtectedRouteSessionContext({ getJson } as never);

    expect(useAuthorizationStore.getState().userPermissions).toEqual({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
      canPersistGraphDraft: true,
      canManagePlugins: false,
      canManageRBAC: false,
    });
  });

  it('keeps a preselected workspace when the backend lists it as available', async () => {
    useSessionStore.setState({
      tenantId: 'tenant-a',
      projectId: 'project-dbt',
      environmentId: 'prod',
      targetAdapter: 'temporal',
    });

    const getJson = vi.fn(async (endpoint: string) => {
      if (endpoint === '/session') {
        return {
          grants: {
            scopes: ['workspace:graph-draft:save'],
          },
        };
      }

      if (endpoint === '/workspace/context') {
        return {
          defaultWorkspace: {
            tenantId: 'tenant-a',
            projectId: 'project-transformation',
            projectName: 'Transformation',
            environmentId: 'prod',
          },
          availableWorkspaces: [
            {
              tenantId: 'tenant-a',
              projectId: 'project-transformation',
              projectName: 'Transformation',
              environmentId: 'prod',
            },
            {
              tenantId: 'tenant-a',
              projectId: 'project-dbt',
              projectName: 'DBT',
              environmentId: 'prod',
            },
          ],
          deploymentScope: TEST_DEPLOYMENT_SCOPE,
        };
      }

      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    await resolveProtectedRouteSessionContext({ getJson } as never);

    expect(useSessionStore.getState()).toMatchObject({
      tenantId: 'tenant-a',
      projectId: 'project-dbt',
      environmentId: 'prod',
    });
  });

  it('does not apply local or partial context when workspace context resolution fails', async () => {
    const getJson = vi.fn(async (endpoint: string) => {
      if (endpoint === '/session') {
        return {};
      }

      throw new Error('workspace context not granted');
    });

    await expect(resolveProtectedRouteSessionContext({ getJson } as never)).rejects.toThrow(
      'workspace context not granted'
    );
    expect(useSessionStore.getState()).toMatchObject({
      tenantId: 'local-tenant',
      projectId: 'local-project',
      environmentId: 'local-env',
    });
  });

  it('classifies missing workspace grants as workspace denial instead of login recovery', () => {
    expect(
      classifyProtectedRouteSessionError({
        endpoint: '/workspace/context',
        statusCode: 403,
        responseBody: {
          error: {
            type: 'forbidden',
            reason: 'workspace_context_not_granted',
          },
        },
      })
    ).toBe('workspace_context_not_granted');
  });

  it('keeps authentication failures on the login recovery path', () => {
    expect(
      classifyProtectedRouteSessionError({
        endpoint: '/session',
        statusCode: 401,
        responseBody: {
          error: {
            type: 'unauthorized',
            reason: 'authentication_failed',
          },
        },
      })
    ).toBe('unauthenticated');
  });

  it('classifies missing protected runtime session route as runtime unavailable', () => {
    expect(
      classifyProtectedRouteSessionError({
        endpoint: '/session',
        statusCode: 404,
        responseBody: {
          error: {
            type: 'not_found',
            reason: 'route_not_registered',
          },
        },
      })
    ).toBe('runtime_unavailable');
  });
});
