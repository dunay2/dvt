import { create } from 'zustand';
import type { Run } from '../types/dbt';
import type { PlanViewModel } from '../types/plans';

interface ExecutionState {
  currentPlan: PlanViewModel | null;
  currentRun: Run | null;

  userPermissions: {
    canPlan: boolean;
    canRun: boolean;
    canEditEdges: boolean;
    canManagePlugins: boolean;
    canManageRBAC: boolean;
  };

  setCurrentPlan: (plan: PlanViewModel | null) => void;
  setCurrentRun: (run: Run | null) => void;
}

export const useExecutionStore = create<ExecutionState>()((set) => ({
  currentPlan: null,
  currentRun: null,

  userPermissions: {
    canPlan: true,
    canRun: true,
    canEditEdges: true,
    canManagePlugins: true,
    canManageRBAC: true,
  },

  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setCurrentRun: (run) => set({ currentRun: run }),
}));
