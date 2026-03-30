// ---------------------------------------------------------------------------
// PluginRegistry — thin facade over the static PLUGIN_REGISTRY
//
// The lifecycle-based class from Scaffolding v1 has been replaced by the
// static array in registry.ts. This module re-exports the relevant helpers
// under a stable surface so that code written against the class API can
// migrate incrementally without a big-bang import refactor.
//
// New code should import directly from './registry'.
// ---------------------------------------------------------------------------

export {
  PLUGIN_REGISTRY,
  getAllViews,
  getNavigationViews,
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
} from './registry';
