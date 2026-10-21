// @vitest-environment jsdom
/** Owned concern: prove session projection eligibility with real stores and out-of-order transport. */
import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../../stores/authorizationStore';
import { useSessionStore } from '../../stores/sessionStore';
import { createSessionContextPort } from './sessionContextPort';
import { resolveProtectedRouteSessionContext } from './protectedRouteSessionContext';
import {
  controlledSessionClient,
  grantedSessionClient,
  workspaceResponse,
} from './protectedRouteSessionContext.testSupport';

describe('session publication ordering', () => {
  const originalSession = useSessionStore.getState();
  const originalAuthorization = useAuthorizationStore.getState();

  beforeEach(() => {
    useSessionStore.setState({ ...originalSession, projectId: 'initial' });
    useAuthorizationStore.setState({ userPermissions: DEFAULT_USER_PERMISSIONS });
  });
  afterEach(() => {
    useSessionStore.setState(originalSession, true);
    useAuthorizationStore.setState(originalAuthorization, true);
  });

  it('retains the newer workspace and permissions when an older success arrives', async () => {
    const old = controlledSessionClient();
    const oldResult = resolveProtectedRouteSessionContext(old.client).catch(
      (error: unknown) => error
    );
    old.requests[0]!.resolve({ permissions: { canRun: true } });
    await waitFor(() => expect(old.requests).toHaveLength(2));
    await resolveProtectedRouteSessionContext(grantedSessionClient('current', false));
    old.requests[1]!.resolve(workspaceResponse('obsolete'));
    expect(await oldResult).toMatchObject({ name: 'SessionContextDiscardedError' });
    expect(useSessionStore.getState().projectId).toBe('current');
    expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(false);
  });

  it.each([true, false])(
    'publishes coherent scope and canRun=%s to real session-port subscribers',
    async (canRun) => {
      useAuthorizationStore
        .getState()
        .setUserPermissions({ ...DEFAULT_USER_PERMISSIONS, canRun: !canRun });
      const port = createSessionContextPort();
      const observed: Array<{ projectId: string; canRun: boolean }> = [];
      const unsubscribe = port.subscribeWorkspaceScope(() => {
        observed.push({
          projectId: port.getWorkspaceScopeSnapshot().projectId,
          canRun: useAuthorizationStore.getState().userPermissions.canRun,
        });
      });
      try {
        await resolveProtectedRouteSessionContext(grantedSessionClient('current', canRun));
        expect(observed).toEqual([{ projectId: 'current', canRun }]);
      } finally {
        unsubscribe();
      }
    }
  );

  it('does not revive an older success when the newer request is denied', async () => {
    const old = controlledSessionClient();
    const oldResult = resolveProtectedRouteSessionContext(old.client).catch(
      (error: unknown) => error
    );
    old.requests[0]!.resolve({ permissions: { canRun: true } });
    await waitFor(() => expect(old.requests).toHaveLength(2));
    const denied = controlledSessionClient();
    const deniedResult = resolveProtectedRouteSessionContext(denied.client).catch(
      (error: unknown) => error
    );
    const denial = new Error('session denied');
    denied.requests[0]!.reject(denial);
    expect(await deniedResult).toBe(denial);
    old.requests[1]!.resolve(workspaceResponse('obsolete'));
    expect(await oldResult).toMatchObject({ name: 'SessionContextDiscardedError' });
    expect(useSessionStore.getState().projectId).toBe('initial');
    expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(false);
  });

  it('does not request workspace context after cancellation during session resolution', async () => {
    const old = controlledSessionClient();
    const lifetime = new AbortController();
    const result = resolveProtectedRouteSessionContext(old.client, {
      signal: lifetime.signal,
    }).catch((error: unknown) => error);
    lifetime.abort();
    old.requests[0]!.resolve({ permissions: { canRun: true } });
    await Promise.resolve();
    expect(old.requests).toHaveLength(1);
    expect(await result).toMatchObject({ name: 'SessionContextDiscardedError' });
    expect(useSessionStore.getState().projectId).toBe('initial');
  });

  it('does not publish when the transport ignores cancellation during workspace resolution', async () => {
    const old = controlledSessionClient();
    const lifetime = new AbortController();
    const result = resolveProtectedRouteSessionContext(old.client, {
      signal: lifetime.signal,
    }).catch((error: unknown) => error);
    old.requests[0]!.resolve({ permissions: { canRun: true } });
    await waitFor(() => expect(old.requests).toHaveLength(2));
    lifetime.abort();
    old.requests[1]!.resolve(workspaceResponse('obsolete'));
    expect(await result).toMatchObject({ name: 'SessionContextDiscardedError' });
    expect(useSessionStore.getState().projectId).toBe('initial');
    expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(false);
  });

  it('rejects an already-cancelled caller without superseding current work', async () => {
    const current = controlledSessionClient();
    const result = resolveProtectedRouteSessionContext(current.client);
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(
      resolveProtectedRouteSessionContext(grantedSessionClient('obsolete'), {
        signal: cancelled.signal,
      })
    ).rejects.toMatchObject({ name: 'SessionContextDiscardedError' });
    current.requests[0]!.resolve({});
    await waitFor(() => expect(current.requests).toHaveLength(2));
    current.requests[1]!.resolve(workspaceResponse('current'));
    await result;
    expect(useSessionStore.getState().projectId).toBe('current');
  });

  it('discards stale transport errors instead of exposing them as current recovery failures', async () => {
    const old = controlledSessionClient();
    const result = resolveProtectedRouteSessionContext(old.client).catch((error: unknown) => error);
    await resolveProtectedRouteSessionContext(grantedSessionClient('current'));
    old.requests[0]!.reject(new Error('old network failure'));
    expect(await result).toMatchObject({
      name: 'SessionContextDiscardedError',
      reason: 'superseded',
    });
    expect(useSessionStore.getState().projectId).toBe('current');
    expect(old.requests).toHaveLength(1);
  });

  it('finishes an admitted snapshot but rejects its continuation when a subscriber starts a newer query', async () => {
    const current = controlledSessionClient();
    let currentResult: ReturnType<typeof resolveProtectedRouteSessionContext> | undefined;
    const unsubscribe = useAuthorizationStore.subscribe(() => {
      unsubscribe();
      currentResult = resolveProtectedRouteSessionContext(current.client);
      // Observe rejection immediately; the subscriber cannot await its own query.
      void currentResult.catch(() => undefined);
    });
    try {
      await expect(
        resolveProtectedRouteSessionContext(grantedSessionClient('obsolete', true))
      ).rejects.toMatchObject({ name: 'SessionContextDiscardedError' });
      expect(useSessionStore.getState().projectId).toBe('obsolete');
      expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(true);
      const denial = new Error('newer session denied');
      current.requests[0]!.reject(denial);
      await expect(currentResult).rejects.toBe(denial);
      // Failure preserves the last complete publication, not a mixed pair.
      expect(useSessionStore.getState().projectId).toBe('obsolete');
      expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(true);
    } finally {
      unsubscribe();
    }
  });
});
