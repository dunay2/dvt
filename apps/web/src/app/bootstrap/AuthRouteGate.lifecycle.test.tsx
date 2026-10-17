// @vitest-environment jsdom
/** Owned concern: prove route cleanup protects real session projections, not only component state. */
import { fireEvent } from '@testing-library/dom';
import { act, StrictMode } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
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

function RoutesUnderTest(): JSX.Element {
  return (
    <MemoryRouter initialEntries={['/canvas']}>
      <Link to="/login">Public route</Link>
      <Link to="/canvas?next">Next protected route</Link>
      <Routes>
        <Route path="/login" element={<p>Login recovery</p>} />
        <Route
          path="/canvas"
          element={
            <AuthRouteGate>
              <p>Protected workspace</p>
            </AuthRouteGate>
          }
        />
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
});
