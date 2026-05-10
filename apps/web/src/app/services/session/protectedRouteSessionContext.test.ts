import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { classifyProtectedRouteSessionError } from '../../bootstrap/AuthRouteGate';
import { useSessionStore } from '../../stores/sessionStore';
import { resolveProtectedRouteSessionContext } from './protectedRouteSessionContext';

describe('resolveProtectedRouteSessionContext', () => {
  const originalSessionState = useSessionStore.getState();

  beforeEach(() => {
    useSessionStore.setState({
      tenantId: 'local-tenant',
      projectId: 'local-project',
      environmentId: 'local-env',
      targetAdapter: 'temporal',
    });
  });

  afterEach(() => {
    useSessionStore.setState({
      tenantId: originalSessionState.tenantId,
      projectId: originalSessionState.projectId,
      environmentId: originalSessionState.environmentId,
      targetAdapter: originalSessionState.targetAdapter,
    });
  });

  it('resolves session and then applies backend-owned workspace context', async () => {
    const getJson = vi.fn(async (endpoint: string) => {
      if (endpoint === '/session') {
        return {
          principal: { principalId: 'u-1' },
          grants: { tenantIds: ['tenant-a'], projectIds: ['project-a'], scopes: [] },
        };
      }

      if (endpoint === '/workspace/context') {
        return {
          effectiveWorkspace: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'prod',
          },
          availableWorkspaces: [
            {
              tenantId: 'tenant-a',
              projectId: 'project-a',
              environmentId: 'prod',
            },
          ],
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
});
