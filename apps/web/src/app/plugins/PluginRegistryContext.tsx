// ---------------------------------------------------------------------------
// PluginRegistryContext
//
// React context surface for plugin registry access. Provides the same helpers
// as registry.ts but allows test code to inject a filtered or mocked view of
// the registry without patching module-level state.
//
// Production usage:
//   Wrap the app root with <PluginRegistryProvider> (already done implicitly
//   via the static default value — no explicit provider is required unless
//   you need to override the registry in tests).
//
// Test usage:
//   <PluginRegistryProvider contributions={[dbtContributions]}>
//     <ComponentUnderTest />
//   </PluginRegistryProvider>
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  PLUGIN_REGISTRY,
  getNodeRenderer,
  getNodeBadges,
  getInspectorPanels,
  getAllOverlays,
  getPluginPortMap,
  type PluginContributions,
  type RuntimeCapabilities,
} from './registry';
import type { NodeRendererProps, NodeBadge, BadgeContext } from './contracts/NodeRendering';
import type { InspectorContext, InspectorPanelContribution } from './contracts/PluginManifest';
import type { CanonicalNode, PluginNodeKind } from '../types/canonical';
import type { CanvasOverlayContribution } from './contracts/NodeRendering';
import type { PluginPortMap } from './contracts/ConnectionRules';
import { FallbackNodeRenderer } from './FallbackNodeRenderer';

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

export type PluginRegistryContextValue = {
  getNodeRenderer: (kind: PluginNodeKind) => React.ComponentType<NodeRendererProps>;
  getNodeBadges: (
    node: CanonicalNode,
    ctx: BadgeContext,
    capabilities?: RuntimeCapabilities
  ) => NodeBadge[];
  getInspectorPanels: (node: CanonicalNode, ctx: InspectorContext) => InspectorPanelContribution[];
  getAllOverlays: () => CanvasOverlayContribution[];
  getPluginPortMap: (capabilities?: RuntimeCapabilities) => PluginPortMap;
};

// ---------------------------------------------------------------------------
// Default value — delegates to the static module-level registry
// ---------------------------------------------------------------------------

function buildContextValue(contributions: PluginContributions[]): PluginRegistryContextValue {
  // For the static registry, the contributions param is unused — all helpers
  // already close over PLUGIN_REGISTRY. For test overrides this would filter.
  void contributions;
  return {
    getNodeRenderer: (kind) => getNodeRenderer(kind, FallbackNodeRenderer),
    getNodeBadges,
    getInspectorPanels,
    getAllOverlays,
    getPluginPortMap,
  };
}

const defaultValue = buildContextValue(PLUGIN_REGISTRY);

const PluginRegistryContext = createContext<PluginRegistryContextValue>(defaultValue);

// ---------------------------------------------------------------------------
// Provider — only needed when overriding the registry (e.g. in tests)
// ---------------------------------------------------------------------------

export function PluginRegistryProvider({
  contributions = PLUGIN_REGISTRY,
  children,
}: Readonly<{
  contributions?: PluginContributions[];
  children: ReactNode;
}>) {
  const value = useMemo(() => buildContextValue(contributions), [contributions]);
  return <PluginRegistryContext.Provider value={value}>{children}</PluginRegistryContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePluginRegistry(): PluginRegistryContextValue {
  return useContext(PluginRegistryContext);
}
