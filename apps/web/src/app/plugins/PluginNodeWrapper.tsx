// ---------------------------------------------------------------------------
// PluginNodeWrapper
//
// Shell-owned ReactFlow node component. Resolves the plugin renderer for the
// node's kind, applies overlay decorations and badges, and wraps the result
// with ReactFlow handles and a context menu.
//
// This is the canonical canvas node type — it replaces the legacy
// DbtNodeComponent (which remains registered under 'dbtNode' for backwards
// compatibility during the transition).
//
// To migrate: change nodeTypes in useCanvasController.ts to:
//   import PluginNodeWrapper from '../../plugins/PluginNodeWrapper';
//   const nodeTypes: NodeTypes = { dbtNode: PluginNodeWrapper };
// ---------------------------------------------------------------------------

import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { Info, MousePointer, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { FallbackNodeRenderer } from './FallbackNodeRenderer';
import { getNodeBadges, getNodeRenderer, type RuntimeCapabilities } from './registry';
import { resolveNodeKindRegistration } from './nodeTypeRegistry';
import type { BadgeContext, MergedNodeDecoration, NodeBadge } from './contracts/NodeRendering';
import type { CanonicalNode, CoreNodeRole, PluginNodeKind } from '../types/canonical';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../components/ui/context-menu';
import { cn } from '../components/ui/utils';

// ---------------------------------------------------------------------------
// Canvas node data shape — shell-owned, plugin-agnostic
// ---------------------------------------------------------------------------

export interface PluginNodeData extends Record<string, unknown> {
  name: string;
  pluginKind: PluginNodeKind;
  role: CoreNodeRole;
  status: string;
  overlayDecoration?: MergedNodeDecoration | null;
  showColumns?: boolean;
  columns?: Array<{ name: string; type: string }>;
  tags?: string[];
  path?: string;
  description?: string;
  lastDuration?: number;
  lastCost?: number;
  metadata?: Record<string, unknown>;
  activeRunId?: string | null;
  runStatusByNodeId?: ReadonlyMap<string, string>;
  runtimeCapabilities?: RuntimeCapabilities;
  onInspectNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
}

type PluginFlowNode = Node<PluginNodeData, 'dbtNode'>;

// ---------------------------------------------------------------------------
// Badge overlay — positioned absolutely over the renderer
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PluginNodeData → CanonicalNode
// ---------------------------------------------------------------------------

function buildCanonicalNode(nodeId: string, data: PluginNodeData): CanonicalNode {
  const pluginId = data.pluginKind.split(':')[0] ?? 'dvt';
  return {
    id: nodeId,
    name: data.name,
    pluginId,
    kind: data.pluginKind,
    role: data.role,
    status: data.status as CanonicalNode['status'],
    tags: data.tags ?? [],
    path: data.path,
    description: data.description,
    lastDuration: data.lastDuration,
    lastCost: data.lastCost,
    metadata: data.metadata,
  };
}

// ---------------------------------------------------------------------------
// PluginNodeWrapper — the ReactFlow node component
// ---------------------------------------------------------------------------

function PluginNodeWrapper(props: NodeProps<PluginFlowNode>) {
  const data = props.data as PluginNodeData;
  const { id, selected } = props;

  const kindRegistration = resolveNodeKindRegistration(data.pluginKind);
  const canonicalNode = buildCanonicalNode(id, data);

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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative">
          {kindRegistration.allowsIncoming && (
            <Handle
              type="target"
              position={Position.Left}
              className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
            />
          )}

          <div className="relative">
            <Renderer
              node={canonicalNode}
              selected={selected}
              hovered={false}
              overlayDecoration={data.overlayDecoration ?? null}
              badges={badges}
              data={data}
            />
            {badges.map((badge, index) => (
              <NodeBadgeOverlay
                key={`${badge.position}-${badge.text ?? badge.tooltip ?? index}`}
                badge={badge}
              />
            ))}
          </div>

          {kindRegistration.allowsOutgoing && (
            <Handle
              type="source"
              position={Position.Right}
              className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
            />
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48 bg-slate-900 border-slate-600 text-slate-50">
        <ContextMenuLabel className="font-mono text-xs">{data.name}</ContextMenuLabel>
        <ContextMenuSeparator className="bg-slate-600" />
        <ContextMenuItem onSelect={() => data.onInspectNode?.(id)}>
          <Info className="size-4" />
          Open inspector panel
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => data.onToggleNodeSelection?.(id, !selected)}
          disabled={!data.onToggleNodeSelection}
        >
          <MousePointer className="size-4" />
          {selected ? 'Deselect node' : 'Select node'}
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-slate-600" />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => data.onRemoveNode?.(id)}
          disabled={!data.onRemoveNode}
        >
          <Trash2 className="size-4" />
          Remove node
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default memo(PluginNodeWrapper);
