import { describe, expect, it } from 'vitest';

import { resolveShellNavigationDisposition } from '../../shell/shellNavigationDisposition';
import { resolveShellViewControls } from './shellViewControlsModel';

describe('resolveShellViewControls', () => {
  it.each(['/canvas', '/canvas/dbt-orders', '/runs/run-1', '/templates'])(
    'treats node workbench as contextual instead of a global view panel on %s',
    (pathname) => {
      const controls = resolveShellViewControls(resolveShellNavigationDisposition(pathname));

      expect(controls).not.toHaveProperty('showInspectorPanelToggle');
      expect(controls.showBottomDrawerToggle).toBe(true);
      expect(controls.showFocusModeToggle).toBe(true);
    }
  );

  it('does not expose a global node workbench toggle on non-workbench routes', () => {
    const controls = resolveShellViewControls(resolveShellNavigationDisposition('/legacy'));

    expect(controls).not.toHaveProperty('showInspectorPanelToggle');
    expect(controls.showBottomDrawerToggle).toBe(true);
    expect(controls.showFocusModeToggle).toBe(true);
  });
});
