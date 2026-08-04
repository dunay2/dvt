/** Owned concern: define the static plugin contribution vocabulary consumed by the shell. */
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AppRouteHandle } from '../../bootstrap/routeBootstrapContract';

import type { CanonicalNode, CoreNodeRole, PluginNodeKind } from '../../types/canonical';

// ---------------------------------------------------------------------------
// Localizable strings — v1 uses fallback, v2 loads locale dictionary
// ---------------------------------------------------------------------------

export type LocalizableString = string | { key: string; fallback: string };

export function resolveString(s: LocalizableString, _locale?: string): string {
  if (typeof s === 'string') return s;
  return s.fallback;
}

// ---------------------------------------------------------------------------
// Plugin capabilities
// ---------------------------------------------------------------------------

export type PluginCapabilityId =
  | 'canvas.render' // declares nodeKinds and renderers
  | 'canvas.edit' // can create/edit/delete connections
  | 'canvas.overlay' // contributes overlays to the canvas
  | 'plan.import' // can import an external plan
  | 'plan.export' // can export the current plan
  | 'plan.preview' // can generate a plan preview
  | 'run.start' // can start an execution
  | 'run.observe' // can observe an execution in real-time
  | 'run.cancel' // can cancel an execution
  | 'artifact.read' // can read artifacts
  | 'cost.analyze' // can provide per-node cost data
  | 'lineage.resolve'; // can resolve column lineage

// ---------------------------------------------------------------------------
// Cross-plugin data port declarations
// ---------------------------------------------------------------------------

export interface PluginDataPort {
  portType: 'data.tabular' | 'data.events' | 'data.artifacts' | 'data.custom';
  forRoles: CoreNodeRole[];
}

// ---------------------------------------------------------------------------
// Plugin-level connection rules (intra-plugin)
// ---------------------------------------------------------------------------

export interface PluginConnectionRule {
  sourceKind: PluginNodeKind | '*';
  targetKind: PluginNodeKind | '*';
  allowed: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// View contributions
// ---------------------------------------------------------------------------

export type ShellNavigationPlacement = Readonly<{
  kind: 'shell-nav';
  label: LocalizableString;
  icon: LucideIcon;
  order: number;
  level: 'core' | 'extended' | 'admin';
}>;

export interface ViewContribution {
  pluginId: string;
  id: string;
  path?: string;
  // Lazily loaded component — plugins use React.lazy
  component: React.ComponentType;
  handle?: AppRouteHandle;
  placement?: ShellNavigationPlacement;
}

// ---------------------------------------------------------------------------
// Governed plugin UX dock contributions
// ---------------------------------------------------------------------------

export type PluginContributionAvailability = Readonly<{
  available: boolean;
  reason?: LocalizableString;
}>;

export type PluginContributionAvailabilityContext = Readonly<{
  routeId: string;
  selectedNodeIds: readonly string[];
  activeRunId: string | null;
}>;

export interface RouteHeaderContribution {
  id: string;
  pluginId: string;
  routeId: string;
  label: LocalizableString;
  icon?: LucideIcon;
  order: number;
  slot: 'primary-action' | 'secondary-action' | 'status';
  availability?: (ctx: PluginContributionAvailabilityContext) => PluginContributionAvailability;
}

export interface CommandPaletteContribution {
  id: string;
  pluginId: string;
  title: LocalizableString;
  keywords: readonly string[];
  order: number;
  routeId?: string;
  availability?: (ctx: PluginContributionAvailabilityContext) => PluginContributionAvailability;
  onSelect: (ctx: PluginContributionAvailabilityContext) => void;
}

export interface BottomDiagnosticsContribution {
  id: string;
  pluginId: string;
  label: LocalizableString;
  order: number;
  kind: 'logs' | 'events' | 'traces' | 'problems' | 'output';
  routeId?: string;
  component?: React.ComponentType;
  availability?: (ctx: PluginContributionAvailabilityContext) => PluginContributionAvailability;
}

// ---------------------------------------------------------------------------
// Inspector panel contributions
// ---------------------------------------------------------------------------

export interface InspectorPanelContribution {
  id: string;
  pluginId: string;
  label: LocalizableString;
  icon: LucideIcon;
  order: number;
  shouldShow: (node: CanonicalNode, ctx: InspectorContext) => boolean;
  component: React.ComponentType<InspectorPanelProps>;
}

export type InspectorContext = {
  activeRunId: string | null;
  registeredPlugins: ReadonlySet<string>;
};

export type InspectorPanelProps = {
  node: CanonicalNode;
  activeRunId: string | null;
  onClose: () => void;
  tagsEditor?: ReactNode;
};
