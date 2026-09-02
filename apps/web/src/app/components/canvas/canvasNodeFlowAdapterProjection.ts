/** Owned concern: project Canvas node data into the existing React Flow adapter boundary. */
import type { NodeRendererProps } from '../../plugins/contracts/NodeRendering';
import { FallbackNodeRenderer } from '../../plugins/FallbackNodeRenderer';
import { getCanvasGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import { mapDbtTypeToKind } from '../../plugins/nodeTypeCatalog.dbt';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import { getNodeBadges, getNodeRenderer } from '../../plugins/registry';
import type { CanonicalNode, CoreNodeRole, PluginNodeKind } from '../../types/canonical';
import { parsePluginNodeKind } from '../../types/canonicalGuards';
import { DbtNodeType } from '../../types/dbt';
import type { CanvasNodePortTone } from './CanvasNodePortHandle';
import {
  buildCanvasNodeModelerActionModel,
  type CanvasNodeContextMenuActionId,
} from './canvasNodeContextMenuModel';
import type { DbtNodeData } from './DbtNodeComponent';

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

const NODE_ROLE_PORT_TONES: Record<CoreNodeRole, CanvasNodePortTone> = {
  input: 'source',
  transform: 'model',
  check: 'test',
  output: 'output',
  control: 'control',
};

function isDbtNodeType(value: unknown): value is DbtNodeType {
  return typeof value === 'string' && DBT_NODE_TYPES.has(value);
}

function buildCanonicalNode(
  nodeId: string,
  data: DbtNodeData,
  pluginKind: PluginNodeKind,
  role: CoreNodeRole
): CanonicalNode {
  const metadata =
    typeof data.metadata === 'object' && data.metadata !== null ? { ...data.metadata } : {};

  if (data.typeLabel != null) metadata.typeLabel ??= data.typeLabel;
  if (data.columns != null) metadata.columns ??= data.columns;

  return {
    id: nodeId,
    name: data.name,
    pluginId: data.pluginId ?? parsePluginNodeKind(pluginKind).pluginId,
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

type ProjectCanvasNodeFlowAdapterArgs = Readonly<{
  nodeId: string;
  data: DbtNodeData;
  selected: boolean;
  onColumnLayoutChange: () => void;
}>;

export function projectCanvasNodeFlowAdapter({
  nodeId,
  data,
  selected,
  onColumnLayoutChange,
}: ProjectCanvasNodeFlowAdapterArgs) {
  const selectedForExecution = data.selectedForExecution ?? selected;
  const pluginKind =
    data.pluginKind ??
    (isDbtNodeType(data.type) ? mapDbtTypeToKind(data.type) : ('dvt:unknown' as PluginNodeKind));
  const kindRegistration = resolveNodeKindRegistration(pluginKind);
  const role = data.role ?? kindRegistration.role;
  const canonicalNode = buildCanonicalNode(nodeId, data, pluginKind, role);
  const badges = getNodeBadges(
    canonicalNode,
    {
      activeRunId: data.activeRunId ?? null,
      runStatusByNodeId:
        data.runStatusByNodeId instanceof Map ? data.runStatusByNodeId : new Map<string, string>(),
    },
    data.runtimeCapabilities
  );
  const Renderer = getNodeRenderer(
    canonicalNode.kind,
    FallbackNodeRenderer,
    data.runtimeCapabilities
  );
  const rendererProps: NodeRendererProps = {
    node: canonicalNode,
    selected,
    hovered: false,
    overlayDecoration: data.overlayDecoration ?? null,
    badges,
    graphNodeCardStrategies: getCanvasGraphNodeCardStrategies(
      data.canvasKind,
      data.runtimeCapabilities
    ),
    data: { ...data, onColumnLayoutChange },
  };
  const canMutateNodeCommands = data.canMutateGraph === true;

  const runAction = (actionId: CanvasNodeContextMenuActionId): void => {
    switch (actionId) {
      case 'open-properties':
        data.onInspectNode?.(nodeId, 'general');
        return;
      case 'duplicate-node':
        data.onDuplicateNode?.(nodeId);
        return;
      case 'select-node-for-execution':
      case 'deselect-node-from-execution':
        data.onToggleNodeSelection?.(nodeId, !selectedForExecution);
        return;
      case 'remove-node':
        data.onRemoveNode?.(nodeId);
    }
  };

  return {
    canonicalNode,
    Renderer,
    rendererProps,
    badges,
    contextMenuModel: buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId, nodeName: data.name },
      selectedForExecution,
      canMutateGraph: canMutateNodeCommands,
      canInspectNode: typeof data.onInspectNode === 'function',
      canDuplicateNode: typeof data.onDuplicateNode === 'function',
      canToggleNodeSelection: typeof data.onToggleNodeSelection === 'function',
      canRemoveNode: typeof data.onRemoveNode === 'function',
      copy: data.contextMenuCopy,
    }),
    shouldShowSourceHandle: kindRegistration.allowsOutgoing,
    shouldShowTargetHandle: kindRegistration.allowsIncoming,
    portTone: NODE_ROLE_PORT_TONES[role],
    canAttachSchema: canMutateNodeCommands && typeof data.onAttachSchemaToNode === 'function',
    openNode: (): void => data.onInspectNode?.(nodeId, 'code'),
    attachSchema: (schemaName: string): void => data.onAttachSchemaToNode?.(nodeId, schemaName),
    runAction,
  };
}
