/** Owned concern: publish Canvas route posture into the shell operational drawer. */
import { useEffect, useMemo } from 'react';

import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerContribution,
  type OperationalDrawerProblem,
  type OperationalDrawerTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasShellPanels, CanvasShellToolbar } from './canvasShell.types';

type CanvasOperationalDrawerContributionRegistrarProps = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  panels: CanvasShellPanels;
  toolbar: CanvasShellToolbar;
  onPreviewExecutionPlan: () => void;
}>;

const tabLabels = {
  log: 'Log',
  problems: 'Problems',
  runs: 'Runs',
  preview: 'Preview',
} satisfies Record<OperationalDrawerTabId, string>;

function buildReadinessProblems(toolbar: CanvasShellToolbar): readonly OperationalDrawerProblem[] {
  if (toolbar.planRunReadiness.status === 'ready') {
    return [];
  }

  const blockers =
    toolbar.planRunReadiness.blockers.length > 0
      ? toolbar.planRunReadiness.blockers
      : ['readiness_blocked'];

  return blockers.map((blocker) => ({
    id: blocker,
    severity: 'warning',
    message: toolbar.planRunReadiness.summary || toolbar.planStatusSummary,
    detail: blocker,
  }));
}

function buildCanvasOperationalDrawerContribution({
  onPreviewExecutionPlan,
  panels,
  policy,
  toolbar,
}: CanvasOperationalDrawerContributionRegistrarProps): OperationalDrawerContribution {
  const problems = buildReadinessProblems(toolbar);
  const activeRunId = panels.activeRunId ?? null;
  const previewStatus = toolbar.planRunReadiness.status === 'ready' ? 'ready' : 'blocked';

  return {
    source: 'canvas',
    title: 'Canvas operations',
    tabs: policy.tabs.map((id) => ({
      id,
      label: tabLabels[id],
      count:
        id === 'problems'
          ? problems.length
          : id === 'runs' && activeRunId != null
            ? 1
            : id === 'preview' && previewStatus === 'blocked'
              ? 1
              : null,
    })),
    problems: {
      items: problems,
    },
    runs: {
      activeRunId,
      canStartRun: toolbar.canStartRun,
    },
    preview: {
      status: previewStatus,
      summary: toolbar.planRunReadiness.summary || toolbar.planStatusSummary,
      blockers: toolbar.planRunReadiness.blockers,
      canPreview: panels.userPermissions.canPlan && toolbar.canPlanGraph,
      onPreviewExecutionPlan,
    },
  };
}

export function CanvasOperationalDrawerContributionRegistrar({
  onPreviewExecutionPlan,
  panels,
  policy,
  toolbar,
}: CanvasOperationalDrawerContributionRegistrarProps): null {
  const registerOperationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.registerOperationalDrawerContribution
  );
  const clearOperationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.clearOperationalDrawerContribution
  );
  const contribution = useMemo(
    () =>
      buildCanvasOperationalDrawerContribution({
        policy,
        panels,
        toolbar,
        onPreviewExecutionPlan,
      }),
    [onPreviewExecutionPlan, panels, policy, toolbar]
  );

  useEffect(() => {
    registerOperationalDrawerContribution(contribution);
    return () => {
      clearOperationalDrawerContribution(contribution);
    };
  }, [clearOperationalDrawerContribution, contribution, registerOperationalDrawerContribution]);

  return null;
}
