import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_SHELL_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasShell.tsx');
const CANVAS_SHELL_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShell.types.ts'
);
const CANVAS_SHELL_PANELS_BUILDER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellPanelsBuilder.ts'
);
const CANVAS_SHELL_MAIN_PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasShellMainPanel.tsx'
);
const DBT_EXPLORER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/DbtExplorer.tsx'
);
const CANVAS_PLAYGROUND_TAB_STRIP_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundTabStrip.tsx'
);
const CANVAS_PLAYGROUND_TAB_STRIP_TEMPLATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundTabStrip.templates.tsx'
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
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('layout.hostTabStrip');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('CanvasToolbar');
    expect(CANVAS_PLAYGROUND_TAB_STRIP_SOURCE).toContain('CanvasPlaygroundTabStripTemplate');
    expect(CANVAS_PLAYGROUND_TAB_STRIP_TEMPLATE_SOURCE).toContain('canvas-playground-tab-strip');
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

  it('keeps ready-canvas node creation semantically tied to the active canvas runtime catalog', () => {
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      'authoringNodeKinds: readonly NodeKindRegistration[];'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'function resolveExplorerAuthoringNodeKinds('
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'registration.kind === routePresentation.canvasDocument?.kind'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain('userPermissions.canEditEdges');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).not.toContain('getAllNodeKinds');
    expect(CANVAS_SHELL_SOURCE).toContain('nodeKinds={authoringNodeKinds}');
    expect(CANVAS_SHELL_SOURCE).toContain(
      'onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}'
    );
    expect(DBT_EXPLORER_SOURCE).toContain('onCreateAuthoringNode(registration)');
    expect(DBT_EXPLORER_SOURCE).toContain('canCreateAuthoringNode');
  });
});
