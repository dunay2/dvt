// ---------------------------------------------------------------------------
// PluginRegistry — thin facade over the static PLUGIN_REGISTRY
//
// Route, shell, and workbench readers use explicit query rails from
// registry.ts instead of deriving placement locally.
// ---------------------------------------------------------------------------

export {
  PLUGIN_REGISTRY,
  getAllViews,
  getRouteViews,
  getShellNavigationViews,
  getCanvasWorkbenchTabViews,
  getDefaultCoreViewPath,
  getAllNodeKinds,
  getAllOverlays,
  mapRunToCanonical,
  getRegisteredPluginIds,
  getNodeRenderer,
  getInspectorPanels,
  getNodeBadges,
  getPluginPortMap,
  type PluginContributions,
  type RuntimeCapabilities,
} from './registry';
