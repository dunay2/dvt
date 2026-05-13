/** Owned concern: cache server-projected web UI authorization capabilities.
 * @file apps/web/src/app/stores/authorizationStore.ts
 * @baseline ADR-0056: Web UI authority is server-projected
 * @decision Section 2 - Authorization defaults deny privileged UI actions until server projection loads
 * @consequence The browser cannot grant plan, run, edge-edit, plugin, or RBAC authority optimistically
 * @version 1.0.0
 * @date 2026-05-10
 */
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
