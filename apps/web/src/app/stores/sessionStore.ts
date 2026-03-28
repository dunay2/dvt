import { create } from 'zustand';

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
  setSessionContext: (context: Partial<Pick<RunContext, 'tenantId' | 'projectId' | 'environmentId' | 'targetAdapter'>>) => void;
  buildRunContext: (runId: string) => RunContext;
}

const DEFAULT_TENANT_ID = 'acme-corp';
const DEFAULT_PROJECT_ID = 'dbt-analytics';
const DEFAULT_ENVIRONMENT_ID = 'dev';
const DEFAULT_TARGET_ADAPTER: RunContext['targetAdapter'] = 'mock';

export const useSessionStore = create<SessionState>((set, get) => ({
  tenantId: DEFAULT_TENANT_ID,
  projectId: DEFAULT_PROJECT_ID,
  environmentId: DEFAULT_ENVIRONMENT_ID,
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
