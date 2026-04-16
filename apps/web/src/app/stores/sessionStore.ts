import { create } from 'zustand';
import { asNonBlankString } from '@dvt/contracts';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getRuntimeDataSourceMode } from '../services/config/runtimeDataSourceMode';
import {
  resolveWorkspaceBootstrapConfig,
  type WorkspaceBootstrapConfig,
} from '../services/config/workspaceConfig';
import type { RunContext } from '../types/engine';

export interface SessionState {
  tenantId: string;
  projectId: string;
  environmentId: string;
  targetAdapter: RunContext['targetAdapter'];
  setTenantId: (tenantId: string) => void;
  setProjectId: (projectId: string) => void;
  setEnvironmentId: (environmentId: string) => void;
  setTargetAdapter: (targetAdapter: RunContext['targetAdapter']) => void;
  setSessionContext: (
    context: Partial<Pick<RunContext, 'tenantId' | 'projectId' | 'environmentId' | 'targetAdapter'>>
  ) => void;
  buildRunContext: (runId: string) => RunContext;
}

const runtimeDataSourceMode = getRuntimeDataSourceMode();
const workspaceBootstrap = resolveWorkspaceBootstrapConfig(runtimeDataSourceMode);
const DEFAULT_TARGET_ADAPTER: RunContext['targetAdapter'] =
  runtimeDataSourceMode === 'api' ? 'temporal' : 'mock';

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

  return options.some((option) => option.value === normalizedValue) ? normalizedValue : currentValue;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      tenantId: workspaceBootstrap.tenantId,
      projectId: workspaceBootstrap.projectId,
      environmentId: workspaceBootstrap.environmentId,
      targetAdapter: DEFAULT_TARGET_ADAPTER,
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
            ? (persistedState as { state?: Partial<PersistedSessionState> }).state ??
              (persistedState as Partial<PersistedSessionState>)
            : {};

        return {
          ...currentState,
          tenantId: resolvePersistedScopeValue(
            persistedSessionState.tenantId,
            currentState.tenantId,
            workspaceBootstrap.tenantOptions
          ),
          projectId: resolvePersistedScopeValue(
            persistedSessionState.projectId,
            currentState.projectId,
            workspaceBootstrap.projectOptions
          ),
          environmentId: resolvePersistedScopeValue(
            persistedSessionState.environmentId,
            currentState.environmentId,
            workspaceBootstrap.environmentOptions
          ),
          // targetAdapter remains owned by current runtime mode and is not rehydrated from storage.
          targetAdapter: currentState.targetAdapter,
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
