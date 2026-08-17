/** Owned concern: publish Canvas route posture into the shell operational drawer. */
import { useEffect, useMemo, useRef } from 'react';

import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { PlanRunReadinessBlocker } from './canvasPlanReadiness';
import type { CanvasShellPanels, CanvasShellChromeState } from './canvasShell.types';
import type { CanvasExecutionSelectionRecoveryCommands } from '../../types/canvasExecutionSelectionRecovery';
import type { OperationalDrawerRunControls } from '../../components/shell/operationalDrawerContributionStore';
import type { OperationalDrawerDataSample } from '../../components/shell/operationalDrawerContributionStore';
import { buildCanvasOperationalDrawerContribution } from './canvasOperationalDrawerContribution';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

type CanvasOperationalDrawerContributionRegistrarProps = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  panels: CanvasShellPanels;
  chromeState: CanvasShellChromeState;
  runControls: OperationalDrawerRunControls | null;
  onPreviewExecutionPlan: () => void;
  onStartRun: () => void;
  selectionRecoveryCommands: CanvasExecutionSelectionRecoveryCommands | null;
  dataSample: OperationalDrawerDataSample;
}>;

export function CanvasOperationalDrawerContributionRegistrar({
  onPreviewExecutionPlan,
  onStartRun,
  panels,
  policy,
  runControls,
  chromeState,
  selectionRecoveryCommands,
  dataSample,
}: CanvasOperationalDrawerContributionRegistrarProps): null {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = useMemo(() => resolveCanvasViewCopy(applicationLanguage), [applicationLanguage]);
  const registerOperationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.registerOperationalDrawerContribution
  );
  const clearOperationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.clearOperationalDrawerContribution
  );
  const latestCommandsRef = useRef({ onPreviewExecutionPlan, onStartRun });
  latestCommandsRef.current = { onPreviewExecutionPlan, onStartRun };
  const [logTab, problemsTab, runsTab, previewTab, dataTab] = policy.tabs;
  const blockerKey = chromeState.planRunReadiness.blockers.join('|');
  const contribution = useMemo(
    () =>
      buildCanvasOperationalDrawerContribution({
        policy: {
          placement: policy.placement,
          tabs: [logTab, problemsTab, runsTab, previewTab, dataTab],
        },
        canPlan: panels.userPermissions.canPlan,
        activeRunId: panels.activeRunId ?? null,
        runControls,
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
        selectionRecoveryMessages: copy,
        dataSample,
        copy,
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
      copy,
      dataSample,
      dataTab,
      logTab,
      panels.activeRunId,
      panels.userPermissions.canPlan,
      policy.placement,
      previewTab,
      problemsTab,
      runControls,
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
