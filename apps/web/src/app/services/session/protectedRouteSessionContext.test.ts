// @vitest-environment jsdom

import {
  ProjectWorkspaceDescriptorSchema,
  type ProjectWorkspaceDescriptor,
  type WorkspaceContextResponse,
} from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { classifyProtectedRouteSessionError } from '../../bootstrap/AuthRouteGate';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../../stores/authorizationStore';
import { useSessionStore } from '../../stores/sessionStore';
import { resolveProtectedRouteSessionContext } from './protectedRouteSessionContext';

const TEST_DEPLOYMENT_SCOPE = {
  targetAdapter: 'temporal' as const,
  availableTargetAdapters: ['temporal' as const],
};

function testProject(projectId: string, projectName: string): ProjectWorkspaceDescriptor {
  return ProjectWorkspaceDescriptorSchema.parse({
    tenantId: 'tenant-a',
    projectId,
    projectName,
    environmentId: 'prod',
  });
}

function workspaceContext(
  defaultWorkspace = testProject('project-a', 'Analytics'),
  ...additional: ProjectWorkspaceDescriptor[]
): WorkspaceContextResponse {
  return {
    defaultWorkspace,
    availableWorkspaces: [defaultWorkspace, ...additional],
    deploymentScope: TEST_DEPLOYMENT_SCOPE,
  };
}

const deniedPermissions = {
  canPlan: false,
  canRun: false,
  canEditEdges: false,
  canPersistGraphDraft: false,
  canManagePlugins: false,
  canManageRBAC: false,
  canExecuteSql: false,
  canViewSqlHistory: false,
};

function assertGrantedPermissions(...granted: (keyof typeof deniedPermissions)[]): void {
  const expected = { ...deniedPermissions };
  for (const permission of granted) expected[permission] = true;
  expect(useAuthorizationStore.getState().userPermissions).toEqual(expected);
}

function scopedSession(
  scopes: string[],
  permissions?: Partial<typeof deniedPermissions>
): {
  principal: { principalId: string };
  grants: { tenantIds: string[]; projectIds: string[]; scopes: string[] };
  permissions?: Partial<typeof deniedPermissions>;
} {
  return {
    principal: { principalId: 'u-1' },
    grants: { tenantIds: ['tenant-a'], projectIds: ['project-a'], scopes },
    ...(permissions && { permissions }),
  };
}

function sessionEndpoints(
  session: object,
  context = workspaceContext()
): ReturnType<typeof vi.fn<(endpoint: string) => Promise<object>>> {
  return vi.fn(async (endpoint: string) => {
    if (endpoint === '/session') return session;
    if (endpoint === '/workspace/context') return context;
    throw new Error('Unexpected endpoint ' + endpoint);
  });
}

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
    const getJson = sessionEndpoints(
      scopedSession([], {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canPersistGraphDraft: true,
        canManagePlugins: false,
        canManageRBAC: false,
      })
    );

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
    assertGrantedPermissions('canPlan', 'canRun', 'canEditEdges', 'canPersistGraphDraft');
  });

  it('derives UI permissions from server-granted session scopes when explicit permissions are absent', async () => {
    const getJson = sessionEndpoints(
      scopedSession(['run:start', 'workspace:graph-draft:save', 'plugins:manage'])
    );

    await resolveProtectedRouteSessionContext({ getJson } as never);

    assertGrantedPermissions(
      'canPlan',
      'canRun',
      'canEditEdges',
      'canPersistGraphDraft',
      'canManagePlugins'
    );
  });

  it('keeps draft persistence authority when explicit graph editing is denied', async () => {
    const getJson = sessionEndpoints(
      scopedSession(['workspace:graph-draft:save'], {
        canEditEdges: false,
      })
    );

    await resolveProtectedRouteSessionContext({ getJson } as never);

    assertGrantedPermissions('canPersistGraphDraft');
  });

  it('keeps a preselected workspace when the backend lists it as available', async () => {
    useSessionStore.setState({
      tenantId: 'tenant-a',
      projectId: 'project-dbt',
      environmentId: 'prod',
      targetAdapter: 'temporal',
    });

    const getJson = sessionEndpoints(
      {
        grants: {
          scopes: ['workspace:graph-draft:save'],
        },
      },
      workspaceContext(
        testProject('project-transformation', 'Transformation'),
        testProject('project-dbt', 'DBT')
      )
    );

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

  it.each([
    { source: 'HTTP server response', error: { endpoint: '/session', statusCode: 500 } },
    { source: 'schema validation', error: new Error('Invalid workspace schema') },
    { source: 'local projection', error: new TypeError('Cannot read session permissions') },
    { source: 'request preparation', error: { category: 'network', cause: new Error('Headers') } },
    { source: 'missing exception', error: undefined },
    { source: 'null exception', error: null },
  ])('uses neutral recovery for $source without claiming a transport cause', ({ error }) => {
    expect(classifyProtectedRouteSessionError(error)).toBe('session_check_failed');
  });

  it.each([
    {
      title: 'classifies missing workspace grants as workspace denial instead of login recovery',
      endpoint: '/workspace/context',
      statusCode: 403,
      type: 'forbidden',
      reason: 'workspace_context_not_granted',
      expected: 'workspace_context_not_granted',
    },
    {
      title: 'keeps authentication failures on the login recovery path',
      endpoint: '/session',
      statusCode: 401,
      type: 'unauthorized',
      reason: 'authentication_failed',
      expected: 'unauthenticated',
    },
    {
      title: 'classifies missing protected runtime session route as runtime unavailable',
      endpoint: '/session',
      statusCode: 404,
      type: 'not_found',
      reason: 'route_not_registered',
      expected: 'runtime_unavailable',
    },
  ])('$title', ({ endpoint, statusCode, type, reason, expected }) => {
    expect(
      classifyProtectedRouteSessionError({
        endpoint,
        statusCode,
        responseBody: { error: { type, reason } },
      })
    ).toBe(expected);
  });
});
