import React from 'react';
import { DollarSign } from 'lucide-react';

import type { PluginPortDescriptor, PluginPortMap } from './contracts/ConnectionRules';
import { COST_ROUTE_BOOTSTRAP_HANDLE } from '../views/cost/costRouteBootstrap';

import type { CanonicalNode, CanonicalRun, PluginNodeKind } from '../types/canonical';
import type { NodeCostData } from './contracts/PluginServices';
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
  kind?: 'core' | 'optional';
  envFlag?: string;
  backendPluginId?: string;
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
import { dvtContributions } from './dvt/dvtContributions';
import { monitoringContributions } from './monitoring/monitoringContributions';

export type RuntimeCapabilities = {
  plugins: Record<string, { available: boolean; reason?: string }>;
};

function getEnvFlagValue(envFlag: string | undefined): string | boolean | undefined {
  if (!envFlag) {
    return undefined;
  }

  return (import.meta.env as Record<string, string | boolean | undefined>)[envFlag];
}

function isPluginEnabled(plugin: PluginContributions): boolean {
  const envFlagValue = getEnvFlagValue(plugin.envFlag);
  if (envFlagValue == null) {
    return true;
  }

  return envFlagValue !== 'false' && envFlagValue !== false;
}

function isPluginAvailableAtRuntime(
  plugin: PluginContributions,
  capabilities?: RuntimeCapabilities
): boolean {
  if (!isPluginEnabled(plugin)) {
    return false;
  }

  if (!plugin.backendPluginId || !capabilities) {
    return true;
  }

  const info = capabilities.plugins[plugin.backendPluginId];
  if (!info) {
    return true;
  }

  return info.available;
}

function resolveCostDecoration(costData: NodeCostData | undefined) {
  if (!costData || costData.cost <= 0) {
    return null;
  }

  if (costData.cost >= 0.4) {
    return { borderColor: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.18)' };
  }

  if (costData.cost >= 0.2) {
    return { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.18)' };
  }

  return { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.14)' };
}

const costContributions: PluginContributions = {
  id: 'cost',
  displayName: 'Cost',
  version: '1.0.0',
  kind: 'optional',
  envFlag: 'VITE_PLUGIN_COST',
  backendPluginId: 'cost',
  capabilities: ['cost.analyze', 'canvas.overlay'],
  views: [
    {
      pluginId: 'cost',
      id: 'cost.dashboard',
      path: '/cost',
      component: React.lazy(() => import('../views/CostView')),
      handle: {
        routeBootstrap: COST_ROUTE_BOOTSTRAP_HANDLE,
      },
      nav: {
        label: 'Cost',
        icon: DollarSign,
        order: 25,
        level: 'extended',
      },
    },
  ],
  overlays: [
    {
      id: 'cost',
      label: 'Cost Heatmap',
      icon: DollarSign,
      mode: 'exclusive',
      priority: 90,
      nodeDecorator: (node, ctx) => resolveCostDecoration(ctx.costByNodeId.get(node.id)),
    },
  ],
  consumes: [{ portType: 'data.tabular', forRoles: ['transform', 'output'] }],
};

const ALL_PLUGIN_CONTRIBUTIONS: PluginContributions[] = [
  dbtContributions,
  dvtContributions,
  monitoringContributions,
  costContributions,
];

export const PLUGIN_REGISTRY: PluginContributions[] =
  ALL_PLUGIN_CONTRIBUTIONS.filter(isPluginEnabled);

export function getRuntimePlugins(capabilities?: RuntimeCapabilities): PluginContributions[] {
  return PLUGIN_REGISTRY.filter((plugin) => isPluginAvailableAtRuntime(plugin, capabilities));
}

// ---------------------------------------------------------------------------
// Helper functions — shell reads contributions through these
// ---------------------------------------------------------------------------

export function getAllViews(capabilities?: RuntimeCapabilities): ViewContribution[] {
  return getRuntimePlugins(capabilities).flatMap((p) => p.views ?? []);
}

export function getNavigationViews(
  capabilities?: RuntimeCapabilities
): Array<ViewContribution & { nav: NonNullable<ViewContribution['nav']> }> {
  return getAllViews(capabilities)
    .filter(
      (
        view
      ): view is ViewContribution & {
        nav: NonNullable<ViewContribution['nav']>;
      } => view.nav != null
    )
    .sort((a, b) => a.nav.order - b.nav.order);
}

export function getDefaultCoreViewPath(capabilities?: RuntimeCapabilities): string {
  return (
    getNavigationViews(capabilities).find((view) => view.nav.level === 'core')?.path ?? '/canvas'
  );
}

export function getAllNodeKinds(capabilities?: RuntimeCapabilities): NodeKindRegistration[] {
  return getRuntimePlugins(capabilities).flatMap((p) => p.nodeKinds ?? []);
}

export function getAllOverlays(capabilities?: RuntimeCapabilities): CanvasOverlayContribution[] {
  return getRuntimePlugins(capabilities).flatMap((p) => p.overlays ?? []);
}

export function mapRunToCanonical(
  run: unknown,
  capabilities?: RuntimeCapabilities
): CanonicalRun | null {
  for (const plugin of getRuntimePlugins(capabilities)) {
    const canonicalRun = plugin.runAdapter?.mapToCanonical(run) ?? null;
    if (canonicalRun) {
      return canonicalRun;
    }
  }

  return null;
}

export function getRegisteredPluginIds(capabilities?: RuntimeCapabilities): ReadonlySet<string> {
  return new Set(getRuntimePlugins(capabilities).map((plugin) => plugin.id));
}

/**
 * Returns the highest-priority renderer for the given kind.
 * Falls back to the provided fallback component if none registered.
 */
export function getNodeRenderer(
  kind: PluginNodeKind,
  fallback: React.ComponentType<NodeRendererProps>,
  capabilities?: RuntimeCapabilities
): React.ComponentType<NodeRendererProps> {
  let best: { priority: number; component: React.ComponentType<NodeRendererProps> } | null = null;

  for (const plugin of getRuntimePlugins(capabilities)) {
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
  ctx: InspectorContext,
  capabilities?: RuntimeCapabilities
): InspectorPanelContribution[] {
  const panels: InspectorPanelContribution[] = [];
  for (const plugin of getRuntimePlugins(capabilities)) {
    for (const panel of plugin.inspectorPanels ?? []) {
      if (panel.shouldShow(node, ctx)) panels.push(panel);
    }
  }
  panels.sort((a, b) => a.order - b.order);
  return panels;
}

/**
 * Returns a map from pluginId → { connectionRules, produces, consumes }
 * for use by the canvas connection evaluator.
 */
export function getPluginPortMap(): PluginPortMap {
  const map = new Map<string, PluginPortDescriptor>();

  for (const plugin of PLUGIN_REGISTRY) {
    map.set(plugin.id, {
      connectionRules: plugin.connectionRules ?? [],
      produces: plugin.produces ?? [],
      consumes: plugin.consumes ?? [],
    });
  }

  return map;
}

export function getNodeBadges(node: CanonicalNode, ctx: BadgeContext): NodeBadge[] {
  const badges: Array<{ priority: number; badge: NodeBadge }> = [];
  for (const plugin of PLUGIN_REGISTRY) {
    for (const contrib of plugin.nodeBadges ?? []) {
      const applies = contrib.forKinds === 'all' || contrib.forKinds.includes(node.kind);
      if (!applies) continue;
      const badge = contrib.getBadge(node, ctx);
      if (badge) badges.push({ priority: contrib.priority, badge });
    }
  }
  badges.sort((a, b) => b.priority - a.priority);
  return badges.map((b) => b.badge);
}
