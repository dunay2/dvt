import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_SHELL_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasShell.tsx');
const CANVAS_SHELL_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShell.types.ts'
);

describe('CanvasShell architecture', () => {
  it('uses grouped semantic prop contracts instead of reaching into controller or service seams directly', () => {
    expect(CANVAS_SHELL_SOURCE).toContain(
      'Owned concern: compose the Canvas shell layout from grouped view-model slices.'
    );
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      'Owned concern: define the grouped semantic prop contract for the Canvas shell component.'
    );
    expect(CANVAS_SHELL_SOURCE).toContain('CanvasShellExplorerRail');
    expect(CANVAS_SHELL_SOURCE).toContain('CanvasShellMainPanel');
    expect(CANVAS_SHELL_SOURCE).toContain('CanvasShellInspectorRail');
    expect(CANVAS_SHELL_SOURCE).toContain('CanvasShellProps');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellLayout');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellPanels');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraph');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraphCommands');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellChromeCommands');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellToolbar');
    expect(CANVAS_SHELL_SOURCE).not.toContain('useCanvasController(');
    expect(CANVAS_SHELL_SOURCE).not.toContain('workspaceService');
    expect(CANVAS_SHELL_SOURCE).not.toContain('useQuery(');
  });
});
