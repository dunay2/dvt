import React from 'react';

import type { CanonicalNode, CanonicalRun, PluginNodeKind } from '../types/canonical';
import type {
  BadgeContext,
  CanvasOverlayContribution,
  NodeBadge,
  NodeBadgeContribution,
  NodeRendererProps,
  NodeRendererRegistration,
} from './contracts/NodeRendering';
import type {
  InspectorContext,
  InspectorPanelContribution,
  LocalizableString,
  PluginCapabilityId,
  PluginConnectionRule,
  PluginDataPort,
  ViewContribution,
} from './contracts/PluginManifest';
import type { NodeKindRegistration } from './nodeTypeContracts';

// ---------------------------------------------------------------------------
// PluginContributions — v1 public contract
//
// A plugin author exports one of these. No lifecycle, no registration ceremony.
// The shell reads contributions directly from PLUGIN_REGISTRY.
// ---------------------------------------------------------------------------

export type PluginContributions = {
  id: string;
  displayName: LocalizableString;
  version: string;
  capabilities?: PluginCapabilityId[];

  views?: ViewContribution[];
  overlays?: CanvasOverlayContribution[];
  inspectorPanels?: InspectorPanelContribution[];
  nodeBadges?: NodeBadgeContribution[];
  nodeRenderers?: Map<PluginNodeKind, NodeRendererRegistration>;
  nodeKinds?: NodeKindRegistration[];
  connectionRules?: PluginConnectionRule[];
  produces?: PluginDataPort[];
  consumes?: PluginDataPort[];

  /**
   * Optional run adapter — normalises plugin-specific run data to CanonicalRun.
   * The shell calls mapToCanonical() when it needs a unified view of a run
   * (e.g. for the inspector History panel, overlay context with run status).
   */
  runAdapter?: {
    mapToCanonical: (run: unknown) => CanonicalRun | null;
  };
};

// ---------------------------------------------------------------------------
// PLUGIN_REGISTRY — static composition, order is explicit
//
// Add new plugins here. Order matters only for tie-breaking (first registered
// renderer at equal priority wins). Dependencies are resolved by composition,
// not topological sort.
// ---------------------------------------------------------------------------

// Imported lazily to avoid circular deps during module init
import { dbtContributions } from './dbt/dbtContributions';
import { monitoringContributions } from './monitoring/monitoringContributions';

export const PLUGIN_REGISTRY: PluginContributions[] = [dbtContributions, monitoringContributions];

// ---------------------------------------------------------------------------
// Helper functions — shell reads contributions through these
// ---------------------------------------------------------------------------

export function getAllViews(): ViewContribution[] {
  return PLUGIN_REGISTRY.flatMap((p) => p.views ?? []);
}

export function getNavigationViews(): Array<
  ViewContribution & { nav: NonNullable<ViewContribution['nav']> }
> {
  return getAllViews()
    .filter(
      (
        view
      ): view is ViewContribution & {
        nav: NonNullable<ViewContribution['nav']>;
      } => view.nav != null
    )
    .sort((a, b) => a.nav.order - b.nav.order);
}

export function getDefaultCoreViewPath(): string {
  return getNavigationViews().find((view) => view.nav.level === 'core')?.path ?? '/canvas';
}

export function getAllNodeKinds(): NodeKindRegistration[] {
  return PLUGIN_REGISTRY.flatMap((p) => p.nodeKinds ?? []);
}

export function getAllOverlays(): CanvasOverlayContribution[] {
  return PLUGIN_REGISTRY.flatMap((p) => p.overlays ?? []);
}

/**
 * Returns the highest-priority renderer for the given kind.
 * Falls back to the provided fallback component if none registered.
 */
export function getNodeRenderer(
  kind: PluginNodeKind,
  fallback: React.ComponentType<NodeRendererProps>
): React.ComponentType<NodeRendererProps> {
  let best: { priority: number; component: React.ComponentType<NodeRendererProps> } | null = null;

  for (const plugin of PLUGIN_REGISTRY) {
    const reg = plugin.nodeRenderers?.get(kind);
    if (!reg) continue;
    if (!best || reg.priority > best.priority) {
      best = reg;
    }
  }

  return best?.component ?? fallback;
}

/**
 * Returns all inspector panels that should show for the given node,
 * sorted by order ascending.
 */
export function getInspectorPanels(
  node: CanonicalNode,
  ctx: InspectorContext
): InspectorPanelContribution[] {
  const panels: InspectorPanelContribution[] = [];
  for (const plugin of PLUGIN_REGISTRY) {
    for (const panel of plugin.inspectorPanels ?? []) {
      if (panel.shouldShow(node, ctx)) panels.push(panel);
    }
  }
  panels.sort((a, b) => a.order - b.order);
  return panels;
}

/**
 * Returns all badges applicable to the given node, sorted by priority desc.
 */
export function getNodeBadges(node: CanonicalNode, ctx: BadgeContext): NodeBadge[] {
  const badges: Array<{ priority: number; badge: NodeBadge }> = [];
  for (const plugin of PLUGIN_REGISTRY) {
    for (const contrib of plugin.nodeBadges ?? []) {
      const applies =
        contrib.forKinds === 'all' || contrib.forKinds.includes(node.kind as PluginNodeKind);
      if (!applies) continue;
      const badge = contrib.getBadge(node, ctx);
      if (badge) badges.push({ priority: contrib.priority, badge });
    }
  }
  badges.sort((a, b) => b.priority - a.priority);
  return badges.map((b) => b.badge);
}
