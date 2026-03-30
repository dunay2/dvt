import { create } from 'zustand';

import { resolveDataSource } from '../services/config/dataSource';
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

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();
const DEFAULT_TARGET_ADAPTER: RunContext['targetAdapter'] =
  resolveDataSource() === 'api' ? 'temporal' : 'mock';

export const useSessionStore = create<SessionState>((set, get) => ({
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
      tenantId,
      projectId,
      environmentId,
      targetAdapter,
      runId,
    };
  },
}));
