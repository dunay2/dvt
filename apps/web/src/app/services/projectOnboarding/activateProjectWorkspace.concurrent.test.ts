// @vitest-environment jsdom
/** Owned concern: reject activation whose granted-context publication has lost its lifetime. */
import { waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../stores/sessionStore';
import { useAuthorizationStore } from '../../stores/authorizationStore';
import { resolveProtectedRouteSessionContext } from '../session/protectedRouteSessionContext';
import {
  controlledSessionClient,
  grantedSessionClient,
  workspaceResponse,
} from '../session/protectedRouteSessionContext.testSupport';
import { activateProjectWorkspace } from './activateProjectWorkspace';

describe('project activation publication lifetime', () => {
  const originalSession = useSessionStore.getState();
  const originalAuthorization = useAuthorizationStore.getState();
  afterEach(() => {
    useSessionStore.setState(originalSession, true);
    useAuthorizationStore.setState(originalAuthorization, true);
  });

  it('cannot select or reject a workspace from a superseded refresh', async () => {
    const old = controlledSessionClient();
    const result = activateProjectWorkspace(workspaceResponse('obsolete').defaultWorkspace, {
      apiClient: old.client,
    }).catch((error: unknown) => error);
    old.requests[0]!.resolve({ permissions: { canRun: true } });
    await waitFor(() => expect(old.requests).toHaveLength(2));
    await resolveProtectedRouteSessionContext(grantedSessionClient('current'));
    old.requests[1]!.resolve(workspaceResponse('obsolete'));
    expect(await result).toMatchObject({ name: 'SessionContextDiscardedError' });
    expect(useSessionStore.getState()).toMatchObject({
      projectId: 'current',
      workspaceScopeSelectionStatus: 'selected',
      rejectedWorkspaceScope: undefined,
    });
  });

  it('checks the publication receipt again before selecting the workspace', async () => {
    const selectWorkspaceScope = vi.fn();
    const failure = new Error('publication superseded before activation continuation');
    await expect(
      activateProjectWorkspace(workspaceResponse('obsolete').defaultWorkspace, {
        resolveSessionContext: vi.fn().mockResolvedValue({
          assertCurrent: () => {
            throw failure;
          },
        }),
        workspaceScopeSelection: {
          selectWorkspaceScope,
          getSelection: vi.fn(),
          subscribeSelection: vi.fn(),
        },
      })
    ).rejects.toBe(failure);
    expect(selectWorkspaceScope).not.toHaveBeenCalled();
  });

  it('does not activate after cancellation when the transport still completes', async () => {
    const transport = controlledSessionClient();
    const lifetime = new AbortController();
    const result = activateProjectWorkspace(workspaceResponse('obsolete').defaultWorkspace, {
      apiClient: transport.client,
      signal: lifetime.signal,
    }).catch((error: unknown) => error);
    transport.requests[0]!.resolve({});
    await waitFor(() => expect(transport.requests).toHaveLength(2));
    lifetime.abort();
    transport.requests[1]!.resolve(workspaceResponse('obsolete'));
    expect(await result).toMatchObject({ name: 'SessionContextDiscardedError' });
    expect(useSessionStore.getState().projectId).toBe(originalSession.projectId);
  });
});
