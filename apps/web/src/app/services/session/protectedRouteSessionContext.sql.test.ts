// @vitest-environment jsdom
/** Prove SQL gates use exact server scopes within the existing session publication. */
import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from '../../stores/authorizationStore';
import { useSessionStore } from '../../stores/sessionStore';
import { resolveProtectedRouteSessionContext } from './protectedRouteSessionContext';
import {
  controlledSessionClient,
  workspaceResponse,
} from './protectedRouteSessionContext.testSupport';

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

it('denies SQL execution and history before server projection', () => {
  expect(DEFAULT_USER_PERMISSIONS).toMatchObject({
    canExecuteSql: false,
    canViewSqlHistory: false,
  });
});

it.each([
  { scopes: [], execute: false, history: false },
  { scopes: ['run:start'], execute: false, history: false },
  { scopes: ['workspace:sql:execute'], execute: true, history: false },
  { scopes: ['workspace:sql-history:view'], execute: false, history: true },
  { scopes: ['workspace:sql:execute', 'workspace:sql-history:view'], execute: true, history: true },
])('projects independent SQL grants from $scopes', async ({ scopes, execute, history }) => {
  const transport = controlledSessionClient();
  const publication = resolveProtectedRouteSessionContext(transport.client);
  transport.requests[0]!.resolve({
    grants: { scopes },
    permissions: { canRun: true, canExecuteSql: true, canViewSqlHistory: true },
  });
  await waitFor(() => expect(transport.requests).toHaveLength(2));
  transport.requests[1]!.resolve(workspaceResponse('current'));
  await publication;
  expect(useAuthorizationStore.getState().userPermissions).toMatchObject({
    canRun: true,
    canExecuteSql: execute,
    canViewSqlHistory: history,
  });
});

it('cannot restore obsolete SQL grants after a newer admitted publication denies them', async () => {
  const obsolete = controlledSessionClient();
  const old = resolveProtectedRouteSessionContext(obsolete.client).catch((error: unknown) => error);
  obsolete.requests[0]!.resolve({
    grants: { scopes: ['workspace:sql:execute', 'workspace:sql-history:view'] },
  });
  await waitFor(() => expect(obsolete.requests).toHaveLength(2));
  const current = controlledSessionClient();
  const admitted = resolveProtectedRouteSessionContext(current.client);
  current.requests[0]!.resolve({ grants: { scopes: [] } });
  await waitFor(() => expect(current.requests).toHaveLength(2));
  current.requests[1]!.resolve(workspaceResponse('current'));
  await admitted;
  obsolete.requests[1]!.resolve(workspaceResponse('obsolete'));
  expect(await old).toMatchObject({ name: 'SessionContextDiscardedError' });
  expect(useSessionStore.getState().projectId).toBe('current');
  expect(useAuthorizationStore.getState().userPermissions).toMatchObject({
    canExecuteSql: false,
    canViewSqlHistory: false,
  });
});
