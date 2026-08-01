/** Owned concern: resolve global Shell View menu controls from route-family posture. */
import type { ShellNavigationDisposition } from '../../shell/shellNavigationDisposition';

export type ShellViewControlsReadModel = Readonly<{
  showBottomDrawerToggle: boolean;
  showFocusModeToggle: boolean;
  showCanvasViewContributionControls: boolean;
}>;

export function resolveShellViewControls(
  disposition: ShellNavigationDisposition
): ShellViewControlsReadModel {
  const isWorkbenchRoute = disposition.reason === 'workbench_route';

  return {
    showBottomDrawerToggle: true,
    showFocusModeToggle: true,
    showCanvasViewContributionControls: isWorkbenchRoute,
  };
}
