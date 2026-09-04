import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
const CANVAS_SHELL_LAYOUT_BUILDER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellLayoutBuilder.tsx'
);
const CANVAS_SHELL_MAIN_PANEL_FRAME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasShellMainPanelFrame.tsx'
);
const CANVAS_VIEWPORT_SURFACE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewportSurfaceView.tsx'
);
const CANVAS_ROUTE_SOURCE = readArchitectureSiblingSource(import.meta.dirname, '../Canvas.tsx');
const CANVAS_SHELL_PROPS_BUILDER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellPropsBuilder.tsx'
);
const CANVAS_SHELL_BUILDER_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasShellBuilder.types.ts'
);
const CANVAS_WORKSPACE_EXPLORER_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/canvasWorkspaceExplorerModel.ts'
);
const LEGACY_CANVAS_ADD_NODE_PALETTE_PATH = resolve(
  import.meta.dirname,
  'CanvasAddNodePalette.tsx'
);
const SHELL_MENU_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/ShellMenu.tsx'
);
const LEGACY_WAREHOUSE_SOURCE_EXPLORER_PATH = resolve(
  import.meta.dirname,
  '../../components/WarehouseSourceExplorer.tsx'
);
const LEGACY_FIXED_INSPECTOR_PATHS = [
  'CanvasInspectorPanel.tsx',
  'CanvasInspectorPanel.authoring.test.tsx',
  'CanvasInspectorPanel.canvasProperties.test.tsx',
  'CanvasInspectorPanel.metadata.test.tsx',
  'CanvasInspectorPanel.modelerActions.test.tsx',
  'CanvasInspectorPanel.pluginTabs.test.tsx',
  'CanvasInspectorPanel.test.support.tsx',
  'CanvasInspectorPanel.test.tsx',
].map((fileName) => resolve(import.meta.dirname, fileName));
const LEGACY_PASSIVE_INSPECTOR_PATHS = ['InspectorPanel.tsx', 'InspectorPanel.test.tsx'].map(
  (fileName) => resolve(import.meta.dirname, '../../components', fileName)
);
const LEGACY_CANVAS_TOOLBAR_PATHS = [
  'CanvasToolbar.tsx',
  'CanvasToolbarPrimaryControls.tsx',
  'CanvasToolbarDraftStatus.tsx',
  'canvasToolbarViewModel.ts',
].map((fileName) => resolve(import.meta.dirname, fileName));

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
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellChromeState');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('export type CanvasShellToolbar');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('chromeState: CanvasShellChromeState;');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('toolbar: CanvasShell');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      "import type { CanvasDraftStatusState } from './canvasDraftStatusState';"
    );
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('draftStatusState: CanvasDraftStatusState;');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('CanvasDraftToolbarState');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('draftToolbarState');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('chromeState: CanvasShellChromeState;');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('toolbar: CanvasShell');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain(
      'draftStatusState={chromeState.draftStatusState}'
    );
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('chromeState.draftToolbarState');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellGraphCommands');
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain('export type CanvasShellChromeCommands');
    expect(CANVAS_SHELL_BUILDER_TYPES_SOURCE).toContain('CanvasShellChromeStateBuilderArgs');
    expect(CANVAS_SHELL_BUILDER_TYPES_SOURCE).not.toContain('CanvasShellToolbarBuilderArgs');
    expect(CANVAS_SHELL_PROPS_BUILDER_SOURCE).toContain("from './canvasShellChromeStateBuilder'");
    expect(CANVAS_SHELL_PROPS_BUILDER_SOURCE).not.toContain('canvasShellToolbarBuilder');
    expect(CANVAS_SHELL_SOURCE).not.toContain('useCanvasController(');
    expect(CANVAS_SHELL_SOURCE).not.toContain('workspaceService');
    expect(CANVAS_SHELL_SOURCE).not.toContain('useQuery(');
  });

  it('keeps shell composition canvas-first without fixed side rails', () => {
    expect(CANVAS_SHELL_SOURCE).toContain("'./CanvasShellMainPanel'");
    expect(CANVAS_SHELL_SOURCE).not.toContain("'./CanvasContextMenuLayer'");
    expect(CANVAS_SHELL_SOURCE).not.toContain('<CanvasContextMenuLayer');
    expect(CANVAS_SHELL_SOURCE).not.toContain('<CanvasContextMenuView');
    expect(CANVAS_VIEWPORT_SURFACE_SOURCE).toContain('<CanvasContextMenuView');
    expect(CANVAS_VIEWPORT_SURFACE_SOURCE).toContain(
      'contextMenuPresenter.closeContextMenu({ preserveCatalog: true })'
    );
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
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellMainSurface(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('CanvasShellOverlayCenterSurfaceFrame');
    expect(CANVAS_SHELL_MAIN_PANEL_FRAME_SOURCE).not.toContain('overlayContent');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellViewport(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('function CanvasShellMainPanel(');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('resolveCanvasShellMainPanelDefaultSize()');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).toContain('onOpenSourceImport');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('CanvasDvtFlowGuide');
    expect(CANVAS_SHELL_MAIN_PANEL_SOURCE).not.toContain('CanvasDbtFlowGuide');
    expect(CANVAS_SHELL_LAYOUT_BUILDER_SOURCE).not.toContain('CanvasPlaygroundTabStrip');
    expect(CANVAS_SHELL_LAYOUT_BUILDER_SOURCE).not.toContain('hostTabStrip:');
    expect(CANVAS_SHELL_LAYOUT_BUILDER_SOURCE).not.toContain('hostTabState:');
    expect(CANVAS_SHELL_LAYOUT_BUILDER_SOURCE).not.toContain('routePresentation.canvasTabState');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('hostTabStrip?:');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('workbenchTabStrip?:');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('CanvasPlaygroundTabState');
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('hostTabState:');
  });

  it('names execution-preview commands by product intent instead of legacy plan chrome', () => {
    for (const source of [CANVAS_SHELL_SOURCE, CANVAS_SHELL_TYPES_SOURCE]) {
      expect(source).toContain('onPreviewExecutionPlan');
    }

    for (const source of [
      CANVAS_SHELL_SOURCE,
      CANVAS_SHELL_TYPES_SOURCE,
      CANVAS_SHELL_MAIN_PANEL_SOURCE,
    ]) {
      expect(source).not.toMatch(/\bonPlan\b/);
    }
    expect(CANVAS_SHELL_PROPS_BUILDER_SOURCE).toContain('handlePreviewExecutionPlan');
    expect(CANVAS_SHELL_PROPS_BUILDER_SOURCE).not.toMatch(/\bhandlePlan\b/);
  });

  it('keeps retired workbench tab composition out of the Canvas route', () => {
    expect(CANVAS_ROUTE_SOURCE).not.toContain('CanvasWorkbenchTabStrip');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('CanvasWorkbenchTabPanel');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('buildCanvasWorkbenchTabsReadModel');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('parseCanvasWorkbenchRouteState');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('resolveCanvasWorkbenchTabSelectionCommand');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('getCanvasWorkbenchTabViews');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('buildCanvasWorkbenchLogEntries');
  });

  it('keeps ready-canvas node creation in the viewport context and out of the workspace explorer', () => {
    expect(CANVAS_SHELL_TYPES_SOURCE).toContain(
      'authoringNodeKinds: readonly NodeKindRegistration[];'
    );
    expect(CANVAS_SHELL_TYPES_SOURCE).not.toContain('explorerResourceGroups');
    expect(CANVAS_SHELL_PROPS_BUILDER_SOURCE).not.toContain('buildCanvasWorkspaceResourceGroups');
    expect(CANVAS_SHELL_BUILDER_TYPES_SOURCE).not.toContain('explorerNodes');
    expect(CANVAS_WORKSPACE_EXPLORER_MODEL_SOURCE).toContain(
      'Owned concern: serialize contextual project-resource drag payloads for Canvas attachments.'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).not.toContain('buildCanvasWorkspaceResourceGroups');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).not.toContain('panelState.explorerNodes');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'activeCanvasId: routePresentation.activeCanvasId'
    );
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain('activeCanvas,');
    expect(CANVAS_SHELL_PANELS_BUILDER_SOURCE).toContain(
      'canvasDocuments: routePresentation.canvasDocuments'
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
    expect(existsSync(LEGACY_CANVAS_ADD_NODE_PALETTE_PATH)).toBe(false);
    expect(CANVAS_SHELL_SOURCE).not.toContain('CanvasAddNodePalette');
    expect(CANVAS_SHELL_SOURCE).not.toContain('nodeKinds={authoringNodeKinds}');
    expect(CANVAS_SHELL_SOURCE).not.toContain(
      'onCreateAuthoringNode={graphCommands.onCreateAuthoringNode}'
    );
  });

  it('keeps contextual source import hosted outside the shell composition state', () => {
    expect(CANVAS_SHELL_SOURCE).toContain('CanvasSourceImportDialogHost');
    expect(CANVAS_SHELL_SOURCE).toContain('useCanvasSourceImportDialogState');
    expect(CANVAS_SHELL_SOURCE).not.toContain(
      "import SourceImportWizard from '../../components/SourceImportWizard'"
    );
    expect(CANVAS_SHELL_SOURCE).not.toContain('const [dataRegistryOpen');
    expect(CANVAS_SHELL_SOURCE).not.toContain('const [dataRegistryInitialSelection');
    expect(CANVAS_SHELL_SOURCE).not.toContain('const [dataRegistryPlacement');
  });

  it('does not expose a legacy fixed explorer panel from the global view menu', () => {
    expect(SHELL_MENU_SOURCE).not.toContain('explorerPanelVisible');
    expect(SHELL_MENU_SOURCE).not.toContain('toggleExplorerPanel');
    expect(SHELL_MENU_SOURCE).not.toContain('copy.explorerPanel');
    expect(SHELL_MENU_SOURCE).not.toContain('PanelLeftClose');
  });

  it('retires the legacy fixed warehouse source explorer component', () => {
    expect(existsSync(LEGACY_WAREHOUSE_SOURCE_EXPLORER_PATH)).toBe(false);
  });

  it('retires the unmounted legacy Canvas toolbar surface', () => {
    for (const toolbarPath of LEGACY_CANVAS_TOOLBAR_PATHS) {
      expect(existsSync(toolbarPath), toolbarPath).toBe(false);
    }
  });

  it('retires fixed inspector files after the contextual NodeWorkbench becomes the owner', () => {
    for (const inspectorPath of [
      ...LEGACY_FIXED_INSPECTOR_PATHS,
      ...LEGACY_PASSIVE_INSPECTOR_PATHS,
    ]) {
      expect(existsSync(inspectorPath), inspectorPath).toBe(false);
    }
  });
});
