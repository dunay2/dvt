/** Owned concern: publish Canvas route posture into the shell operational drawer. */
import { useEffect, useMemo } from 'react';

import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerContribution,
  type OperationalDrawerProblem,
  type OperationalDrawerTabId,
} from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasShellPanels, CanvasShellChromeState } from './canvasShell.types';

type CanvasOperationalDrawerContributionRegistrarProps = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  panels: CanvasShellPanels;
  chromeState: CanvasShellChromeState;
  onPreviewExecutionPlan: () => void;
}>;

const tabLabels = {
  log: 'Log',
  problems: 'Problems',
  runs: 'Runs',
  preview: 'Preview',
} satisfies Record<OperationalDrawerTabId, string>;

function buildReadinessProblems(
  chromeState: CanvasShellChromeState
): readonly OperationalDrawerProblem[] {
  if (chromeState.planRunReadiness.status === 'ready') {
    return [];
  }

  const blockers =
    chromeState.planRunReadiness.blockers.length > 0
      ? chromeState.planRunReadiness.blockers
      : ['readiness_blocked'];

  return blockers.map((blocker) => ({
    id: blocker,
    severity: 'warning',
    message: chromeState.planRunReadiness.summary || chromeState.planStatusSummary,
    detail: blocker,
  }));
}

function buildCanvasOperationalDrawerContribution({
  onPreviewExecutionPlan,
  panels,
  policy,
  chromeState,
}: CanvasOperationalDrawerContributionRegistrarProps): OperationalDrawerContribution {
  const problems = buildReadinessProblems(chromeState);
  const activeRunId = panels.activeRunId ?? null;
  const previewStatus = chromeState.planRunReadiness.status === 'ready' ? 'ready' : 'blocked';

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
      canStartRun: chromeState.canStartRun,
    },
    preview: {
      status: previewStatus,
      summary: chromeState.planRunReadiness.summary || chromeState.planStatusSummary,
      blockers: chromeState.planRunReadiness.blockers,
      canPreview: panels.userPermissions.canPlan && chromeState.canPlanGraph,
      onPreviewExecutionPlan,
    },
  };
}

export function CanvasOperationalDrawerContributionRegistrar({
  onPreviewExecutionPlan,
  panels,
  policy,
  chromeState,
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
        chromeState,
        onPreviewExecutionPlan,
      }),
    [onPreviewExecutionPlan, panels, policy, chromeState]
  );

  useEffect(() => {
    registerOperationalDrawerContribution(contribution);
    return () => {
      clearOperationalDrawerContribution(contribution);
    };
  }, [clearOperationalDrawerContribution, contribution, registerOperationalDrawerContribution]);

  return null;
}
