// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_USER_PERMISSIONS, useAuthorizationStore } from './authorizationStore';

describe('useAuthorizationStore', () => {
  beforeEach(() => {
    useAuthorizationStore.setState({
      userPermissions: DEFAULT_USER_PERMISSIONS,
    });
  });

  it('defaults to deny until server-projected permissions hydrate the UI', () => {
    expect(DEFAULT_USER_PERMISSIONS).toEqual({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
      canPersistGraphDraft: false,
      canManagePlugins: false,
      canManageRBAC: false,
    });
    expect(useAuthorizationStore.getState().userPermissions).toEqual(DEFAULT_USER_PERMISSIONS);
  });

  it('owns effective UI authorization capabilities outside runtime evidence', () => {
    useAuthorizationStore.getState().setUserPermissions({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
      canPersistGraphDraft: false,
      canManagePlugins: true,
      canManageRBAC: false,
    });

    expect(useAuthorizationStore.getState().userPermissions).toEqual({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
      canPersistGraphDraft: false,
      canManagePlugins: true,
      canManageRBAC: false,
    });
  });
});
