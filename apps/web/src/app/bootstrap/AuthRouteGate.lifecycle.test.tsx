// @vitest-environment jsdom
/** Owned concern: prove route cleanup protects real session projections, not only component state. */
import { fireEvent } from '@testing-library/dom';
import { act, StrictMode, useLayoutEffect } from 'react';
import { Link, MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestQueryClient } from '../../testing/reactQueryHarness';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../stores/authorizationStore';
import { useSessionStore } from '../stores/sessionStore';
import {
  controlledSessionClient,
  workspaceResponse,
} from '../services/session/protectedRouteSessionContext.testSupport';
import AuthRouteGate from './AuthRouteGate';

const api = vi.hoisted(() => ({ getJson: vi.fn() }));
vi.mock('../services/api/createApiClient', async (loadOriginal) => ({
  ...(await loadOriginal<typeof import('../services/api/createApiClient')>()),
  createApiClient: () => api,
}));

function ProtectedWorkspaceProbe({
  onCommit,
}: Readonly<{ onCommit?: (route: string) => void }>): JSX.Element {
  const location = useLocation();
  const route = `${location.pathname}${location.search}${location.hash}`;
  useLayoutEffect(() => {
    onCommit?.(route);
  }, [onCommit, route]);
  return <p>Protected workspace</p>;
}

