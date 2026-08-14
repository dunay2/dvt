/** Owned concern: resolve global Shell View menu controls from route-family posture. */
import type { ShellNavigationDisposition } from '../../shell/shellNavigationDisposition';

export type ShellViewControlsReadModel = Readonly<{
  showBottomDrawerToggle: boolean;
  showFocusModeToggle: boolean;
}>;

export function resolveShellViewControls(
  disposition: ShellNavigationDisposition
): ShellViewControlsReadModel {
  return {
    showBottomDrawerToggle: true,
    showFocusModeToggle: true,
  };
}
