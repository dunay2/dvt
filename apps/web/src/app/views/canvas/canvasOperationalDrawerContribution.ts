/** Owned concern: project Canvas execution posture into the bottom operational drawer. */
import type {
  OperationalDrawerContribution,
  OperationalDrawerProblem,
  OperationalDrawerTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import type { CanvasShellChromeState, CanvasShellPanels } from './canvasShell.types';

type BuildCanvasOperationalDrawerContributionArgs = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  panels: CanvasShellPanels;
  chromeState: CanvasShellChromeState;
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
  canPreviewExecutionPlan,
  chromeState,
  onPreviewExecutionPlan,
}: Readonly<{
  canPreviewExecutionPlan: boolean;
  chromeState: CanvasShellChromeState;
  onPreviewExecutionPlan: () => void;
}>): readonly OperationalDrawerProblem[] {
  if (chromeState.planRunReadiness.status === 'ready') {
    return [];
  }

  const blockers =
    chromeState.planRunReadiness.blockers.length > 0
      ? chromeState.planRunReadiness.blockers
      : ['plan_integrity'];

  return blockers.map((blocker) => ({
    id: blocker,
    severity: blocker === 'authorization_denied' ? 'error' : 'warning',
    message: chromeState.planRunReadiness.summary || chromeState.planStatusSummary,
    detail: blocker,
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
  onPreviewExecutionPlan,
  onStartRun,
  panels,
  policy,
  chromeState,
}: BuildCanvasOperationalDrawerContributionArgs): OperationalDrawerContribution {
  const canPreviewExecutionPlan = panels.userPermissions.canPlan && chromeState.canPlanGraph;
  const problems = buildReadinessProblems({
    canPreviewExecutionPlan,
    chromeState,
    onPreviewExecutionPlan,
  });
  const activeRunId = panels.activeRunId ?? null;
  const previewStatus = chromeState.planRunReadiness.status === 'ready' ? 'ready' : 'blocked';
  const previewBlockers = chromeState.planRunReadiness.blockers;
  const runsStatus = activeRunId != null ? 'active' : chromeState.canStartRun ? 'ready' : 'blocked';

  return {
    source: 'canvas',
    title: 'Canvas operations',
    tabs: policy.tabs.map((id) => ({
      id,
      label: tabLabels[id],
      count:
        id === 'problems'
          ? problems.length
          : id === 'runs' && (activeRunId != null || !chromeState.canStartRun)
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
      canStartRun: chromeState.canStartRun,
      onStartRun,
      status: runsStatus,
      summary:
        runsStatus === 'active'
          ? `Run ${activeRunId} is active.`
          : runsStatus === 'ready'
            ? 'Run is ready after the current execution preview.'
            : chromeState.planRunReadiness.summary || chromeState.planStatusSummary,
    },
    preview: {
      status: previewStatus,
      summary: chromeState.planRunReadiness.summary || chromeState.planStatusSummary,
      blockers: previewBlockers,
      canPreview: canPreviewExecutionPlan,
      onPreviewExecutionPlan,
    },
  };
}
