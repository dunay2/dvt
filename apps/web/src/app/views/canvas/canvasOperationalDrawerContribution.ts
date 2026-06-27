/** Owned concern: project Canvas execution posture into the bottom operational drawer. */
import type {
  OperationalDrawerContribution,
  OperationalDrawerProblem,
  OperationalDrawerTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import type { PlanRunReadinessBlocker } from './canvasPlanReadiness';
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
  blockers,
  canPreviewExecutionPlan,
  chromeState,
  labelBlocker,
  onPreviewExecutionPlan,
}: Readonly<{
  blockers: readonly PlanRunReadinessBlocker[];
  canPreviewExecutionPlan: boolean;
  chromeState: CanvasShellChromeState;
  labelBlocker: (blocker: PlanRunReadinessBlocker) => string;
  onPreviewExecutionPlan: () => void;
}>): readonly OperationalDrawerProblem[] {
  if (chromeState.planRunReadiness.status === 'ready') {
    return [];
  }

  return blockers.map((blocker) => ({
    id: blocker,
    severity: blocker === 'authorization_denied' ? 'error' : 'warning',
    message: chromeState.planRunReadiness.summary || chromeState.planStatusSummary,
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
  onPreviewExecutionPlan,
  onStartRun,
  panels,
  policy,
  chromeState,
}: BuildCanvasOperationalDrawerContributionArgs): OperationalDrawerContribution {
  const canPreviewExecutionPlan = panels.userPermissions.canPlan && chromeState.canPlanGraph;
  const labelBlocker = (blocker: PlanRunReadinessBlocker): string =>
    blocker === 'plan_integrity'
      ? 'Execution Preview integrity'
      : blocker
          .split('_')
          .map((part, index) => (index === 0 ? part[0]?.toUpperCase() + part.slice(1) : part))
          .join(' ');
  const readinessBlockers: readonly PlanRunReadinessBlocker[] =
    chromeState.planRunReadiness.status === 'ready'
      ? []
      : chromeState.planRunReadiness.blockers.length > 0
        ? chromeState.planRunReadiness.blockers
        : ['plan_integrity'];
  const problems = buildReadinessProblems({
    blockers: readinessBlockers,
    canPreviewExecutionPlan,
    chromeState,
    labelBlocker,
    onPreviewExecutionPlan,
  });
  const activeRunId = panels.activeRunId ?? null;
  const previewStatus = chromeState.planRunReadiness.status === 'ready' ? 'ready' : 'blocked';
  const previewBlockers = readinessBlockers.map(labelBlocker);
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
