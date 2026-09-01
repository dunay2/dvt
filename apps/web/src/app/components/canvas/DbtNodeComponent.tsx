/** Owned concern: render canonical Canvas nodes with plugin decorations and governed node-shell gestures. */
import { useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react';
import { memo, useCallback, type DragEvent } from 'react';

import type {
  BadgeContext,
  MergedNodeDecoration,
  NodeBadge,
  NodeRendererProps,
} from '../../plugins/contracts/NodeRendering';
import { getCanvasGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import { FallbackNodeRenderer } from '../../plugins/FallbackNodeRenderer';
import { PluginContributionBoundary } from '../../plugins/PluginContributionBoundary';
import { mapDbtTypeToKind } from '../../plugins/nodeTypeCatalog.dbt';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import { getNodeBadges, getNodeRenderer, type RuntimeCapabilities } from '../../plugins/registry';
import type { CanonicalNode, CoreNodeRole, PluginNodeKind } from '../../types/canonical';
import { parsePluginNodeKind } from '../../types/canonicalGuards';
import { DbtNodeType, NodeStatus } from '../../types/dbt';
import {
  CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE,
  parseCanvasWorkspaceResourceDragPayload,
} from '../canvasWorkspaceExplorerModel';
import { cn } from '../ui/utils';
import { CanvasNodeShell } from './CanvasNodeShell';
import type { CanvasNodePortCompatibilityView, CanvasNodePortTone } from './CanvasNodePortHandle';
import type { CanvasNodePresentationCopy } from './canvasNodePresentationCopy.contract';
import type { CanvasNodePresentationTruth } from './canvasNodePresentationTruth.contract';
import type {
  GraphNodeColumn,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
} from '../../plugins/graph/GraphNodeColumnSection';
import {
  buildCanvasNodeModelerActionModel,
  type CanvasNodeContextMenuCopy,
  type CanvasNodeContextMenuActionId,
} from './canvasNodeContextMenuModel';

// ---------------------------------------------------------------------------
// Canvas node data
//
// The name is transitional because the active canvas controller still imports
// this file under its historical path. The shape is now shell-owned and
// renderer-agnostic.
// ---------------------------------------------------------------------------

export interface DbtNodeData extends Record<string, unknown> {
  name: string;
  type?: DbtNodeType | string;
  pluginId?: string;
  pluginKind?: PluginNodeKind;
  role?: CoreNodeRole;
  typeLabel?: string;
  status: NodeStatus;
  lastDuration?: number;
  lastCost?: number;
  /** Plugin-projected overlay decoration. */
  overlayDecoration?: MergedNodeDecoration | null;
  showColumns?: boolean;
  columns?: GraphNodeColumn[];
  tags?: string[];
  displayTags?: Array<{ value: string; label: string }>;
  path?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  presentationTruth?: CanvasNodePresentationTruth;
  presentationCopy?: CanvasNodePresentationCopy;
  activeRunId?: string | null;
  runStatusByNodeId?: ReadonlyMap<string, string>;
  projectAccessibleHealthLabel?: (data: DbtNodeData) => string;
  canvasKind?: string;
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph?: boolean;
  selectedForExecution?: boolean;
  onInspectNode?: (
    nodeId: string,
    preferredTabId?: 'general' | 'inputs-outputs' | 'tests' | 'code' | null
  ) => void;
  onOpenSourceDataSample?: (nodeId: string) => void;
  sourceDataSampleInteractionLabel?: string;
  canOpenNodeCode?: boolean;
  onDuplicateNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
  onAttachSchemaToNode?: (nodeId: string, schemaName: string) => void;
  portLabels?: Readonly<{
    target: string;
    source: string;
  }>;
  portCompatibility?: Readonly<{
    target: CanvasNodePortCompatibilityView;
    source: CanvasNodePortCompatibilityView;
  }>;
  contextMenuCopy?: CanvasNodeContextMenuCopy;
  executionSelectionCopy?: Readonly<{ selectLabel: string; deselectLabel: string }>;
  columnDisclosureExpanded?: boolean;
  activeColumnHandleId?: string | null;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  columnPortDirections?: readonly GraphNodeColumnPortDirection[];
  onColumnDisclosureChange?: (nodeId: string, expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomapColumns?: (nodeId: string, columns: readonly GraphNodeColumn[]) => void;
}

type DbtFlowNode = Node<DbtNodeData, 'dbtNode'>;

const DBT_NODE_TYPES = new Set<string>([
  'SOURCE',
  'MODEL',
  'SEED',
  'SNAPSHOT',
  'TEST',
  'EXPOSURE',
  'METRIC',
  'MACRO',
]);

function isDbtNodeType(value: unknown): value is DbtNodeType {
  return typeof value === 'string' && DBT_NODE_TYPES.has(value);
}

const POSITION_CLASSES: Record<NodeBadge['position'], string> = {
  'top-right': '-top-1.5 -right-1.5',
  'top-left': '-top-1.5 -left-1.5',
  'bottom-right': '-bottom-1.5 -right-1.5',
};

const COLOR_CLASSES: Record<NodeBadge['color'], string> = {
  green: 'bg-green-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-400 text-black',
  blue: 'bg-blue-500 text-white',
  gray: 'bg-neutral-500 text-white',
};

const NODE_ROLE_PORT_TONES: Record<CoreNodeRole, CanvasNodePortTone> = {
  input: 'source',
  transform: 'model',
  check: 'test',
  output: 'output',
  control: 'control',
};

function NodeBadgeOverlay({ badge }: Readonly<{ badge: NodeBadge }>) {
  const Icon = badge.icon;
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-10 flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-semibold leading-none',
        POSITION_CLASSES[badge.position],
        COLOR_CLASSES[badge.color]
      )}
      title={badge.tooltip}
    >
      {Icon && <Icon size={8} />}
      {badge.text && <span>{badge.text}</span>}
    </div>
  );
}

