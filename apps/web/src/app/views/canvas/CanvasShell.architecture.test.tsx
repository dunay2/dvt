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
const CANVAS_TOOLBAR_PRIMARY_CONTROLS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasToolbarPrimaryControls.tsx'
);
const CANVAS_ADD_NODE_PALETTE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasAddNodePalette.tsx'
);
const CANVAS_WORKSPACE_EXPLORER_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/canvasWorkspaceExplorerModel.ts'
);
const DBT_EXPLORER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/DbtExplorer.tsx'
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

  it('keeps shell composition canvas-first without fixed side rails', () => {
    expect(CANVAS_SHELL_SOURCE).toContain("'./CanvasShellMainPanel'");
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('layout.hostTabStrip');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('layout.workbenchTabStrip');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('CanvasToolbar');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('canvas-workbench-chrome');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain(
      'function resolveCanvasShellMainPanelDefaultSize('
    );
    expect(CANVAS_SHELL_SOURCE).not.toContain('function CanvasShellExplorerRail(');
    expect(CANVAS_SHELL_SOURCE).not.toContain('function CanvasShellInspectorRail(');
    expect(CANVAS_SHELL_SOURCE).not.toContain('DbtExplorer');
    expect(CANVAS_SHELL_SOURCE).not.toContain('CanvasInspectorPanel');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('CanvasShellNodeWorkbenchOverlay');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('canvas-node-workbench-overlay');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('CanvasInspectorPanel');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellMainSurface(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellViewport(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellMainPanel(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain(
      'defaultSize={resolveCanvasShellMainPanelDefaultSize()}'
    );
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('onOpenSourceImport');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('CanvasDvtFlowGuide');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('CanvasDbtFlowGuide');
  });

  it('keeps ready-canvas node creation in the viewport context and out of the workspace explorer', () => {
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      'authoringNodeKinds: readonly NodeKindRegistration[];'
    );
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      'explorerResourceGroups: readonly CanvasWorkspaceResourceGroup[];'
    );
    expect(CANVAS_WORKSPACE_EXPLORER_MODEL_SOURCE).toContain(
      'Owned concern: build the Project Workspace Explorer read model from existing resources.'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain('buildCanvasWorkspaceResourceGroups({');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain('nodes: panelState.explorerNodes');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'canvasDocument: routePresentation.canvasDocument'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'function resolveActiveCanvasAuthoringNodeKinds('
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain('function normalizeCanvasKind(');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'const activeCanvasKind = normalizeCanvasKind(routePresentation.canvasDocument.kind)'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'normalizeCanvasKind(registration.kind) === activeCanvasKind'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain('userPermissions.canEditEdges');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).not.toContain('getAllNodeKinds');
    expect(CANVAS_TOOLBAR_PRIMARY_CONTROLS_SOURCE).not.toContain('CanvasAddNodePalette');
    expect(CANVAS_TOOLBAR_PRIMARY_CONTROLS_SOURCE).not.toContain(
      'triggerDataSlot="canvas-toolbar-insert-command"'
    );
    expect(CANVAS_ADD_NODE_PALETTE_SOURCE).toContain('function selectOption(');
    expect(CANVAS_ADD_NODE_PALETTE_SOURCE).toContain('onCreateAuthoringNode(option.registration');
    expect(CANVAS_SHELL_SOURCE).not.toContain('nodeKinds={authoringNodeKinds}');
    expect(CANVAS_SHELL_SOURCE).not.toContain(
      'onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}'
    );
    expect(DBT_EXPLORER_SOURCE).toContain(
      'Owned concern: render the Canvas workspace explorer for existing project resources'
    );
    expect(DBT_EXPLORER_SOURCE).not.toContain('import type { NodeKindRegistration }');
    expect(DBT_EXPLORER_SOURCE).not.toContain('readonly NodeKindRegistration');
    expect(DBT_EXPLORER_SOURCE).not.toContain('nodeKinds');
    expect(DBT_EXPLORER_SOURCE).not.toContain('onCreateAuthoringNode');
    expect(DBT_EXPLORER_SOURCE).not.toContain('nodes: CanonicalNode[]');
    expect(DBT_EXPLORER_SOURCE).not.toContain('Add node');
  });
});