function RoutesUnderTest({
  target = '/canvas?next',
  onProtectedCommit,
}: Readonly<{ target?: string; onProtectedCommit?: (route: string) => void }> = {}): JSX.Element {
  return (
    <MemoryRouter initialEntries={['/canvas']}>
      <Link to="/login">Public route</Link>
      <Link to={target}>Next protected route</Link>
      <Routes>
        <Route path="/login" element={<p>Login recovery</p>} />
        <Route
          element={
            <AuthRouteGate>
              <Outlet />
            </AuthRouteGate>
          }
        >
          <Route
            path="/canvas"
            element={<ProtectedWorkspaceProbe onCommit={onProtectedCommit} />}
          />
          <Route path="/runs" element={<ProtectedWorkspaceProbe onCommit={onProtectedCommit} />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthRouteGate publication lifetime', () => {
  const originalSession = useSessionStore.getState();
  const originalAuthorization = useAuthorizationStore.getState();
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
  let transport: ReturnType<typeof controlledSessionClient>;

  beforeEach(() => {
    transport = controlledSessionClient();
    api.getJson.mockImplementation(transport.client.getJson);
    useSessionStore.setState({ ...originalSession, projectId: 'initial' });
    useAuthorizationStore.setState({ userPermissions: DEFAULT_USER_PERMISSIONS });
  });
  afterEach(async () => {
    await mounted?.cleanup();
    mounted = undefined;
    useSessionStore.setState(originalSession, true);
    useAuthorizationStore.setState(originalAuthorization, true);
    vi.clearAllMocks();
  });

  it('discards a late workspace response after navigation to the public route', async () => {
    mounted = await withTestQueryClient(<RoutesUnderTest />);
    await act(async () => {
      transport.requests[0]!.resolve({ permissions: { canRun: true } });
    });
    expect(transport.requests[1]!.endpoint).toBe('/workspace/context');
    await act(async () => {
      fireEvent.click(mounted!.container.querySelector('a')!);
    });
    expect(mounted.container.textContent).toContain('Login recovery');
    await act(async () => {
      transport.requests[1]!.resolve(workspaceResponse('obsolete'));
    });
    expect(useSessionStore.getState().projectId).toBe('initial');
    expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(false);
    expect(mounted.container.textContent).not.toContain('Protected workspace');
    expect(transport.requests[1]!.init?.signal?.aborted).toBe(true);
  });

  it('does not start a workspace request when unmounted during the session request', async () => {
    mounted = await withTestQueryClient(<RoutesUnderTest />);
    await mounted.cleanup();
    await act(async () => {
      transport.requests[0]!.resolve({});
    });
    expect(transport.requests).toHaveLength(1);
    expect(useSessionStore.getState().projectId).toBe('initial');
  });

  it('does not admit an old success after a newer protected navigation is denied', async () => {
    mounted = await withTestQueryClient(<RoutesUnderTest />);
    await act(async () => {
      transport.requests[0]!.resolve({ permissions: { canRun: true } });
    });
    await act(async () => {
      fireEvent.click(mounted!.container.querySelectorAll('a')[1]!);
    });
    expect(transport.requests[2]!.endpoint).toBe('/session');
    await act(async () => {
      transport.requests[2]!.reject({ statusCode: 401, endpoint: '/session' });
    });
    expect(mounted.container.textContent).toContain('Login recovery');
    await act(async () => {
      transport.requests[1]!.resolve(workspaceResponse('obsolete'));
    });
    expect(useSessionStore.getState().projectId).toBe('initial');
    expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(false);
    expect(mounted.container.textContent).not.toContain('Protected workspace');
  });

  it('allows the current StrictMode setup but not the cleaned-up setup', async () => {
    mounted = await withTestQueryClient(
      <StrictMode>
        <RoutesUnderTest />
      </StrictMode>
    );
    expect(transport.requests).toHaveLength(2);
    await act(async () => {
      transport.requests[1]!.resolve({ permissions: { canRun: false } });
    });
    await act(async () => {
      transport.requests[2]!.resolve(workspaceResponse('current'));
    });
    expect(mounted.container.textContent).toContain('Protected workspace');
    await act(async () => {
      transport.requests[0]!.resolve({ permissions: { canRun: true } });
    });
    expect(transport.requests).toHaveLength(3);
    expect(useSessionStore.getState().projectId).toBe('current');
    expect(useAuthorizationStore.getState().userPermissions.canRun).toBe(false);
  });

  for (const target of ['/runs', '/canvas?next', '/canvas#next']) {
    it.each(['allowed', 'denied'] as const)(
      `keeps the requested ${target} from committing before its %s admission completes`,
      async (outcome) => {
        const committedRoutes: string[] = [];
        mounted = await withTestQueryClient(
          <RoutesUnderTest
            target={target}
            onProtectedCommit={(route) => committedRoutes.push(route)}
          />
        );
        await act(async () => {
          transport.requests[0]!.resolve({});
        });
        await act(async () => {
          transport.requests[1]!.resolve(workspaceResponse('initial'));
        });
        expect(committedRoutes).toEqual(['/canvas']);
        await act(async () => {
          fireEvent.click(mounted!.container.querySelectorAll('a')[1]!);
        });
        expect(transport.requests[2]!.endpoint).toBe('/session');
        expect(committedRoutes).not.toContain(target);
        expect(mounted.container.textContent).toContain('Checking session...');
        await act(async () => {
          transport.requests[2]!.resolve({});
        });
        expect(committedRoutes).not.toContain(target);
        await act(async () => {
          if (outcome === 'allowed') transport.requests[3]!.resolve(workspaceResponse('current'));
          else transport.requests[3]!.reject({ statusCode: 401, endpoint: '/workspace/context' });
        });
        if (outcome === 'allowed') {
          expect(committedRoutes).toEqual(['/canvas', target]);
          expect(useSessionStore.getState().projectId).toBe('current');
        } else {
          expect(committedRoutes).toEqual(['/canvas']);
          expect(mounted.container.textContent).toContain('Login recovery');
        }
      }
    );
  }

  it('retains current admission for an identical requested route', async () => {
    mounted = await withTestQueryClient(<RoutesUnderTest target="/canvas" />);
    await act(async () => {
      transport.requests[0]!.resolve({});
    });
    await act(async () => {
      transport.requests[1]!.resolve(workspaceResponse('current'));
    });
    await act(async () => {
      fireEvent.click(mounted!.container.querySelectorAll('a')[1]!);
    });
    expect(transport.requests).toHaveLength(2);
    expect(mounted.container.textContent).toContain('Protected workspace');
    expect(useSessionStore.getState().projectId).toBe('current');
  });
});
