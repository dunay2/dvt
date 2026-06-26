/** Owned concern: define canvas runtime surface policy without graph mapping logic. */

export type CanvasSurfaceLaunchPoint =
  | 'canvas-context-menu'
  | 'command-palette'
  | 'node-context-menu'
  | 'double-click';

export type CanvasSurfacePlacement = 'contextual-modal' | 'contextual-overlay' | 'bottom-drawer';

export type CanvasGlobalNavigationPolicy = {
  workbenchTabs: 'retired';
  fixedResourcePanel: 'retired';
  fixedInspectorPanel: 'retired';
};

export type CanvasSourceImportSurfacePolicy = {
  placement: 'contextual-modal';
  openedFrom: readonly Extract<
    CanvasSurfaceLaunchPoint,
    'canvas-context-menu' | 'command-palette'
  >[];
};

export type CanvasNodeWorkbenchSurfacePolicy = {
  placement: 'contextual-overlay';
  openedFrom: readonly Extract<CanvasSurfaceLaunchPoint, 'node-context-menu' | 'double-click'>[];
  sections: readonly string[];
};

export type CanvasOperationalDrawerSurfacePolicy = {
  placement: 'bottom-drawer';
  tabs: readonly ['log', 'problems', 'runs', 'preview'];
};

export type CanvasSurfaceStrategy = Readonly<{
  id: string;
  sourceImport: CanvasSourceImportSurfacePolicy;
  nodeWorkbench: CanvasNodeWorkbenchSurfacePolicy;
  operationalDrawer: CanvasOperationalDrawerSurfacePolicy;
  globalNavigation: CanvasGlobalNavigationPolicy;
}>;

export const contextualCanvasGlobalNavigationPolicy: CanvasGlobalNavigationPolicy = {
  workbenchTabs: 'retired',
  fixedResourcePanel: 'retired',
  fixedInspectorPanel: 'retired',
};

export const contextualCanvasOperationalDrawerPolicy: CanvasOperationalDrawerSurfacePolicy = {
  placement: 'bottom-drawer',
  tabs: ['log', 'problems', 'runs', 'preview'],
};
