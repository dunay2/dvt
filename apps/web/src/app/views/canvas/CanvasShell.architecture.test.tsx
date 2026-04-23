import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_SHELL_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasShell.tsx');
const CANVAS_SHELL_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShell.types.ts'
);
const CANVAS_SHELL_MAIN_PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasShellMainPanel.tsx'
);

describe('CanvasShell architecture', () => {
  it('uses grouped semantic prop contracts instead of reaching into controller or service seams directly', () => {
    expect(CANVAS_SHELL_SOURCE).toContain(
      'Owned concern: compose the Canvas shell from route-owned presentation contracts.'
    );
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      'Owned concern: define the semantic component contract for CanvasShell.'
    );
    expect(CANVAS_SHELL_SOURCE).toContain('CanvasShellProps');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellLayout');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellPanels');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraph');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellToolbar');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraphCommands');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellChromeCommands');
    expect(CANVAS_SHELL_SOURCE).not.toContain('useCanvasController(');
    expect(CANVAS_SHELL_SOURCE).not.toContain('workspaceService');
    expect(CANVAS_SHELL_SOURCE).not.toContain('useQuery(');
  });

  it('delegates sizing and rail composition to named shell-local seams', () => {
    expect(CANVAS_SHELL_SOURCE).toContain("'./CanvasShellMainPanel'");
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain(
      'function resolveCanvasShellMainPanelDefaultSize('
    );
    expect(CANVAS_SHELL_SOURCE).toContain('function CanvasShellExplorerRail(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellMainSurface(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellViewport(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellMainPanel(');
    expect(CANVAS_SHELL_SOURCE).toContain('function CanvasShellInspectorRail(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain(
      'defaultSize={resolveCanvasShellMainPanelDefaultSize(layout)}'
    );
  });
});
