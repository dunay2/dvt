/** Owned concern: project Canvas execution posture into the bottom operational drawer. */
import type {
  OperationalDrawerContribution,
  OperationalDrawerProblem,
  OperationalDrawerTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import type { OperationalDrawerSelectionRecoveryMessages } from '../../components/shell/operationalDrawerSelectionRecoveryMessages';
import type { PlanRunReadinessBlocker, PlanRunReadinessReadModel } from './canvasPlanReadiness';
import { canvasViewCopy } from './copy';

type BuildCanvasOperationalDrawerContributionArgs = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  canPlan: boolean;
  activeRunId: string | null;
  canPlanGraph: boolean;
  canStartRun: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
  selectionRecovery?: CanvasExecutionSelectionRecoveryReadModel | null;
  selectionRecoveryCommands?: CanvasExecutionSelectionRecoveryCommands | null;
  selectionRecoveryMessages?: OperationalDrawerSelectionRecoveryMessages;
  onPreviewExecutionPlan: () => void;
  onStartRun: () => void;
}>;

const tabLabels = {
  log: 'Log',
  problems: 'Problems',
  runs: 'Runs',
  preview: 'Preview',
} satisfies Record<OperationalDrawerTabId, string>;

function buildReadinessProblems({
  blockers,
  canPreviewExecutionPlan,
  planRunReadiness,
  planStatusSummary,
  labelBlocker,
  onPreviewExecutionPlan,
}: Readonly<{
  blockers: readonly PlanRunReadinessBlocker[];
  canPreviewExecutionPlan: boolean;
  planRunReadiness: PlanRunReadinessReadModel;
  planStatusSummary: string;
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
            label: 'Preview execution plan',
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
  selectionRecovery = null,
  selectionRecoveryCommands = null,
  selectionRecoveryMessages = canvasViewCopy,
}: BuildCanvasOperationalDrawerContributionArgs): OperationalDrawerContribution {
  const selectionRecoveryBlocked = selectionRecovery?.status === 'blocked';
  const canPreviewExecutionPlan = canPlan && canPlanGraph && !selectionRecoveryBlocked;
  const labelBlocker = (blocker: PlanRunReadinessBlocker): string =>
    blocker === 'plan_integrity'
      ? 'Execution Preview integrity'
      : blocker
          .split('_')
          .map((part, index) => (index === 0 ? part[0]?.toUpperCase() + part.slice(1) : part))
          .join(' ');
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
    title: 'Canvas operations',
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
      onStartRun,
      status: runsStatus,
      summary:
        runsStatus === 'active'
          ? `Run ${activeRunId} is active.`
          : runsStatus === 'ready'
            ? 'Run is ready after the current execution preview.'
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
  };
}
