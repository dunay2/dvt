/** Owned concern: hold the active route contribution to the shell operational drawer. */
import { create } from 'zustand';
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import type { RunControlAvailability } from '../../ports/runs';
import type {
  RunControlCommandFailure,
  RunControlCommandOutcome,
  RunControlCommandRequest,
} from '../../services/runs/runControlCommandModel';
import type { OperationalDrawerSelectionRecoveryMessages } from './operationalDrawerSelectionRecoveryMessages';

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
  action?: Readonly<{
    label: string;
    onAction: () => void;
  }> | null;
}>;

export type OperationalDrawerRunControls = Readonly<{
  runId: string;
  availability: RunControlAvailability;
  activity: RunControlCommandRequest | null;
  outcome: RunControlCommandOutcome | null;
  failure: RunControlCommandFailure | null;
  onCancel: () => void;
  onRecover: () => void;
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
    onStartRun: () => void;
    status: 'active' | 'ready' | 'blocked';
    summary: string;
    controls: OperationalDrawerRunControls | null;
  }>;
  preview: Readonly<{
    status: 'ready' | 'blocked';
    summary: string;
    blockers: readonly string[];
    canPreview: boolean;
    onPreviewExecutionPlan: () => void;
    selectionRecovery: Readonly<{
      model: CanvasExecutionSelectionRecoveryReadModel;
      commands: CanvasExecutionSelectionRecoveryCommands;
      messages: OperationalDrawerSelectionRecoveryMessages;
    }> | null;
  }>;
}>;

type OperationalDrawerContributionState = {
  contribution: OperationalDrawerContribution | null;
  activeTab: OperationalDrawerTabId;
  registerOperationalDrawerContribution: (contribution: OperationalDrawerContribution) => void;
  clearOperationalDrawerContribution: (contribution: OperationalDrawerContribution) => void;
  selectOperationalDrawerTab: (tab: OperationalDrawerTabId) => void;
};

export const useOperationalDrawerContributionStore = create<OperationalDrawerContributionState>(
  (set) => ({
    contribution: null,
    activeTab: 'log',
    registerOperationalDrawerContribution: (contribution) => set({ contribution }),
    clearOperationalDrawerContribution: (contribution) =>
      set((state) => (state.contribution === contribution ? { contribution: null } : state)),
    selectOperationalDrawerTab: (tab) => set({ activeTab: tab }),
  })
);
