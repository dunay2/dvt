/** Owned concern: render canonical Canvas nodes with plugin decorations and governed node-shell gestures. */
import { memo, type CSSProperties, type DragEvent } from 'react';
import type { Node, NodeProps } from '@xyflow/react';

import { mapDbtTypeToKind } from '../../plugins/nodeTypeCatalog.dbt';
import {
  getGraphNodeCardStrategies,
  getNodeBadges,
  getNodeRenderer,
  type RuntimeCapabilities,
} from '../../plugins/registry';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type {
  BadgeContext,
  MergedNodeDecoration,
  NodeBadge,
  NodeRendererProps,
} from '../../plugins/contracts/NodeRendering';
import type { CanonicalNode, CoreNodeRole, PluginNodeKind } from '../../types/canonical';
import { parsePluginNodeKind } from '../../types/canonicalGuards';
import { DbtNodeType, NodeStatus } from '../../types/dbt';
import {
  CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE,
  parseCanvasWorkspaceResourceDragPayload,
} from '../canvasWorkspaceExplorerModel';
import { cn } from '../ui/utils';
import { CanvasNodeShell } from './CanvasNodeShell';
import {
  buildCanvasNodeContextMenuModel,
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
  pluginKind?: PluginNodeKind;
  role?: CoreNodeRole;
  typeLabel?: string;
  status: NodeStatus;
  lastDuration?: number;
  lastCost?: number;
  /** Plugin overlay decoration — replaces impactLevel/isHighlighted */
  overlayDecoration?: MergedNodeDecoration | null;
  showColumns?: boolean;
  columns?: Array<{ name: string; type: string }>;
  tags?: string[];
  path?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  activeRunId?: string | null;
  runStatusByNodeId?: ReadonlyMap<string, string>;
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph?: boolean;
  selectedForExecution?: boolean;
  onInspectNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
  onAttachSchemaToNode?: (nodeId: string, schemaName: string) => void;
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

function FallbackNodeRenderer({ node, overlayDecoration }: Readonly<NodeRendererProps>) {
  return (
    <div
      className={cn(
        'min-w-[140px] rounded border border-dashed border-neutral-600 bg-neutral-900 px-3 py-2 text-xs text-neutral-300',
        overlayDecoration?.dimmed && 'opacity-30'
      )}
      {...(overlayDecoration?.borderColor
        ? { style: { borderColor: overlayDecoration.borderColor } as CSSProperties }
        : {})}
    >
      <div className="font-semibold">{node.name}</div>
      <div className="text-[10px] opacity-60">{node.kind}</div>
    </div>
  );
}

function buildCanonicalNode(
  nodeId: string,
  data: DbtNodeData,
  pluginKind: PluginNodeKind,
  role: CoreNodeRole
): CanonicalNode {
  const pluginId = parsePluginNodeKind(pluginKind).pluginId;
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
  const graphNodeCardStrategies = getGraphNodeCardStrategies(data.runtimeCapabilities);

  const shouldShowSourceHandle = kindRegistration.allowsOutgoing;
  const shouldShowTargetHandle = kindRegistration.allowsIncoming;
  const canMutateNodeCommands = data.canMutateGraph === true;
  const canAttachSchema = canMutateNodeCommands && typeof data.onAttachSchemaToNode === 'function';
  const contextMenuModel = buildCanvasNodeContextMenuModel({
    target: { kind: 'node', nodeId: id, nodeName: data.name },
    selectedForExecution,
    canMutateGraph: canMutateNodeCommands,
    canInspectNode: typeof data.onInspectNode === 'function',
    canDuplicateNode: typeof data.onDuplicateNode === 'function',
    canToggleNodeSelection: typeof data.onToggleNodeSelection === 'function',
    canRemoveNode: typeof data.onRemoveNode === 'function',
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

  const handleContextMenuAction = (actionId: CanvasNodeContextMenuActionId) => {
    switch (actionId) {
      case 'inspect-node':
        data.onInspectNode?.(id);
        return;
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
      onContextMenuAction={handleContextMenuAction}
      onDragOver={handleSchemaResourceDragOver}
      onDrop={handleSchemaResourceDrop}
    >
      <Renderer
        node={canonicalNode}
        selected={selected}
        hovered={false}
        overlayDecoration={data.overlayDecoration ?? null}
        badges={badges}
        graphNodeCardStrategies={graphNodeCardStrategies}
        data={data}
      />
      {badges.map((badge, index) => (
        <NodeBadgeOverlay
          key={`${badge.position}-${badge.text ?? badge.tooltip ?? index}`}
          badge={badge}
        />
      ))}
    </CanvasNodeShell>
  );
}

export default memo(DbtNodeComponent);
