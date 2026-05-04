/** Owned concern: render canonical Canvas nodes with plugin decorations and governed node-shell gestures. */
import styles from './DbtNodeComponent.module.css';
import { Handle, Node, NodeProps, Position } from '@xyflow/react';
import { Copy, Info, MousePointer, Trash2 } from 'lucide-react';
import { memo, type CSSProperties } from 'react';

import { mapDbtTypeToKind } from '../../plugins/nodeTypeCatalog.dbt';
import { getNodeBadges, getNodeRenderer, type RuntimeCapabilities } from '../../plugins/registry';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { cn } from '../ui/utils';

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
  onInspectNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onRemoveNode?: (nodeId: string) => void;
  onToggleNodeSelection?: (nodeId: string, shouldSelect: boolean) => void;
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

  const shouldShowSourceHandle = kindRegistration.allowsOutgoing;
  const shouldShowTargetHandle = kindRegistration.allowsIncoming;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn(styles.root, 'relative')}>
          {/* Target Handle (input) */}
          {shouldShowTargetHandle && (
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

          {/* Source Handle (output) */}
          {shouldShowSourceHandle && (
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
          onSelect={() => data.onDuplicateNode?.(id)}
          disabled={!data.onDuplicateNode}
        >
          <Copy className="size-4" />
          Duplicate node
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

export default memo(DbtNodeComponent);
