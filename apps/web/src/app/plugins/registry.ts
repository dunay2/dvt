/** Owned concern: project static plugin contributions into route, shell, and workbench query rails.
 * @file apps/web/src/app/plugins/registry.ts
 * @baseline ADR-0056: Web UI authority is server-projected
 * @decision Section 3 - Runtime plugin projection fails closed when backend capability rows are absent
 * @consequence Shell navigation only exposes backend-backed plugins after server projection confirms availability
 * @version 1.0.0
 * @date 2026-05-10
 */
import type React from 'react';

import type { PluginPortDescriptor, PluginPortMap } from './contracts/ConnectionRules';

import type { CanonicalNode, CanonicalRun, PluginNodeKind } from '../types/canonical';
import type {
  BadgeContext,
  CanvasOverlayContribution,
  NodeBadge,
  NodeBadgeContribution,
  NodeRendererProps,
  NodeRendererRegistration,
} from './contracts/NodeRendering';
import type { GraphNodeCardStrategy } from './graph/graphNodeCardStrategyContracts';
import type {
  BottomDiagnosticsContribution,
  CommandPaletteContribution,
  InspectorContext,
  InspectorPanelContribution,
  LocalizableString,
  PluginCapabilityId,
  PluginConnectionRule,
  PluginDataPort,
  RouteHeaderContribution,
  ShellNavigationPlacement,
  ViewContribution,
} from './contracts/PluginManifest';
import { getApplicationLanguage } from '../stores/applicationLanguageStore';
import type { AppRouteHandle } from '../bootstrap/routeBootstrapContract';
import type {
  CanvasKindRegistration,
  CanvasRuntimeRegistration,
  NodeKindRegistration,
} from './nodeTypeContracts';

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
  routeHeaderContributions?: RouteHeaderContribution[];
  commandPaletteContributions?: CommandPaletteContribution[];
  bottomDiagnosticsContributions?: BottomDiagnosticsContribution[];
  overlays?: CanvasOverlayContribution[];
  inspectorPanels?: InspectorPanelContribution[];
  nodeBadges?: NodeBadgeContribution[];
  nodeRenderers?: Map<PluginNodeKind, NodeRendererRegistration>;
  graphNodeCardStrategies?: readonly GraphNodeCardStrategy[];
  nodeKinds?: NodeKindRegistration[];
  canvasKinds?: CanvasRuntimeRegistration[];
  connectionRules?: PluginConnectionRule[];
  produces?: PluginDataPort[];
  consumes?: PluginDataPort[];
  sourceImport?: readonly SourceImportContribution[];

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
import { costContributions } from './cost/costContributions';
import { dbtContributions } from './dbt/dbtContributions';
import { dvtContributions, dvtWarehouseSourceContributions } from './dvt/dvtContributions';
import { monitoringContributions } from './monitoring/monitoringContributions';
import { httpJsonContributions } from './httpJson/httpJsonContributions';
import { objectFilePostgresContributions } from './objectFilePostgres/objectFilePostgresContributions';

export type RuntimeCapabilities = {
  plugins: Record<string, { available: boolean; reason?: string }>;
};

export type SourceImportOptionId = 'includeColumns' | 'addTests' | 'addFreshness';

export type SourceImportOptionContribution = {
  id: SourceImportOptionId;
  label: LocalizableString;
  description: LocalizableString;
  defaultEnabled: boolean;
  order: number;
};

