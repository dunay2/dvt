import type { LucideIcon } from 'lucide-react';
import type { AppRouteHandle } from '../../bootstrap/routeBootstrapContract';

import type {
  CanonicalEdge,
  CanonicalNode,
  CoreNodeRole,
  PluginNodeKind,
} from '../../types/canonical';
import type { PluginContext } from './PluginContext';
import type { PluginServices } from './PluginServices';

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

export interface ViewContribution {
  pluginId: string;
  id: string;
  path: string;
  // Lazily loaded component — plugins use React.lazy
  component: React.ComponentType;
  handle: AppRouteHandle;
  nav?: {
    label: LocalizableString;
    icon: LucideIcon;
    order: number;
    level: 'core' | 'extended' | 'admin';
  };
}

// ---------------------------------------------------------------------------
// Toolbar contributions
// ---------------------------------------------------------------------------

export interface ToolbarContribution {
  id: string;
  pluginId: string;
  icon: LucideIcon;
  label: LocalizableString;
  order: number;
  slot: 'left' | 'center' | 'right';
  isActive?: (ctx: ToolbarContext) => boolean;
  onClick: (ctx: ToolbarContext) => void;
}

export type ToolbarContext = {
  selectedNodeIds: string[];
  activeOverlayId: string | null;
};

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
};

// ---------------------------------------------------------------------------
// Plugin error
// ---------------------------------------------------------------------------

export interface PluginError {
  pluginId: string;
  capability?: PluginCapabilityId;
  recoverable: boolean;
  message: string;
  cause?: unknown;
}

// ---------------------------------------------------------------------------
// Plugin status
// ---------------------------------------------------------------------------

export type PluginStatus = 'mounting' | 'active' | 'degraded' | 'failed';

export interface RegisteredPlugin {
  manifest: PluginManifest;
  services: PluginServices;
  status: PluginStatus;
  degradedCapabilities: PluginCapabilityId[];
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Plugin service dependencies (injected by shell at createServices time)
// ---------------------------------------------------------------------------

export interface PluginServiceDeps {
  apiClient: import('../../services/api/createApiClient').ApiClient;
}

// ---------------------------------------------------------------------------
// PluginManifest — the core contract
//
// INVARIANTS (validated by PluginRegistry at registration time):
//   canvas.render   → services.nodeRenderers defined and non-empty
//   canvas.overlay  → services.overlays defined and non-empty
//   plan.import     → services.planHandlers.import defined
//   plan.export     → services.planHandlers.export defined
//   plan.preview    → services.planOperations.preview defined
//   run.start       → services.runOperations.start defined
//   run.observe     → services.runOperations.observe defined
//   run.cancel      → services.runOperations.cancel defined
//   artifact.read   → services.artifactOperations.read defined
//   cost.analyze    → services.costOperations.analyze defined
//   lineage.resolve → services.lineageOperations.resolve defined
// ---------------------------------------------------------------------------

export interface PluginManifest {
  /** Unique identifier in the registry: 'dbt', 'monitoring', 'etl-designer' */
  id: string;
  displayName: LocalizableString;
  /** Semver — informational in v1, enforced in v2 for external plugins */
  version: string;

  /** Hard dependencies — registry validates these are already registered before mount */
  requires?: string[];

  /**
   * Soft dependencies — plugin adapts its behavior if present.
   * Does NOT block registration. Plugin checks via context.getPlugin(id) at runtime.
   */
  optionalRequires?: string[];

  capabilities: PluginCapabilityId[];

  /**
   * Only valid when 'canvas.render' is in capabilities.
   * `previewStepKind`, when declared on a node kind entry, governs how the
   * shell projects that kind into planner-facing generic preview nodes.
   */
  nodeKinds?: import('./NodeRendering').NodeKindManifestEntry[];

  /** Intra-plugin connection rules. Cross-plugin connections use produces/consumes. */
  connectionRules?: PluginConnectionRule[];

  views?: ViewContribution[];
  inspectorPanels?: InspectorPanelContribution[];
  toolbarContributions?: ToolbarContribution[];

  /** Data ports for cross-plugin connections. Only needed for canvas.render plugins. */
  produces?: PluginDataPort[];
  consumes?: PluginDataPort[];

  onMount?: (context: PluginContext) => void | Promise<void>;
  onUnmount?: () => void | Promise<void>;
  onError?: (error: PluginError) => 'recover' | 'degrade' | 'unregister';

  createServices: (deps: PluginServiceDeps) => PluginServices;
}

// ---------------------------------------------------------------------------
// Connection rule result (used by shell evaluateConnection)
// ---------------------------------------------------------------------------

export interface ConnectionRuleResult {
  allowed: boolean;
  reason?: string;
  suggestedEdgeType?: string;
}
