/** Owned concern: publish Canvas route posture into the shell operational drawer. */
import { useEffect, useMemo, useRef } from 'react';

import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { PlanRunReadinessBlocker } from './canvasPlanReadiness';
import type { CanvasShellPanels, CanvasShellChromeState } from './canvasShell.types';
import type { CanvasExecutionSelectionRecoveryCommands } from '../../types/canvasExecutionSelectionRecovery';
import { buildCanvasOperationalDrawerContribution } from './canvasOperationalDrawerContribution';

type CanvasOperationalDrawerContributionRegistrarProps = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  panels: CanvasShellPanels;
  chromeState: CanvasShellChromeState;
  onPreviewExecutionPlan: () => void;
  onStartRun: () => void;
  selectionRecoveryCommands: CanvasExecutionSelectionRecoveryCommands | null;
}>;

export function CanvasOperationalDrawerContributionRegistrar({
  onPreviewExecutionPlan,
  onStartRun,
  panels,
  policy,
  chromeState,
  selectionRecoveryCommands,
}: CanvasOperationalDrawerContributionRegistrarProps): null {
  const registerOperationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.registerOperationalDrawerContribution
  );
  const clearOperationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.clearOperationalDrawerContribution
  );
  const latestCommandsRef = useRef({ onPreviewExecutionPlan, onStartRun });
  latestCommandsRef.current = { onPreviewExecutionPlan, onStartRun };
  const [logTab, problemsTab, runsTab, previewTab] = policy.tabs;
  const blockerKey = chromeState.planRunReadiness.blockers.join('|');
  const contribution = useMemo(
    () =>
      buildCanvasOperationalDrawerContribution({
        policy: {
          placement: policy.placement,
          tabs: [logTab, problemsTab, runsTab, previewTab],
        },
        canPlan: panels.userPermissions.canPlan,
        activeRunId: panels.activeRunId ?? null,
        canPlanGraph: chromeState.canPlanGraph,
        canStartRun: chromeState.canStartRun,
        planRunReadiness: {
          rail: chromeState.planRunReadiness.rail,
          status: chromeState.planRunReadiness.status,
          summary: chromeState.planRunReadiness.summary,
          blockers:
            blockerKey.length === 0 ? [] : (blockerKey.split('|') as PlanRunReadinessBlocker[]),
        },
        planStatusSummary: chromeState.planStatusSummary,
        selectionRecovery: chromeState.executionSelectionRecovery,
        selectionRecoveryCommands,
        onPreviewExecutionPlan: () => latestCommandsRef.current.onPreviewExecutionPlan(),
        onStartRun: () => latestCommandsRef.current.onStartRun(),
      }),
    [
      blockerKey,
      chromeState.canPlanGraph,
      chromeState.canStartRun,
      chromeState.planRunReadiness.rail,
      chromeState.planRunReadiness.status,
      chromeState.planRunReadiness.summary,
      chromeState.planStatusSummary,
      chromeState.executionSelectionRecovery,
      logTab,
      panels.activeRunId,
      panels.userPermissions.canPlan,
      policy.placement,
      previewTab,
      problemsTab,
      runsTab,
      selectionRecoveryCommands,
    ]
  );

  useEffect(() => {
    registerOperationalDrawerContribution(contribution);
    return () => {
      clearOperationalDrawerContribution(contribution);
    };
  }, [clearOperationalDrawerContribution, contribution, registerOperationalDrawerContribution]);

  return null;
}
