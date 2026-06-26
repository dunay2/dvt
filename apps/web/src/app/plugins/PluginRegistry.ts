// ---------------------------------------------------------------------------
// PluginRegistry — thin facade over the static PLUGIN_REGISTRY
//
// Route and shell readers use explicit query rails from
// registry.ts instead of deriving placement locally.
// ---------------------------------------------------------------------------

export {
  PLUGIN_REGISTRY,
  getAllViews,
  getRouteViews,
  getShellNavigationViews,
  getDefaultCoreViewPath,
  getAllNodeKinds,
  getAllOverlays,
  mapRunToCanonical,
  getRegisteredPluginIds,
  getNodeRenderer,
  getInspectorPanels,
  getNodeBadges,
  getPluginPortMap,
  getSourceImportContributions,
  getSourceImportOptions,
  type PluginContributions,
  type RuntimeCapabilities,
  type SourceImportContribution,
  type SourceImportOptionContribution,
  type SourceImportOptionId,
} from './registry';
