// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthorizationStore } from './authorizationStore';

describe('useAuthorizationStore', () => {
  beforeEach(() => {
    useAuthorizationStore.setState({
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: true,
        canManageRBAC: true,
      },
    });
  });

  it('owns effective UI authorization capabilities outside runtime evidence', () => {
    useAuthorizationStore.getState().setUserPermissions({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
      canManagePlugins: true,
      canManageRBAC: false,
    });

    expect(useAuthorizationStore.getState().userPermissions).toEqual({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
      canManagePlugins: true,
      canManageRBAC: false,
    });
  });
});
