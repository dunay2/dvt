import { create } from 'zustand';
import { asNonBlankString } from '@dvt/contracts';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getRuntimeDataSourceMode } from '../services/config/runtimeDataSourceMode';
import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
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
      partialize: (state) => ({
        tenantId: state.tenantId,
        projectId: state.projectId,
        environmentId: state.environmentId,
        targetAdapter: state.targetAdapter,
      }),
    }
  )
);
