/** Owned concern: guard the single Canvas-properties surface and its shared window boundary. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function readAppSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

describe('Canvas properties window architecture', () => {
  it('composes Canvas fields through the shared workbench properties window', () => {
    const canvasPropertiesSource = readAppSource('views/canvas/CanvasSettingsDialog.tsx');
    const sharedWindowSource = readAppSource('components/workbench/WorkbenchPropertiesWindow.tsx');

    expect(canvasPropertiesSource).toContain('WorkbenchPropertiesWindow');
    expect(canvasPropertiesSource).toContain("id: 'appearance'");
    expect(canvasPropertiesSource).toContain("id: 'grid'");
    expect(canvasPropertiesSource).toContain("id: 'layout'");
    expect(canvasPropertiesSource).not.toContain('useUiLayoutStore');
    expect(sharedWindowSource).toContain('DialogContent');
    expect(sharedWindowSource).toContain('TabsList');
    expect(sharedWindowSource).toContain('workbench-properties-apply');
    expect(sharedWindowSource).toContain('workbench-properties-cancel');
  });

  it('does not retain the retired Canvas-specific View menu contribution', () => {
    const shellMenuSource = readAppSource('components/shell/ShellMenu.tsx');

    expect(shellMenuSource).not.toContain('CanvasViewMenuControls');
    expect(shellMenuSource).not.toContain('HexColorPicker');
    expect(shellMenuSource).not.toContain('setCanvasPalette');
    expect(shellMenuSource).not.toContain('setGridSize');
    expect(existsSync(path.join(APP_ROOT, 'views/canvas/CanvasViewMenuControls.tsx'))).toBe(false);
    expect(existsSync(path.join(APP_ROOT, 'views/canvas/canvasViewMenuContributionStore.ts'))).toBe(
      false
    );
  });
});
