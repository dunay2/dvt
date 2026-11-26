/** Owned concern: project Canvas execution posture into the bottom operational drawer. */
import type { ReactNode } from 'react';

import type {
  OperationalDrawerContribution,
  OperationalDrawerBuiltInTabId,
  OperationalDrawerDataSampleTab,
  OperationalDrawerProblem,
  OperationalDrawerTab,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import type { OperationalDrawerSelectionRecoveryMessages } from '../../components/shell/operationalDrawerSelectionRecoveryMessages';
import type { PlanRunReadinessBlocker, PlanRunReadinessReadModel } from './canvasPlanReadiness';
import {
  resolvePlanRunReadinessBlockerMessage,
  resolvePlanRunReadinessBlockerLabel,
} from './canvasReadinessPresentation';
import { canvasViewCopy, type CanvasViewCopy } from './copy';

type BuildCanvasOperationalDrawerContributionArgs = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  canPlan: boolean;
  activeRunId: string | null;
  canPlanGraph: boolean;
  canStartRun: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  selectionRecovery?: CanvasExecutionSelectionRecoveryReadModel | null;
  selectionRecoveryCommands?: CanvasExecutionSelectionRecoveryCommands | null;
  selectionRecoveryMessages?: OperationalDrawerSelectionRecoveryMessages;
  copy?: CanvasViewCopy;
  onPreviewExecutionPlan: () => void;
  onStartRun: () => void;
  dataSampleTabs?: readonly OperationalDrawerDataSampleTab[];
  semanticBody?: ReactNode;
  operationDataTab?: OperationalDrawerTab;
}>;

function buildReadinessProblems({
  blockers,
  canPreviewExecutionPlan,
  planRunReadiness,
  previewActionLabel,
  labelBlocker,
  copy,
  onPreviewExecutionPlan,
}: Readonly<{
  blockers: readonly PlanRunReadinessBlocker[];
  canPreviewExecutionPlan: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  previewActionLabel: string;
  labelBlocker: (blocker: PlanRunReadinessBlocker) => string;
  copy: CanvasViewCopy;
  onPreviewExecutionPlan: () => void;
}>): readonly OperationalDrawerProblem[] {
  if (planRunReadiness.status === 'ready') {
    return [];
  }

  return blockers.map((blocker) => ({
    id: blocker,
    severity:
      blocker === 'authorization_denied'
        ? 'error'
        : blocker === 'draft_saving'
          ? 'info'
          : 'warning',
    message: resolvePlanRunReadinessBlockerMessage(planRunReadiness, blocker, copy),
    detail: labelBlocker(blocker),
    action:
      canPreviewExecutionPlan && blocker === 'plan_integrity'
        ? {
            label: previewActionLabel,
            onAction: onPreviewExecutionPlan,
          }
        : null,
  }));
}

export function buildCanvasOperationalDrawerContribution(
  args: BuildCanvasOperationalDrawerContributionArgs
): OperationalDrawerContribution {
  const {
    activeRunId,
    canStartRun,
    onPreviewExecutionPlan,
    onStartRun,
    planRunReadiness,
    policy,
    copy = canvasViewCopy,
    selectionRecovery = null,
    selectionRecoveryCommands = null,
    selectionRecoveryMessages = canvasViewCopy,
    dataSampleTabs = [],
    semanticBody,
    operationDataTab,
  } = args;
  const labelBlocker = (blocker: PlanRunReadinessBlocker): string =>
    resolvePlanRunReadinessBlockerLabel(blocker, copy);
  const { canPreviewExecutionPlan, problems, previewStatus, previewBlockers, runsStatus } =
    buildCanvasDrawerReadiness({ ...args, copy, labelBlocker });

  return {
    source: 'canvas',
    title: copy.operationalDrawerTitle,
    copy: buildCanvasOperationalDrawerCopy(copy),
    tabs: buildCanvasOperationalDrawerTabs({
      policy,
      copy,
      dataSampleTabs,
      semanticBody,
      operationDataTab,
      previewStatus,
      previewBlockers,
    }),
    problems: {
      items: problems,
    },
    runs: {
      activeRunId,
      canStartRun,
      onStartRun,
      status: runsStatus,
    },
    preview: {
      status: previewStatus,
      summary: planRunReadiness.summary,
      blockers: previewBlockers,
      canPreview: canPreviewExecutionPlan,
      onPreviewExecutionPlan,
      selectionRecovery:
        selectionRecovery == null || selectionRecoveryCommands == null
          ? null
          : {
              model: selectionRecovery,
              commands: selectionRecoveryCommands,
              messages: selectionRecoveryMessages,
            },
    },
  };
}