function buildCanonicalNode(
  nodeId: string,
  data: DbtNodeData,
  pluginKind: PluginNodeKind,
  role: CoreNodeRole
): CanonicalNode {
  const pluginId = data.pluginId ?? parsePluginNodeKind(pluginKind).pluginId;
  const metadata =
    typeof data.metadata === 'object' && data.metadata !== null ? { ...data.metadata } : {};

  if (data.typeLabel != null) {
    metadata.typeLabel ??= data.typeLabel;
  }
  if (data.columns != null) {
    metadata.columns ??= data.columns;
  }

  return {
    id: nodeId,
    name: data.name,
    pluginId,
    kind: pluginKind,
    role,
    status: data.status,
    tags: data.tags ?? [],
    path: data.path,
    description: data.description,
    lastDuration: data.lastDuration,
    lastCost: data.lastCost,
    metadata,
  };
}

function DbtNodeComponent(props: NodeProps<DbtFlowNode>) {
  const data = props.data as DbtNodeData;
  const { id, selected } = props;
  const updateNodeInternals = useUpdateNodeInternals();
  const handleColumnLayoutChange = useCallback(
    () => updateNodeInternals(id),
    [id, updateNodeInternals]
  );
  const selectedForExecution = data.selectedForExecution ?? selected;
  const pluginKind =
    data.pluginKind ??
    (isDbtNodeType(data.type) ? mapDbtTypeToKind(data.type) : ('dvt:unknown' as PluginNodeKind));
  const kindRegistration = resolveNodeKindRegistration(pluginKind);
  const role = data.role ?? kindRegistration.role;
  const canonicalNode = buildCanonicalNode(id, data, pluginKind, role);
  const badgeCtx: BadgeContext = {
    activeRunId: data.activeRunId ?? null,
    runStatusByNodeId:
      data.runStatusByNodeId instanceof Map ? data.runStatusByNodeId : new Map<string, string>(),
  };
  const Renderer = getNodeRenderer(
    canonicalNode.kind,
    FallbackNodeRenderer,
    data.runtimeCapabilities
  );
  const badges = getNodeBadges(canonicalNode, badgeCtx, data.runtimeCapabilities);
  const graphNodeCardStrategies = getCanvasGraphNodeCardStrategies(
    data.canvasKind,
    data.runtimeCapabilities
  );
  const rendererProps: NodeRendererProps = {
    node: canonicalNode,
    selected,
    hovered: false,
    overlayDecoration: data.overlayDecoration ?? null,
    badges,
    graphNodeCardStrategies,
    data: { ...data, onColumnLayoutChange: handleColumnLayoutChange },
  };

  const shouldShowSourceHandle = kindRegistration.allowsOutgoing;
  const shouldShowTargetHandle = kindRegistration.allowsIncoming;
  const portTone = NODE_ROLE_PORT_TONES[role];
  const canMutateNodeCommands = data.canMutateGraph === true;
  const canAttachSchema = canMutateNodeCommands && typeof data.onAttachSchemaToNode === 'function';
  const contextMenuModel = buildCanvasNodeModelerActionModel({
    target: { kind: 'node', nodeId: id, nodeName: data.name },
    selectedForExecution,
    canMutateGraph: canMutateNodeCommands,
    canDuplicateNode: typeof data.onDuplicateNode === 'function',
    canToggleNodeSelection: typeof data.onToggleNodeSelection === 'function',
    canRemoveNode: typeof data.onRemoveNode === 'function',
    copy: data.contextMenuCopy,
  });

  const handleSchemaResourceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (
      !canAttachSchema ||
      !Array.from(event.dataTransfer.types).includes(CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleSchemaResourceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canAttachSchema) {
      return;
    }

    const payload = parseCanvasWorkspaceResourceDragPayload(
      event.dataTransfer.getData(CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE)
    );
    if (payload == null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    data.onAttachSchemaToNode?.(id, payload.schemaName);
  };

  const handleOpenNode = () => {
    data.onInspectNode?.(id, 'code');
  };

  const handleContextMenuAction = (actionId: CanvasNodeContextMenuActionId) => {
    switch (actionId) {
      case 'duplicate-node':
        data.onDuplicateNode?.(id);
        return;
      case 'select-node-for-execution':
      case 'deselect-node-from-execution':
        data.onToggleNodeSelection?.(id, !selectedForExecution);
        return;
      case 'remove-node':
        data.onRemoveNode?.(id);
        return;
    }
  };

  return (
    <CanvasNodeShell
      contextMenuModel={contextMenuModel}
      shouldShowSourceHandle={shouldShowSourceHandle}
      shouldShowTargetHandle={shouldShowTargetHandle}
      sourceHandleTone={portTone}
      targetHandleTone={portTone}
      sourcePortLabel={data.portLabels?.source}
      targetPortLabel={data.portLabels?.target}
      sourcePortCompatibility={data.portCompatibility?.source}
      targetPortCompatibility={data.portCompatibility?.target}
      onContextMenuAction={handleContextMenuAction}
      onOpenNode={typeof data.onInspectNode === 'function' ? handleOpenNode : undefined}
      onDragOver={handleSchemaResourceDragOver}
      onDrop={handleSchemaResourceDrop}
    >
      <PluginContributionBoundary
        resetKey={`${id}:renderer:${canonicalNode.pluginId}:${canonicalNode.kind}`}
        fallback={<FallbackNodeRenderer {...rendererProps} />}
      >
        <Renderer {...rendererProps} />
      </PluginContributionBoundary>
      {badges.map((badge, index) => (
        <PluginContributionBoundary
          key={`${badge.position}-${badge.text ?? badge.tooltip ?? index}`}
          resetKey={`${id}:badge:${badge.position}:${badge.text ?? badge.tooltip ?? index}`}
          fallback={null}
        >
          <NodeBadgeOverlay badge={badge} />
        </PluginContributionBoundary>
      ))}
    </CanvasNodeShell>
  );
}

export default memo(DbtNodeComponent);
