/** Owned concern: publish Canvas route posture into the shell operational drawer. */
import { useEffect, useMemo } from 'react';

import type { CanvasOperationalDrawerSurfacePolicy } from '../../plugins/canvasSurfaceStrategyContracts';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { CanvasShellPanels, CanvasShellChromeState } from './canvasShell.types';
import { buildCanvasOperationalDrawerContribution } from './canvasOperationalDrawerContribution';

type CanvasOperationalDrawerContributionRegistrarProps = Readonly<{
  policy: CanvasOperationalDrawerSurfacePolicy;
  panels: CanvasShellPanels;
  chromeState: CanvasShellChromeState;
  onPreviewExecutionPlan: () => void;
  onStartRun: () => void;
}>;

export function CanvasOperationalDrawerContributionRegistrar({
  onPreviewExecutionPlan,
  onStartRun,
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
        onStartRun,
      }),
    [onPreviewExecutionPlan, onStartRun, panels, policy, chromeState]
  );

  useEffect(() => {
    registerOperationalDrawerContribution(contribution);
    return () => {
      clearOperationalDrawerContribution(contribution);
    };
  }, [clearOperationalDrawerContribution, contribution, registerOperationalDrawerContribution]);

  return null;
}