export type SourceImportContribution = {
  id: string;
  pluginId: string;
  sourceType: 'database';
  artifactKind: string;
  options: readonly SourceImportOptionContribution[];
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

function requiresBackendCapability(plugin: PluginContributions): boolean {
  return typeof plugin.backendPluginId === 'string' && plugin.backendPluginId.trim().length > 0;
}

function isPluginAvailableAtRuntime(
  plugin: PluginContributions,
  capabilities?: RuntimeCapabilities
): boolean {
  if (!isPluginEnabled(plugin)) {
    return false;
  }

  if (!capabilities) {
    return !requiresBackendCapability(plugin);
  }

  const capabilityIds = Array.from(
    new Set([plugin.backendPluginId, plugin.id].filter((id): id is string => id != null))
  );
  const runtimeInfos = capabilityIds
    .map((pluginId) => capabilities.plugins[pluginId])
    .filter((info): info is { available: boolean; reason?: string } => info != null);

  if (runtimeInfos.length === 0) {
    return !requiresBackendCapability(plugin);
  }

  return runtimeInfos.every((info) => info.available);
}

const ALL_PLUGIN_CONTRIBUTIONS: PluginContributions[] = [
  dbtContributions,
  httpJsonContributions,
  objectFilePostgresContributions,
  dvtWarehouseSourceContributions,
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

export function getSourceImportContributions(
  capabilities?: RuntimeCapabilities
): SourceImportContribution[] {
  return getRuntimePlugins(capabilities).flatMap((plugin) => plugin.sourceImport ?? []);
}

export function getSourceImportOptions(
  capabilities?: RuntimeCapabilities
): SourceImportOptionContribution[] {
  const optionsById = new Map<SourceImportOptionId, SourceImportOptionContribution>();
  for (const contribution of getSourceImportContributions(capabilities)) {
    for (const option of contribution.options) {
      if (!optionsById.has(option.id)) {
        optionsById.set(option.id, option);
      }
    }
  }

  return Array.from(optionsById.values()).sort((left, right) => left.order - right.order);
}

function compareByOrder<T extends { order: number }>(a: T, b: T): number {
  return a.order - b.order;
}

export type RouteViewContribution = ViewContribution & {
  path: string;
  handle: AppRouteHandle;
};

export type ShellNavigationViewContribution = RouteViewContribution & {
  placement: ShellNavigationPlacement;
};

function hasRouteRegistration(view: ViewContribution): view is RouteViewContribution {
  return typeof view.path === 'string' && view.handle != null;
}

export function getRouteViews(): RouteViewContribution[] {
  return PLUGIN_REGISTRY.flatMap((plugin) => plugin.views ?? []).filter(hasRouteRegistration);
}

export function getShellNavigationViews(
  capabilities?: RuntimeCapabilities
): ShellNavigationViewContribution[] {
  return getAllViews(capabilities)
    .filter(
      (view): view is ShellNavigationViewContribution =>
        hasRouteRegistration(view) && view.placement?.kind === 'shell-nav'
    )
    .sort((a, b) => a.placement.order - b.placement.order);
}

export function getRouteHeaderContributions(
  capabilities?: RuntimeCapabilities
): RouteHeaderContribution[] {
  return getRuntimePlugins(capabilities)
    .flatMap((plugin) => plugin.routeHeaderContributions ?? [])
    .sort(compareByOrder);
}

export function getCommandPaletteContributions(
  capabilities?: RuntimeCapabilities
): CommandPaletteContribution[] {
  return getRuntimePlugins(capabilities)
    .flatMap((plugin) => plugin.commandPaletteContributions ?? [])
    .sort(compareByOrder);
}

export function getBottomDiagnosticsContributions(
  capabilities?: RuntimeCapabilities
): BottomDiagnosticsContribution[] {
  return getRuntimePlugins(capabilities)
    .flatMap((plugin) => plugin.bottomDiagnosticsContributions ?? [])
    .sort(compareByOrder);
}

export function getDefaultCoreViewPath(capabilities?: RuntimeCapabilities): string {
  return (
    getShellNavigationViews(capabilities).find((view) => view.placement.level === 'core')?.path ??
    '/canvas'
  );
}

export function getAllNodeKinds(capabilities?: RuntimeCapabilities): NodeKindRegistration[] {
  return getRuntimePlugins(capabilities).flatMap((p) => p.nodeKinds ?? []);
}

export function getAllCanvasRuntimeRegistrations(
  capabilities?: RuntimeCapabilities
): CanvasRuntimeRegistration[] {
  const runtimePlugins = getRuntimePlugins(capabilities);
  const availablePluginIds = new Set(runtimePlugins.map((plugin) => plugin.id));

  return runtimePlugins.flatMap((plugin) =>
    (plugin.canvasKinds ?? []).map((registration) => {
      const availableNodeKinds = registration.nodeKinds.filter((nodeKind) =>
        availablePluginIds.has(nodeKind.pluginId)
      );

      return availableNodeKinds.length === registration.nodeKinds.length
        ? registration
        : { ...registration, nodeKinds: availableNodeKinds };
    })
  );
}

export function getAllCanvasKinds(
  capabilities?: RuntimeCapabilities,
  locale: string = getApplicationLanguage()
): CanvasKindRegistration[] {
  const language = locale.trim().toLowerCase().split('-')[0] ?? 'en';

  return getAllCanvasRuntimeRegistrations(capabilities).map((registration) => {
    const localizedCopy = registration.localizedCopy?.[language];
    return {
      kind: registration.kind,
      pluginId: registration.pluginId,
      label: localizedCopy?.label ?? registration.label,
      description: localizedCopy?.description ?? registration.description,
      createTitle: localizedCopy?.createTitle ?? registration.createTitle,
      localizedCopy: registration.localizedCopy,
      nodeKinds: registration.nodeKinds,
    };
  });
}

export function getAllOverlays(capabilities?: RuntimeCapabilities): CanvasOverlayContribution[] {
  return getRuntimePlugins(capabilities).flatMap((p) => p.overlays ?? []);
}

export function getGraphNodeCardStrategies(
  capabilities?: RuntimeCapabilities
): GraphNodeCardStrategy[] {
  return getRuntimePlugins(capabilities).flatMap((plugin) => plugin.graphNodeCardStrategies ?? []);
}

export function mapRunToCanonical(
  run: unknown,
  capabilities?: RuntimeCapabilities
): CanonicalRun | null {
  for (const plugin of getRuntimePlugins(capabilities)) {
    const runAdapter = plugin.runAdapter;
    if (!runAdapter) {
      continue;
    }

    try {
      const canonicalRun = runAdapter.mapToCanonical(run);
      if (canonicalRun) {
        return canonicalRun;
      }
    } catch {
      continue;
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
      try {
        if (panel.shouldShow(node, ctx)) panels.push(panel);
      } catch {
        continue;
      }
    }
  }
  panels.sort((a, b) => a.order - b.order);
  return panels;
}

/**
 * Returns a map from pluginId → { connectionRules, produces, consumes }
 * for use by the canvas connection evaluator.
 */
export function getPluginPortMap(capabilities?: RuntimeCapabilities): PluginPortMap {
  const map = new Map<string, PluginPortDescriptor>();

  for (const plugin of getRuntimePlugins(capabilities)) {
    map.set(plugin.id, {
      connectionRules: plugin.connectionRules ?? [],
      produces: plugin.produces ?? [],
      consumes: plugin.consumes ?? [],
    });
  }

  return map;
}

export function getNodeBadges(
  node: CanonicalNode,
  ctx: BadgeContext,
  capabilities?: RuntimeCapabilities
): NodeBadge[] {
  const badges: Array<{ priority: number; badge: NodeBadge }> = [];
  for (const plugin of getRuntimePlugins(capabilities)) {
    for (const contrib of plugin.nodeBadges ?? []) {
      const applies = contrib.forKinds === 'all' || contrib.forKinds.includes(node.kind);
      if (!applies) continue;
      try {
        const badge = contrib.getBadge(node, ctx);
        if (badge) badges.push({ priority: contrib.priority, badge });
      } catch {
        continue;
      }
    }
  }
  badges.sort((a, b) => b.priority - a.priority);
  return badges.map((b) => b.badge);
}
