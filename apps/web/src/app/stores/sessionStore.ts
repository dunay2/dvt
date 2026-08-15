/** Owned concern: own web workspace session scope and run context projection. */
import { create } from 'zustand';
import { asNonBlankString } from '@dvt/contracts';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  resolveWorkspaceBootstrapConfig,
  type WorkspaceBootstrapConfig,
} from '../services/config/workspaceConfig';
import type { RunContext } from '../types/engine';
import {
  WORKSPACE_SCOPE_SELECTION_STATUS,
  type WorkspaceScopeIdentity,
  type WorkspaceScopeSelectionRejectionReason,
  type WorkspaceScopeSelectionStatus,
} from '../ports/workspaceScopeSelection';

export interface SessionState {
  tenantId: string;
  projectId: string;
  environmentId: string;
  targetAdapter: RunContext['targetAdapter'];
  availableTargetAdapters: readonly RunContext['targetAdapter'][];
  availableWorkspaces: readonly WorkspaceScopeIdentity[];
  workspaceScopeSelectionStatus: WorkspaceScopeSelectionStatus;
  workspaceScopeSelectionRejectionReason?: WorkspaceScopeSelectionRejectionReason;
  rejectedWorkspaceScope?: WorkspaceScopeIdentity;
  setTenantId: (tenantId: string) => void;
  setProjectId: (projectId: string) => void;
  setEnvironmentId: (environmentId: string) => void;
  setTargetAdapter: (targetAdapter: RunContext['targetAdapter']) => void;
  setSessionContext: (
    context: Partial<Pick<RunContext, 'tenantId' | 'projectId' | 'environmentId' | 'targetAdapter'>>
  ) => void;
  setWorkspaceScopeSelectionContext: (context: {
    selectedScope: WorkspaceScopeIdentity;
    availableWorkspaces: readonly WorkspaceScopeIdentity[];
    targetAdapter?: RunContext['targetAdapter'];
    availableTargetAdapters?: readonly RunContext['targetAdapter'][];
  }) => void;
  recordRejectedWorkspaceScopeSelection: (
    requestedScope: WorkspaceScopeIdentity,
    reason: WorkspaceScopeSelectionRejectionReason
  ) => void;
  buildRunContext: (runId: string) => RunContext;
}

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();
const DEFAULT_TARGET_ADAPTER: RunContext['targetAdapter'] = 'temporal';

type PersistedSessionState = Pick<SessionState, 'tenantId' | 'projectId' | 'environmentId'> & {
  targetAdapter?: RunContext['targetAdapter'];
};

function resolvePersistedScopeValue(
  persistedValue: unknown,
  currentValue: string,
  options: WorkspaceBootstrapConfig['tenantOptions']
): string {
  if (typeof persistedValue !== 'string') {
    return currentValue;
  }

  const normalizedValue = persistedValue.trim();
  if (normalizedValue.length === 0) {
    return currentValue;
  }

  return options.some((option) => option.value === normalizedValue)
    ? normalizedValue
    : currentValue;
}

function readPersistedNonBlankValue(persistedValue: unknown): string | null {
  if (typeof persistedValue !== 'string') {
    return null;
  }

  const normalizedValue = persistedValue.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      tenantId: workspaceBootstrap.tenantId,
      projectId: workspaceBootstrap.projectId,
      environmentId: workspaceBootstrap.environmentId,
      targetAdapter: DEFAULT_TARGET_ADAPTER,
      availableTargetAdapters: [DEFAULT_TARGET_ADAPTER],
      availableWorkspaces: [],
      workspaceScopeSelectionStatus: WORKSPACE_SCOPE_SELECTION_STATUS.unresolved,
      setTenantId: (tenantId) => set({ tenantId }),
      setProjectId: (projectId) => set({ projectId }),
      setEnvironmentId: (environmentId) => set({ environmentId }),
      setTargetAdapter: (targetAdapter) => set({ targetAdapter }),
      setSessionContext: (context) =>
        set((state) => ({
          tenantId: context.tenantId ?? state.tenantId,
          projectId: context.projectId ?? state.projectId,
          environmentId: context.environmentId ?? state.environmentId,
          targetAdapter: context.targetAdapter ?? state.targetAdapter,
        })),
      setWorkspaceScopeSelectionContext: ({
        selectedScope,
        availableWorkspaces,
        targetAdapter,
        availableTargetAdapters,
      }) =>
        set({
          tenantId: selectedScope.tenantId,
          projectId: selectedScope.projectId,
          environmentId: selectedScope.environmentId,
          targetAdapter: targetAdapter ?? get().targetAdapter,
          availableTargetAdapters: availableTargetAdapters
            ? [...availableTargetAdapters]
            : get().availableTargetAdapters,
          availableWorkspaces: [...availableWorkspaces],
          workspaceScopeSelectionStatus: WORKSPACE_SCOPE_SELECTION_STATUS.selected,
          workspaceScopeSelectionRejectionReason: undefined,
          rejectedWorkspaceScope: undefined,
        }),
      recordRejectedWorkspaceScopeSelection: (requestedScope, reason) =>
        set({
          workspaceScopeSelectionStatus: WORKSPACE_SCOPE_SELECTION_STATUS.rejected,
          workspaceScopeSelectionRejectionReason: reason,
          rejectedWorkspaceScope: requestedScope,
        }),
      buildRunContext: (runId) => {
        const { tenantId, projectId, environmentId, targetAdapter } = get();
        return {
          tenantId: asNonBlankString(tenantId),
          projectId: asNonBlankString(projectId),
          environmentId: asNonBlankString(environmentId),
          targetAdapter,
          runId: asNonBlankString(runId),
        };
      },
    }),
    {
      name: 'dvt-web-session',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persistedSessionState =
          typeof persistedState === 'object' && persistedState != null
            ? ((persistedState as { state?: Partial<PersistedSessionState> }).state ??
              (persistedState as Partial<PersistedSessionState>))
            : {};

        const tenantId = resolvePersistedScopeValue(
          persistedSessionState.tenantId,
          currentState.tenantId,
          workspaceBootstrap.tenantOptions
        );
        const environmentId = resolvePersistedScopeValue(
          persistedSessionState.environmentId,
          currentState.environmentId,
          workspaceBootstrap.environmentOptions
        );
        const persistedTenantId = readPersistedNonBlankValue(persistedSessionState.tenantId);
        const persistedEnvironmentId = readPersistedNonBlankValue(
          persistedSessionState.environmentId
        );
        const projectId =
          persistedTenantId === tenantId && persistedEnvironmentId === environmentId
            ? (readPersistedNonBlankValue(persistedSessionState.projectId) ??
              currentState.projectId)
            : currentState.projectId;

        return {
          ...currentState,
          tenantId,
          projectId,
          environmentId,
          availableWorkspaces: currentState.availableWorkspaces,
          workspaceScopeSelectionStatus: currentState.workspaceScopeSelectionStatus,
          workspaceScopeSelectionRejectionReason:
            currentState.workspaceScopeSelectionRejectionReason,
          rejectedWorkspaceScope: currentState.rejectedWorkspaceScope,
          // targetAdapter remains owned by current runtime mode and is not rehydrated from storage.
          targetAdapter: currentState.targetAdapter,
          availableTargetAdapters: currentState.availableTargetAdapters,
        };
      },
      partialize: (state) => ({
        tenantId: state.tenantId,
        projectId: state.projectId,
        environmentId: state.environmentId,
      }),
    }
  )
);
