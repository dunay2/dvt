/** Project the Canvas owners onto the shell rail and delegate explicit Canvas entry. */
import { useLocation, useMatch } from 'react-router';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { isCanvasModelRouteEntry } from '../../views/canvas/CanvasCodeRouteEntry';
import { useCanvasWorkspaceMenuContributionStore } from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import type { ShellOperationalView } from './types';

export function useShellCanvasNavigation(operationalView: ShellOperationalView | null | undefined) {
  const { onCanvasRoute, canActivateCanvas } = useCanvasRailRoute();
  const expanded = useUiLayoutStore((state) => state.canvasExplorer.mode === 'expanded');
  const dispatch = useUiLayoutStore((state) => state.dispatchCanvasExplorer);
  const contributions = useCanvasRailContributions();
  return {
    onCanvasRoute,
    canActivateCanvas,
    modelTab: contributions.modelTab,
    modelBrowser: contributions.modelBrowser,
    ...projectCanvasRailPosture(contributions, operationalView, canActivateCanvas, expanded),
    activateCanvas: () => activateCanvasDestination(operationalView, contributions, dispatch),
  };
}

function projectCanvasRailPosture(
  { codeTab, modelTab, modelBrowser }: ReturnType<typeof useCanvasRailContributions>,
  operationalView: ShellOperationalView | null | undefined,
  canActivateCanvas: boolean,
  expanded: boolean
) {
  const codeActive = codeTab?.active === true;
  const workbenchForeground = operationalView == null && !codeActive;
  return {
    workbenchForeground,
    canvasExpanded: canActivateCanvas ? expanded && !codeActive : undefined,
    canvasActive:
      workbenchForeground && canActivateCanvas && !modelTab?.active && modelBrowser?.mode == null,
  };
}

function useCanvasRailRoute(): { onCanvasRoute: boolean; canActivateCanvas: boolean } {
  const onCanvasRoute = useMatch('/canvas/*') != null;
  const location = useLocation();
  return {
    onCanvasRoute,
    canActivateCanvas: onCanvasRoute && !isCanvasModelRouteEntry(location.state),
  };
}

function activateCanvasDestination(
  operationalView: ShellOperationalView | null | undefined,
  { codeTab, modelTab, modelBrowser }: ReturnType<typeof useCanvasRailContributions>,
  dispatch: ReturnType<typeof useUiLayoutStore.getState>['dispatchCanvasExplorer']
): void {
  if (operationalView != null) return;
  // Opening Elements retains the underlying editor session.
  if (modelBrowser?.mode != null) modelBrowser.onCanvas();
  else if (codeTab?.active === true) codeTab.onCanvas();
  else if (modelTab?.active === true) modelTab.onCanvas();
  dispatch({ type: 'expand' });
}

function useCanvasRailContributions() {
  const contribution = useCanvasWorkspaceMenuContributionStore((state) => state.contribution);
  const registeredModelTab = useCanvasWorkspaceMenuContributionStore((state) => state.modelTab);
  const registeredBrowser = useCanvasWorkspaceMenuContributionStore((state) => state.modelBrowser);
  const activeCanvasId = contribution?.activeCanvas?.id;
  return {
    codeTab: contribution?.codeTab,
    modelTab: activeCanvasId === registeredModelTab?.canvasId ? registeredModelTab : null,
    modelBrowser: activeCanvasId === registeredBrowser?.canvasId ? registeredBrowser : null,
  };
}
