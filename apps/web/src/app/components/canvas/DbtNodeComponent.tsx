/** Owned concern: render canonical Canvas nodes with plugin decorations and governed node-shell gestures. */
import { useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react';
import { memo, useCallback, type DragEvent } from 'react';

import type { MergedNodeDecoration } from '../../plugins/contracts/NodeRendering';
import { FallbackNodeRenderer } from '../../plugins/FallbackNodeRenderer';
import { PluginContributionBoundary } from '../../plugins/PluginContributionBoundary';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CoreNodeRole, PluginNodeKind } from '../../types/canonical';
import { DbtNodeType, NodeStatus } from '../../types/dbt';
import {
  CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE,
  parseCanvasWorkspaceResourceDragPayload,
} from '../canvasWorkspaceExplorerModel';
import { CanvasNodeBadgeOverlay } from './CanvasNodeBadgeOverlay';
import { CanvasNodeShell } from './CanvasNodeShell';
import type { CanvasNodePortCompatibilityView } from './CanvasNodePortHandle';
import type { CanvasNodePresentationCopy } from './canvasNodePresentationCopy.contract';
import type { CanvasNodePresentationTruth } from './canvasNodePresentationTruth.contract';
import type {
  GraphNodeColumn,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
  GraphNodeStructuredFieldIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanvasNodeContextMenuCopy } from './canvasNodeContextMenuModel';
import { projectCanvasNodeFlowAdapter } from './canvasNodeFlowAdapterProjection';

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
  onApplyCanvasStructuredField?: (identity: GraphNodeStructuredFieldIdentity) => void;
}

type DbtFlowNode = Node<DbtNodeData, 'dbtNode'>;

function DbtNodeComponent(props: NodeProps<DbtFlowNode>) {
  const data = props.data as DbtNodeData;
  const { id, selected } = props;
  const updateNodeInternals = useUpdateNodeInternals();
  const handleColumnLayoutChange = useCallback(
    () => updateNodeInternals(id),
    [id, updateNodeInternals]
  );
  const projection = projectCanvasNodeFlowAdapter({
    nodeId: id,
    data,
    selected,
    onColumnLayoutChange: handleColumnLayoutChange,
  });

  const handleSchemaResourceDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (
      !projection.canAttachSchema ||
      !Array.from(event.dataTransfer.types).includes(CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleSchemaResourceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!projection.canAttachSchema) {
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
    projection.attachSchema(payload.schemaName);
  };

  const Renderer = projection.Renderer;

  return (
    <CanvasNodeShell
      contextMenuModel={projection.contextMenuModel}
      shouldShowSourceHandle={projection.shouldShowSourceHandle}
      shouldShowTargetHandle={projection.shouldShowTargetHandle}
      sourceHandleTone={projection.portTone}
      targetHandleTone={projection.portTone}
      sourcePortLabel={data.portLabels?.source}
      targetPortLabel={data.portLabels?.target}
      sourcePortCompatibility={data.portCompatibility?.source}
      targetPortCompatibility={data.portCompatibility?.target}
      onContextMenuAction={projection.runAction}
      onOpenNode={typeof data.onInspectNode === 'function' ? projection.openNode : undefined}
      onDragOver={handleSchemaResourceDragOver}
      onDrop={handleSchemaResourceDrop}
    >
      <PluginContributionBoundary
        resetKey={`${id}:renderer:${projection.canonicalNode.pluginId}:${projection.canonicalNode.kind}`}
        fallback={<FallbackNodeRenderer {...projection.rendererProps} />}
      >
        <Renderer {...projection.rendererProps} />
      </PluginContributionBoundary>
      {projection.badges.map((badge, index) => (
        <PluginContributionBoundary
          key={`${badge.position}-${badge.text ?? badge.tooltip ?? index}`}
          resetKey={`${id}:badge:${badge.position}:${badge.text ?? badge.tooltip ?? index}`}
          fallback={null}
        >
          <CanvasNodeBadgeOverlay badge={badge} />
        </PluginContributionBoundary>
      ))}
    </CanvasNodeShell>
  );
}

export default memo(DbtNodeComponent);
