/** Owned concern: cache server-projected web UI authorization capabilities. */
import { create } from 'zustand';

export type UserPermissions = {
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
  canManagePlugins: boolean;
  canManageRBAC: boolean;
};

type AuthorizationState = {
  userPermissions: UserPermissions;
  setUserPermissions: (userPermissions: UserPermissions) => void;
};

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  canPlan: false,
  canRun: false,
  canEditEdges: false,
  canManagePlugins: false,
  canManageRBAC: false,
};

export const useAuthorizationStore = create<AuthorizationState>()((set) => ({
  userPermissions: DEFAULT_USER_PERMISSIONS,
  setUserPermissions: (userPermissions) => set({ userPermissions }),
}));
