/** Owned concern: expose effective web UI authorization capabilities outside runtime evidence. */
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
  canPlan: true,
  canRun: true,
  canEditEdges: true,
  canManagePlugins: true,
  canManageRBAC: true,
};

export const useAuthorizationStore = create<AuthorizationState>()((set) => ({
  userPermissions: DEFAULT_USER_PERMISSIONS,
  setUserPermissions: (userPermissions) => set({ userPermissions }),
}));
