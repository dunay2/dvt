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
import type { SourceDataSample } from '../../ports/workspace';

export type OperationalDrawerTabId = 'log' | 'problems' | 'runs' | 'preview' | 'data';

export type OperationalDrawerDataSample =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading'; nodeName: string }>
  | Readonly<{ status: 'ready'; nodeName: string; sample: SourceDataSample }>
  | Readonly<{
      status: 'error';
      nodeName: string;
      reason: 'connection_not_found' | 'source_object_not_found' | 'unavailable' | 'unknown';
    }>;

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
  copy: Readonly<{
    problemsAriaLabel: string;
    noProblemsMessage: string;
    runsAriaLabel: string;
    runReadyStatus: string;
    runBlockedStatus: string;
    runActiveStatus: string;
    previewAriaLabel: string;
    previewAction: string;
    previewReadyStatus: string;
    previewBlockedStatus: string;
    dataAriaLabel: string;
    dataIdleMessage: string;
    dataLoadingTemplate: string;
    dataEmptyTemplate: string;
    dataConnectionNotFoundTemplate: string;
    dataSourceObjectNotFoundTemplate: string;
    dataUnavailableTemplate: string;
    dataUnknownErrorTemplate: string;
    dataTruncatedTemplate: string;
    dataCaptionTemplate: string;
    dataNullValue: string;
    tabsAriaLabel: string;
    severity: Readonly<Record<OperationalDrawerProblem['severity'], string>>;
  }>;
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
  dataSample: OperationalDrawerDataSample;
}>;

type OperationalDrawerContributionState = {
  contribution: OperationalDrawerContribution | null;
  activeTab: OperationalDrawerTabId | null;
  hiddenTabs: readonly OperationalDrawerTabId[];
  registerOperationalDrawerContribution: (contribution: OperationalDrawerContribution) => void;
  clearOperationalDrawerContribution: (contribution: OperationalDrawerContribution) => void;
  selectOperationalDrawerTab: (tab: OperationalDrawerTabId) => void;
  setOperationalDrawerTabVisibility: (command: OperationalDrawerTabVisibilityCommand) => void;
};

export type OperationalDrawerTabVisibilityCommand = Readonly<{
  tab: OperationalDrawerTabId;
  visible: boolean;
}>;

type OperationalDrawerTabVisibilityState = Pick<
  OperationalDrawerContributionState,
  'activeTab' | 'contribution' | 'hiddenTabs'
>;

export function setOperationalDrawerTabVisibility(
  state: OperationalDrawerTabVisibilityState,
  command: OperationalDrawerTabVisibilityCommand
): Pick<OperationalDrawerTabVisibilityState, 'activeTab' | 'hiddenTabs'> {
  const tabs = state.contribution?.tabs ?? [];
  if (!tabs.some((tab) => tab.id === command.tab)) {
    return { activeTab: state.activeTab, hiddenTabs: state.hiddenTabs };
  }

  if (command.visible) {
    return {
      activeTab: command.tab,
      hiddenTabs: state.hiddenTabs.filter((tab) => tab !== command.tab),
    };
  }

  if (state.hiddenTabs.includes(command.tab)) {
    return { activeTab: state.activeTab, hiddenTabs: state.hiddenTabs };
  }

  const visibleTabs = tabs.filter((tab) => !state.hiddenTabs.includes(tab.id));
  const closingIndex = visibleTabs.findIndex((tab) => tab.id === command.tab);
  const remainingTabs = visibleTabs.filter((tab) => tab.id !== command.tab);
  const activeTab =
    state.activeTab === command.tab
      ? (remainingTabs[closingIndex]?.id ?? remainingTabs[closingIndex - 1]?.id ?? null)
      : state.activeTab;

  return { activeTab, hiddenTabs: [...state.hiddenTabs, command.tab] };
}

export const useOperationalDrawerContributionStore = create<OperationalDrawerContributionState>(
  (set) => ({
    contribution: null,
    activeTab: 'log',
    hiddenTabs: [],
    registerOperationalDrawerContribution: (contribution) =>
      set((state) => {
        const visibleTabs = contribution.tabs.filter((tab) => !state.hiddenTabs.includes(tab.id));
        const activeTab = visibleTabs.some((tab) => tab.id === state.activeTab)
          ? state.activeTab
          : (visibleTabs[0]?.id ?? null);
        return { contribution, activeTab };
      }),
    clearOperationalDrawerContribution: (contribution) =>
      set((state) => (state.contribution === contribution ? { contribution: null } : state)),
    selectOperationalDrawerTab: (tab) =>
      set((state) =>
        state.contribution?.tabs.some((candidate) => candidate.id === tab)
          ? {
              activeTab: tab,
              hiddenTabs: state.hiddenTabs.filter((hiddenTab) => hiddenTab !== tab),
            }
          : state
      ),
    setOperationalDrawerTabVisibility: (command) =>
      set((state) => setOperationalDrawerTabVisibility(state, command)),
  })
);
