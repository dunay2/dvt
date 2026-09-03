import type React from 'react';

import type { LucideIcon } from 'lucide-react';

import type { CanonicalNode, CoreNodeRole, PluginNodeKind } from '../../types/canonical';
import type { CanonicalRunStatus } from '../../types/engine';
import type { NodeCostData } from './NodeCostData';
import type { GraphNodeAlgebraicDrop } from '../graph/GraphNodeAlgebraicDropZone';
import type {
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumn,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnReorderIdentity,
} from '../graph/graphNodeColumnContracts';
import type {
  GraphNodeCardStrategy,
  GraphNodeOperationalDetail,
} from '../graph/graphNodeCardStrategyContracts';

// ---------------------------------------------------------------------------
// Node decoration — produced by overlays, merged by shell
// ---------------------------------------------------------------------------

export type NodeDecoration = {
  borderColor?: string;
  backgroundColor?: string; // should be semi-transparent
  dimmed?: boolean; // reduces node opacity
};

export type MergedNodeDecoration = NodeDecoration; // same shape, already merged

// ---------------------------------------------------------------------------
// Overlay context — pre-calculated once per render cycle by the shell
// Updated only when activeRun, selectedNodeIds, or cost data changes.
// ---------------------------------------------------------------------------

export type OverlayContext = {
  activeRun: CanonicalRunStatus | null;
  /** nodeId → step execution status string */
  runStatusByNodeId: ReadonlyMap<string, string>;
  costByNodeId: ReadonlyMap<string, NodeCostData>;
  selectedNodeIds: ReadonlySet<string>;
  upstreamOfSelected: ReadonlySet<string>;
  downstreamOfSelected: ReadonlySet<string>;
};

// ---------------------------------------------------------------------------
// Canvas overlay contribution
// ---------------------------------------------------------------------------

export interface CanvasOverlayContribution {
  id: string;
  label: import('./PluginManifest').LocalizableString;
  icon: LucideIcon;
  /**
   * exclusive — mutually exclusive with other exclusive overlays (e.g. runtime, cost)
   * additive  — coexists with other overlays (e.g. impact highlight)
   */
  mode: 'exclusive' | 'additive';
  /**
   * For additive overlays with the same property: higher priority wins.
   * For exclusive overlays: determines which overlay's borderColor takes precedence
   * if multiple exclusive overlays are somehow active (should not happen, but defensive).
   */
  priority: number;

  /**
   * Pure synchronous function — no fetch, no store access.
   * All necessary data is injected via OverlayContext (pre-calculated by shell).
   * Returns null if this node should have no decoration from this overlay.
   */
  nodeDecorator: (node: CanonicalNode, ctx: OverlayContext) => NodeDecoration | null;
}

// ---------------------------------------------------------------------------
// Node renderer — base renderer (one per node, highest priority wins)
// ---------------------------------------------------------------------------

export type GraphNodeRendererData = Readonly<{
  [extension: string]: unknown;
  type?: string;
  typeLabel?: string;
  showColumns?: boolean;
  columns?: readonly GraphNodeColumn[];
  displayTags?: readonly Readonly<{ value: string; label: string }>[];
  canOpenNodeCode?: boolean;
  sourceDataSampleInteractionLabel?: string;
  columnPortDirections?: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  algebraicDrop?: GraphNodeAlgebraicDrop;
  onInspectNode?: (
    nodeId: string,
    preferredTabId?: 'general' | 'inputs-outputs' | 'tests' | 'code' | null
  ) => void;
  onOpenSourceDataSample?: (nodeId: string) => void;
  onOpenOperationalDetails?: (
    detail: GraphNodeOperationalDetail,
    anchorElement: HTMLElement
  ) => void;
  onFilterByTag?: (tag: string) => void;
  getTagFilterLabel?: (tag: string) => string;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onApplyCanvasColumnFunction?: (identity: GraphNodeColumnFunctionApplyIdentity) => void;
  onAddCanvasCalculatedColumn?: (identity: GraphNodeCalculatedColumnIdentity) => void;
  onToggleCanvasColumnOutput?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onReorderCanvasColumnOutput?: (identity: GraphNodeColumnReorderIdentity) => void;
  onColumnDisclosureChange?: (nodeId: string, expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomapColumns?: (nodeId: string, columns: readonly GraphNodeColumn[]) => void;
}>;

export type NodeRendererProps = {
  node: CanonicalNode;
  selected: boolean;
  hovered: boolean;
  /** Pre-merged by shell via mergeDecorations() */
  overlayDecoration: MergedNodeDecoration | null;
  /** Pre-calculated badges — sorted by priority, already filtered for this node */
  badges: NodeBadge[];
  /** Plugin-projected card strategies — sorted by registry contribution order */
  graphNodeCardStrategies: readonly GraphNodeCardStrategy[];
  data: GraphNodeRendererData;
};

export interface NodeRendererRegistration {
  kind: PluginNodeKind;
  /**
   * Higher priority = chosen as the base renderer when multiple plugins
   * register a renderer for the same kind.
   * Tie-break: first registered plugin wins.
   */
  priority: number;
  component: React.ComponentType<NodeRendererProps>;
}

// ---------------------------------------------------------------------------
// Node badge — additive decorators (multiple plugins can badge the same node)
// ---------------------------------------------------------------------------

export type NodeBadge = {
  text?: string;
  icon?: LucideIcon;
  color: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
  position: 'top-right' | 'top-left' | 'bottom-right';
  tooltip?: string;
};

export type BadgeContext = {
  activeRunId: string | null;
  runStatusByNodeId: ReadonlyMap<string, string>;
};

export interface NodeBadgeContribution {
  id: string;
  pluginId: string;
  /** 'all' = badge applies to every node kind */
  forKinds: PluginNodeKind[] | 'all';
  /**
   * Controls render order within badges — does NOT replace the base renderer.
   * Higher priority badges appear first.
   */
  priority: number;
  getBadge: (node: CanonicalNode, ctx: BadgeContext) => NodeBadge | null;
}

// ---------------------------------------------------------------------------
// Node kind manifest entry — declared in PluginContributions.nodeKinds
// Describes the node's canvas appearance for the shell's legend and sidebar.
// The actual rendering is in NodeRendererRegistration.
// ---------------------------------------------------------------------------

export interface NodeKindManifestEntry {
  kind: PluginNodeKind;
  label: import('./PluginManifest').LocalizableString;
  role: CoreNodeRole;
  icon: LucideIcon;
  /** Tailwind border class for the node card */
  borderClass: string;
  /** Hex color for the minimap dot */
  minimapColor: string;
  allowsIncoming: boolean;
  allowsOutgoing: boolean;
  supportsColumns: boolean;
}
