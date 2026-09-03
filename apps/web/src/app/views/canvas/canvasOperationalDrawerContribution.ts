/** Owned concern: project Canvas execution posture into the bottom operational drawer. */
import type {
  OperationalDrawerContribution,
  OperationalDrawerDataSample,
  OperationalDrawerProblem,
  OperationalDrawerRunControls,
  OperationalDrawerTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import type { OperationalDrawerSelectionRecoveryMessages } from '../../components/shell/operationalDrawerSelectionRecoveryMessages';
import type { PlanRunReadinessBlocker, PlanRunReadinessReadModel } from './canvasPlanReadiness';
import { canvasViewCopy, formatCanvasCopyTemplate, type CanvasViewCopy } from './copy';

type BuildCanvasOperationalDrawerContributionArgs = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  canPlan: boolean;
  activeRunId: string | null;
  runControls?: OperationalDrawerRunControls | null;
  canPlanGraph: boolean;
  canStartRun: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
  selectionRecovery?: CanvasExecutionSelectionRecoveryReadModel | null;
  selectionRecoveryCommands?: CanvasExecutionSelectionRecoveryCommands | null;
  selectionRecoveryMessages?: OperationalDrawerSelectionRecoveryMessages;
  copy?: CanvasViewCopy;
  onPreviewExecutionPlan: () => void;
  onStartRun: () => void;
  dataSample?: OperationalDrawerDataSample;
}>;

function buildReadinessProblems({
  blockers,
  canPreviewExecutionPlan,
  planRunReadiness,
  planStatusSummary,
  previewActionLabel,
  labelBlocker,
  onPreviewExecutionPlan,
}: Readonly<{
  blockers: readonly PlanRunReadinessBlocker[];
  canPreviewExecutionPlan: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
  previewActionLabel: string;
  labelBlocker: (blocker: PlanRunReadinessBlocker) => string;
  onPreviewExecutionPlan: () => void;
}>): readonly OperationalDrawerProblem[] {
  if (planRunReadiness.status === 'ready') {
    return [];
  }

  return blockers.map((blocker) => ({
    id: blocker,
    severity: blocker === 'authorization_denied' ? 'error' : 'warning',
    message: planRunReadiness.summary || planStatusSummary,
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

export function buildCanvasOperationalDrawerContribution({
  activeRunId,
  canPlan,
  canPlanGraph,
  canStartRun,
  onPreviewExecutionPlan,
  onStartRun,
  planRunReadiness,
  planStatusSummary,
  policy,
  copy = canvasViewCopy,
  runControls = null,
  selectionRecovery = null,
  selectionRecoveryCommands = null,
  selectionRecoveryMessages = canvasViewCopy,
  dataSample = { status: 'idle' },
}: BuildCanvasOperationalDrawerContributionArgs): OperationalDrawerContribution {
  const selectionRecoveryBlocked = selectionRecovery?.status === 'blocked';
  const canPreviewExecutionPlan = canPlan && canPlanGraph && !selectionRecoveryBlocked;
  const labelBlocker = (blocker: PlanRunReadinessBlocker): string => {
    switch (blocker) {
      case 'plan_integrity':
        return copy.operationalDrawerPlanIntegrityBlocker;
      case 'backpressure':
        return copy.operationalDrawerBackpressureBlocker;
      case 'capability_mismatch':
        return copy.operationalDrawerCapabilityMismatchBlocker;
      case 'adapter_degraded':
        return copy.operationalDrawerAdapterDegradedBlocker;
      case 'authorization_denied':
        return copy.operationalDrawerAuthorizationDeniedBlocker;
    }
  };
  const tabLabels = {
    log: copy.operationalDrawerLogTab,
    problems: copy.operationalDrawerProblemsTab,
    runs: copy.operationalDrawerRunsTab,
    preview: copy.operationalDrawerPreviewTab,
    data: dataSample.status === 'idle' ? copy.operationalDrawerDataTab : dataSample.nodeName,
  } satisfies Record<OperationalDrawerTabId, string>;
  const readinessBlockers: readonly PlanRunReadinessBlocker[] =
    planRunReadiness.status === 'ready'
      ? []
      : planRunReadiness.blockers.length > 0
        ? planRunReadiness.blockers
        : ['plan_integrity'];
  const readinessProblems = buildReadinessProblems({
    blockers: readinessBlockers,
    canPreviewExecutionPlan,
    planRunReadiness,
    planStatusSummary,
    previewActionLabel: copy.operationalDrawerPreviewAction,
    labelBlocker,
    onPreviewExecutionPlan,
  });
  const selectionProblem: OperationalDrawerProblem | null = selectionRecoveryBlocked
    ? {
        id: 'execution_selection',
        severity: 'warning',
        message: selectionRecoveryMessages.selectionRecoveryProblemSummary,
        detail: selectionRecoveryMessages.selectionRecoveryProblemDetail,
        action: null,
      }
    : null;
  const problems =
    selectionProblem == null ? readinessProblems : [...readinessProblems, selectionProblem];
  const previewStatus =
    planRunReadiness.status === 'ready' && !selectionRecoveryBlocked ? 'ready' : 'blocked';
  const previewBlockers = [
    ...readinessBlockers.map(labelBlocker),
    ...(selectionRecoveryBlocked ? [selectionRecoveryMessages.selectionRecoveryBlockerLabel] : []),
  ];
  const runsStatus = activeRunId != null ? 'active' : canStartRun ? 'ready' : 'blocked';

  return {
    source: 'canvas',
    title: copy.operationalDrawerTitle,
    copy: {
      problemsAriaLabel: copy.operationalDrawerProblemsAriaLabel,
      noProblemsMessage: copy.operationalDrawerNoProblemsMessage,
      runsAriaLabel: copy.operationalDrawerRunsAriaLabel,
      runReadyStatus: copy.operationalDrawerRunReadyStatus,
      runBlockedStatus: copy.operationalDrawerRunBlockedStatus,
      runActiveStatus: copy.operationalDrawerRunActiveStatus,
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
      dataNullValue: copy.operationalDrawerDataNullValue,
      tabsAriaLabel: copy.operationalDrawerTabsAriaLabel,
      severity: {
        info: copy.operationalDrawerInfoSeverity,
        warning: copy.operationalDrawerWarningSeverity,
        error: copy.operationalDrawerErrorSeverity,
      },
    },
    tabs: policy.tabs.map((id) => ({
      id,
      label: tabLabels[id],
      count:
        id === 'problems'
          ? problems.length
          : id === 'runs' && (activeRunId != null || !canStartRun)
            ? 1
            : id === 'preview' && previewStatus === 'blocked'
              ? Math.max(1, previewBlockers.length)
              : null,
    })),
    problems: {
      items: problems,
    },
    runs: {
      activeRunId,
      canStartRun,
      controls: runControls,
      onStartRun,
      status: runsStatus,
      summary:
        runsStatus === 'active'
          ? formatCanvasCopyTemplate(copy.operationalDrawerActiveRunSummaryTemplate, {
              runId: activeRunId ?? '',
            })
          : runsStatus === 'ready'
            ? copy.operationalDrawerReadyRunSummary
            : planRunReadiness.summary || planStatusSummary,
    },
    preview: {
      status: previewStatus,
      summary: planRunReadiness.summary || planStatusSummary,
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
    dataSample,
  };
}
