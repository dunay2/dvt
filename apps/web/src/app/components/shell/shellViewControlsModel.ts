/** Owned concern: resolve global Shell View menu controls from route-family posture. */
import type { ShellNavigationDisposition } from '../../shell/shellNavigationDisposition';

export type ShellViewControlsReadModel = Readonly<{
  showInspectorPanelToggle: boolean;
  showBottomDrawerToggle: boolean;
  showFocusModeToggle: boolean;
  showCanvasViewContributionControls: boolean;
}>;

export function resolveShellViewControls(
  disposition: ShellNavigationDisposition
): ShellViewControlsReadModel {
  const isWorkbenchRoute = disposition.reason === 'workbench_route';

  return {
    showInspectorPanelToggle: !isWorkbenchRoute,
    showBottomDrawerToggle: true,
    showFocusModeToggle: true,
    showCanvasViewContributionControls: isWorkbenchRoute,
  };
}