function buildCanvasDrawerReadiness({
  activeRunId,
  canPlan,
  canPlanGraph,
  canStartRun,
  planRunReadiness,
  copy = canvasViewCopy,
  selectionRecovery = null,
  selectionRecoveryMessages = canvasViewCopy,
  onPreviewExecutionPlan,
  labelBlocker,
}: BuildCanvasOperationalDrawerContributionArgs &
  Readonly<{ labelBlocker: (blocker: PlanRunReadinessBlocker) => string }>) {
  const selectionRecoveryBlocked = selectionRecovery?.status === 'blocked';
  const canPreviewExecutionPlan = canPlan && canPlanGraph && !selectionRecoveryBlocked;
  const readinessBlockers = resolveDrawerReadinessBlockers(planRunReadiness);
  const readinessProblems = buildReadinessProblems({
    blockers: readinessBlockers,
    canPreviewExecutionPlan,
    planRunReadiness,
    previewActionLabel: copy.operationalDrawerPreviewAction,
    labelBlocker,
    copy,
    onPreviewExecutionPlan,
  });
  const problems = [...readinessProblems];
  if (selectionRecoveryBlocked)
    problems.push({
      id: 'execution_selection',
      severity: 'warning',
      message: selectionRecoveryMessages.selectionRecoveryProblemSummary,
      detail: selectionRecoveryMessages.selectionRecoveryProblemDetail,
      action: null,
    });
  const previewStatus: OperationalDrawerContribution['preview']['status'] =
    planRunReadiness.status === 'ready' && !selectionRecoveryBlocked ? 'ready' : 'blocked';
  const previewBlockers = [
    ...readinessBlockers.map(labelBlocker),
    ...(selectionRecoveryBlocked ? [selectionRecoveryMessages.selectionRecoveryBlockerLabel] : []),
  ];
  const runsStatus = resolveDrawerRunStatus(activeRunId, canStartRun);

  return { canPreviewExecutionPlan, problems, previewStatus, previewBlockers, runsStatus };
}

function buildCanvasOperationalDrawerCopy(
  copy: CanvasViewCopy
): OperationalDrawerContribution['copy'] {
  return {
    problemsAriaLabel: copy.operationalDrawerProblemsAriaLabel,
    noProblemsMessage: copy.operationalDrawerNoProblemsMessage,
    previewAriaLabel: copy.operationalDrawerPreviewAriaLabel,
    previewAction: copy.operationalDrawerPreviewAction,
    previewReadyStatus: copy.operationalDrawerPreviewReadyStatus,
    previewBlockedStatus: copy.operationalDrawerPreviewBlockedStatus,
    dataAriaLabel: copy.operationalDrawerDataAriaLabel,
    dataIdleMessage: copy.operationalDrawerDataIdleMessage,
    dataLoadingTemplate: copy.operationalDrawerDataLoadingTemplate,
    dataEmptyTemplate: copy.operationalDrawerDataEmptyTemplate,
    dataConnectionNotFoundTemplate: copy.operationalDrawerDataConnectionNotFoundTemplate,
    dataSourceObjectNotFoundTemplate: copy.operationalDrawerDataSourceObjectNotFoundTemplate,
    dataUnavailableTemplate: copy.operationalDrawerDataUnavailableTemplate,
    dataUnknownErrorTemplate: copy.operationalDrawerDataUnknownErrorTemplate,
    dataTruncatedTemplate: copy.operationalDrawerDataTruncatedTemplate,
    dataCaptionTemplate: copy.operationalDrawerDataCaptionTemplate,
    dataRowsLabel: copy.operationalDrawerDataRowsLabel,
    dataColumnsLabel: copy.operationalDrawerDataColumnsLabel,
    dataNullValue: copy.operationalDrawerDataNullValue,
    dataRefreshAction: copy.operationalDrawerDataRefreshAction,
    dataQueriedAtLabel: copy.operationalDrawerDataQueriedAtLabel,
    dataBoundedLiveTemplate: copy.operationalDrawerDataBoundedLiveTemplate,
    tabsAriaLabel: copy.operationalDrawerTabsAriaLabel,
    severity: {
      info: copy.operationalDrawerInfoSeverity,
      warning: copy.operationalDrawerWarningSeverity,
      error: copy.operationalDrawerErrorSeverity,
    },
  };
}

function buildCanvasOperationalDrawerTabs({
  policy,
  copy,
  dataSampleTabs = [],
  semanticBody,
  operationDataTab,
  previewStatus,
  previewBlockers,
}: Pick<
  BuildCanvasOperationalDrawerContributionArgs,
  'policy' | 'dataSampleTabs' | 'semanticBody' | 'operationDataTab'
> &
  Readonly<{
    copy: CanvasViewCopy;
    previewStatus: 'ready' | 'blocked';
    previewBlockers: readonly string[];
  }>): readonly OperationalDrawerTab[] {
  const tabLabels = {
    preview: copy.operationalDrawerPreviewTab,
    data: copy.operationalDrawerDataTab,
    semantic: copy.operationalDrawerSemanticTab,
  } satisfies Record<OperationalDrawerBuiltInTabId, string>;

  return policy.tabs.flatMap<OperationalDrawerTab>((id) =>
    id === 'data'
      ? [
          ...(operationDataTab == null ? [] : [operationDataTab]),
          ...dataSampleTabs.map((tab) => ({
            id: tab.id,
            label: tab.dataSample.status === 'idle' ? tab.id : tab.dataSample.nodeName,
            count: null,
            dataSample: tab.dataSample,
            onRefresh: tab.onRefresh,
          })),
        ]
      : [
          {
            id,
            label: tabLabels[id],
            ...(id === 'semantic' && semanticBody !== undefined ? { content: semanticBody } : {}),
            count:
              id === 'preview' && previewStatus === 'blocked'
                ? Math.max(1, previewBlockers.length)
                : null,
          },
        ]
  );
}

function resolveDrawerReadinessBlockers(
  readiness: PlanRunReadinessReadModel
): readonly PlanRunReadinessBlocker[] {
  if (readiness.status === 'ready') return [];
  return readiness.blockers.length > 0 ? readiness.blockers : ['plan_integrity'];
}

function resolveDrawerRunStatus(
  activeRunId: string | null,
  canStartRun: boolean
): OperationalDrawerContribution['runs']['status'] {
  if (activeRunId != null) return 'active';
  return canStartRun ? 'ready' : 'blocked';
}
