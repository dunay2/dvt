/** Owned concern: hold the active route contribution to the shell operational drawer. */
import { create } from 'zustand';

export type OperationalDrawerTabId = 'log' | 'problems' | 'runs' | 'preview';

export type OperationalDrawerTab = Readonly<{
  id: OperationalDrawerTabId;
  label: string;
  count: number | null;
}>;

export type OperationalDrawerProblem = Readonly<{
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  detail: string;
}>;

export type OperationalDrawerContribution = Readonly<{
  source: 'canvas';
  title: string;
  tabs: readonly OperationalDrawerTab[];
  problems: Readonly<{
    items: readonly OperationalDrawerProblem[];
  }>;
  runs: Readonly<{
    activeRunId: string | null;
    canStartRun: boolean;
  }>;
  preview: Readonly<{
    status: 'ready' | 'blocked';
    summary: string;
    blockers: readonly string[];
    canPreview: boolean;
    onPreviewExecutionPlan: () => void;
  }>;
}>;

type OperationalDrawerContributionState = {
  contribution: OperationalDrawerContribution | null;
  registerOperationalDrawerContribution: (contribution: OperationalDrawerContribution) => void;
  clearOperationalDrawerContribution: (contribution: OperationalDrawerContribution) => void;
};

export const useOperationalDrawerContributionStore = create<OperationalDrawerContributionState>(
  (set) => ({
    contribution: null,
    registerOperationalDrawerContribution: (contribution) => set({ contribution }),
    clearOperationalDrawerContribution: (contribution) =>
      set((state) => (state.contribution === contribution ? { contribution: null } : state)),
  })
);
