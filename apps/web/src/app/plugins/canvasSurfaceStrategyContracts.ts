/** Owned concern: define canvas runtime surface policy without graph mapping logic. */

export type CanvasSurfaceLaunchPoint =
  'canvas-context-menu' | 'command-palette' | 'click' | 'double-click';

export type CanvasSurfacePlacement = 'contextual-modal' | 'right-inspector' | 'bottom-drawer';

export type CanvasNodeWorkbenchSectionPolicyId =
  | 'properties'
  | 'metadata'
  | 'columns'
  | 'inputs'
  | 'outputs'
  | 'inputs-outputs'
  | 'lineage'
  | 'tests'
  | 'sql'
  | 'code'
  | 'sink'
  | 'preview'
  | 'runs';

export type CanvasGlobalNavigationPolicy = {
  workbenchTabs: 'retired';
  fixedResourcePanel: 'retired';
  fixedInspectorPanel: 'contextual';
};

export type CanvasSourceImportSurfacePolicy = {
  placement: 'contextual-modal';
  openedFrom: readonly Extract<
    CanvasSurfaceLaunchPoint,
    'canvas-context-menu' | 'command-palette'
  >[];
};

export type CanvasNodeWorkbenchSurfacePolicy = {
  placement: 'right-inspector';
  openedFrom: readonly Extract<CanvasSurfaceLaunchPoint, 'click' | 'double-click'>[];
  sections: readonly CanvasNodeWorkbenchSectionPolicyId[];
};

export type CanvasOperationalDrawerSurfacePolicy = {
  placement: 'bottom-drawer';
  tabs: readonly ('log' | 'problems' | 'runs' | 'preview' | 'data' | 'semantic')[];
};

export type CanvasSurfaceStrategy = Readonly<{
  id: string;
  sourceImport: CanvasSourceImportSurfacePolicy;
  nodeWorkbench: CanvasNodeWorkbenchSurfacePolicy;
  operationalDrawer: CanvasOperationalDrawerSurfacePolicy | null;
  globalNavigation: CanvasGlobalNavigationPolicy;
}>;

export const contextualCanvasGlobalNavigationPolicy: CanvasGlobalNavigationPolicy = {
  workbenchTabs: 'retired',
  fixedResourcePanel: 'retired',
  fixedInspectorPanel: 'contextual',
};

export const contextualCanvasOperationalDrawerPolicy: CanvasOperationalDrawerSurfacePolicy = {
  placement: 'bottom-drawer',
  tabs: ['log', 'problems', 'runs', 'preview', 'data'],
};
