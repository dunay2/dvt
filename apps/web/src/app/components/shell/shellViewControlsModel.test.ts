import { describe, expect, it } from 'vitest';

import { resolveShellNavigationDisposition } from '../../shell/shellNavigationDisposition';
import { resolveShellViewControls } from './shellViewControlsModel';

describe('resolveShellViewControls', () => {
  it.each(['/canvas', '/canvas/dbt-orders', '/runs/run-1', '/templates'])(
    'treats node workbench as contextual instead of a global view panel on %s',
    (pathname) => {
      const controls = resolveShellViewControls(resolveShellNavigationDisposition(pathname));

      expect(controls.showInspectorPanelToggle).toBe(false);
      expect(controls.showBottomDrawerToggle).toBe(true);
      expect(controls.showFocusModeToggle).toBe(true);
      expect(controls.showCanvasViewContributionControls).toBe(true);
    }
  );

  it('keeps the inspector toggle available on non-workbench routes', () => {
    const controls = resolveShellViewControls(resolveShellNavigationDisposition('/legacy'));

    expect(controls.showInspectorPanelToggle).toBe(true);
    expect(controls.showBottomDrawerToggle).toBe(true);
    expect(controls.showFocusModeToggle).toBe(true);
    expect(controls.showCanvasViewContributionControls).toBe(false);
  });
});
