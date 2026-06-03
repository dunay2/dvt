/** Owned concern: expose current runtime evidence for plan and run selection. */
import { create } from 'zustand';
import type { Run } from '../types/dbt';
import type { PlanViewModel } from '../types/plans';

interface ExecutionState {
  currentPlan: PlanViewModel | null;
  currentRun: Run | null;

  setCurrentPlan: (plan: PlanViewModel | null) => void;
  setCurrentRun: (run: Run | null) => void;
}

export const useExecutionStore = create<ExecutionState>()((set) => ({
  currentPlan: null,
  currentRun: null,

  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setCurrentRun: (run) => set({ currentRun: run }),
}));
