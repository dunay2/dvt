/** Owned concern: project canonical graph primitives into React Flow nodes and edges. */
import { type Edge, type Node } from '@xyflow/react';

import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { MergedNodeDecoration } from '../../plugins/contracts/NodeRendering';
import { buildGraphNodeCardReadModel } from '../../plugins/graph/graphNodeCardReadModel';
import type { GraphNodeCardStrategy } from '../../plugins/graph/graphNodeCardStrategyContracts';
import { createGraphFlowEdgeStyle, graphFlowPalette } from '../../plugins/graph/graphVisualTokens';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasNodePortCompatibilityView,
  CanvasNodePortHandleKind,
} from '../../components/canvas/CanvasNodePortHandle';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasNodePortCompatibilityByDirection } from './canvasConnectionCompatibilityPresenter';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import { buildCanvasNodePresentationCopy } from './canvasNodePresentationCopy';
import { projectDbtModelColumnStates } from './canvasDbtModelColumnAuthoring';
import type { CanvasDependencyEdgeData } from './canvasDependencyEdgeModel';
import { projectGraphNodeColumn } from './canvasGraphNodeColumnProjection';

type CanvasNodePosition = { x: number; y: number };
type MapCanonicalNodeToCanvasNodeArgs = {
  canonicalNode: CanonicalNode;
  index: number;
  showColumns: boolean;
  overlayDecoration?: MergedNodeDecoration | null;
  persistedPosition?: CanvasNodePosition;
  portCompatibility?: CanvasNodePortCompatibilityByDirection;
  frozen?: boolean;
  locale?: string;
  presentationTruth?: CanvasNodePresentationTruth;
};

function formatCompatibleNodeNames(compatibleNodeNames: readonly string[]): string {
  return compatibleNodeNames.join(', ');
}

function toPortCompatibilityView(
  compatibility: CanvasNodePortCompatibilityByDirection['source'],
  copy: CanvasViewCopy
): CanvasNodePortCompatibilityView {
  if (compatibility.state === 'available') {
    return {
      ...compatibility,
      description: `${copy.canvasNodePortCompatibleWithPrefix} ${formatCompatibleNodeNames(
        compatibility.compatibleNodeNames
      )}`,
    };
  }

  return {
    ...compatibility,
    description:
      compatibility.state === 'blocked'
        ? copy.canvasNodePortBlockedMessage
        : copy.canvasNodePortNoCompatibleNodesMessage,
  };
}

function toPortCompatibilityViewModel(
  compatibility: CanvasNodePortCompatibilityByDirection | undefined,
  copy: CanvasViewCopy
): DbtNodeData['portCompatibility'] {
  if (compatibility == null) {
    return undefined;
  }

  return {
    source: toPortCompatibilityView(compatibility.source, copy),
    target: toPortCompatibilityView(compatibility.target, copy),
  };
}

export function projectCanvasNodeAccessibleHealth<TData extends Record<string, unknown>>({
  node,
  canonicalNode,
  data,
  graphNodeCardStrategies,
}: Readonly<{
  node: Node<TData>;
  canonicalNode: CanonicalNode;
  data: TData;
  graphNodeCardStrategies: readonly GraphNodeCardStrategy[];
}>): Node<TData> {
  const projectAccessibleHealthLabel = (nextData: TData): string => {
    let healthLabel: string;

    try {
      healthLabel = buildGraphNodeCardReadModel(canonicalNode, nextData, graphNodeCardStrategies)
        .health.label;
    } catch {
      healthLabel = buildGraphNodeCardReadModel(canonicalNode, nextData).health.label;
    }

    return `${node.ariaLabel ?? canonicalNode.name}, ${healthLabel}`;
  };

  return {
    ...node,
    ariaLabel: projectAccessibleHealthLabel(data),
    data: {
      ...data,
      projectAccessibleHealthLabel,
    },
  };
}

export function mapCanonicalNodeToCanvasNode({
  canonicalNode,
  index,
  showColumns,
  overlayDecoration,
  persistedPosition,
  portCompatibility,
  frozen = false,
  locale,
  presentationTruth,
}: MapCanonicalNodeToCanvasNodeArgs): Node<DbtNodeData> {
  const kindRegistration = resolveNodeKindRegistration(canonicalNode.kind);
  const copy = resolveCanvasViewCopy(locale);
  const resolvedPresentationTruth =
    presentationTruth ??
    buildCanvasNodePresentationTruth({ node: canonicalNode, nodes: [canonicalNode], edges: [] });
  const presentedColumns =
    canonicalNode.pluginId === 'dbt' && canonicalNode.kind === 'dbt:model'
      ? projectDbtModelColumnStates(canonicalNode, resolvedPresentationTruth.columns.visible)
      : resolvedPresentationTruth.columns.visible.map((column) => ({
          column,
          output: canonicalNode.kind !== 'dvt:transform' || column.provenance === 'declared',
        }));
  const columns = presentedColumns.map(({ column, output }) =>
    projectGraphNodeColumn(column, output)
  );
  const presentationCopy = buildCanvasNodePresentationCopy(copy, locale);

  return {
    id: canonicalNode.id,
    type: 'dbtNode',
    ariaLabel: copy.canvasNodeAccessibleLabelTemplate
      .replace('{name}', canonicalNode.name)
      .replace(
        '{kind}',
        presentationCopy.kindLabels?.[canonicalNode.kind] ?? kindRegistration.label
      ),
    position: persistedPosition ?? { x: (index % 3) * 250, y: Math.floor(index / 3) * 150 },
    draggable: !frozen,
    data: {
      name: canonicalNode.name,
      type: kindRegistration.label,
      pluginId: canonicalNode.pluginId,
      pluginKind: canonicalNode.kind,
      role: canonicalNode.role,
      typeLabel: presentationCopy.kindLabels?.[canonicalNode.kind] ?? kindRegistration.label,
      status: canonicalNode.status,
      path: canonicalNode.path,
      description: canonicalNode.description,
      lastDuration: canonicalNode.lastDuration,
      lastCost: canonicalNode.lastCost,
      overlayDecoration: overlayDecoration ?? null,
      tags: canonicalNode.tags,
      displayTags: canonicalNode.tags.map((tag) => ({
        value: tag,
        label: tag === 'authoring' ? (presentationCopy.authoringTagLabel ?? tag) : tag,
      })),
      metadata: canonicalNode.metadata == null ? undefined : { ...canonicalNode.metadata },
      presentationTruth: resolvedPresentationTruth,
      presentationCopy,
      columns,
      showColumns: showColumns || (columns?.length ?? 0) > 0,
      portLabels: {
        target: copy.canvasNodePortTargetLabel,
        source: copy.canvasNodePortSourceLabel,
      },
      portCompatibility: toPortCompatibilityViewModel(portCompatibility, copy),
      contextMenuCopy: {
        editGroupLabel: copy.canvasNodeContextEditGroupLabel,
        propertiesLabel: copy.canvasNodeContextPropertiesLabel,
        duplicateLabel: copy.canvasNodeContextDuplicateLabel,
        selectForExecutionLabel: copy.canvasNodeContextSelectForExecutionLabel,
        deselectForExecutionLabel: copy.canvasNodeContextDeselectForExecutionLabel,
        dangerGroupLabel: copy.canvasNodeContextDangerGroupLabel,
        deleteLabel: copy.canvasNodeContextDeleteLabel,
      },
      executionSelectionCopy: {
        selectLabel: copy.canvasNodeContextSelectForExecutionLabel,
        deselectLabel: copy.canvasNodeContextDeselectForExecutionLabel,
      },
    },
  };
}

export function mapCanonicalEdgeToCanvasEdge(canonicalEdge: CanonicalEdge): Edge {
  const copy = resolveCanvasViewCopy();
  return createCanvasDirectionalEdge({
    id: canonicalEdge.id,
    source: canonicalEdge.sourceId,
    target: canonicalEdge.targetId,
    ariaLabel: copy.canvasEdgeAccessibleLabelTemplate
      .replace('{source}', canonicalEdge.sourceId)
      .replace('{target}', canonicalEdge.targetId),
  });
}

export function createCanvasDirectionalEdge({
  id,
  source,
  target,
  ariaLabel,
  data,
}: Readonly<{
  id: string;
  source: string;
  target: string;
  ariaLabel?: string;
  data?: CanvasDependencyEdgeData;
}>): Edge<CanvasDependencyEdgeData> {
  return {
    id,
    source,
    target,
    sourceHandle: 'source' satisfies CanvasNodePortHandleKind,
    targetHandle: 'target' satisfies CanvasNodePortHandleKind,
    ariaLabel,
    ...(data == null ? {} : { data }),
    type: 'dependency',
    animated: false,
    interactionWidth: graphFlowPalette.edgeInteractionWidth,
    style: createGraphFlowEdgeStyle(),
  };
}

export function createCanvasEdgeFromConnection(connection: {
  source: string;
  target: string;
}): Edge {
  return createCanvasDirectionalEdge({
    id: `${connection.source}->${connection.target}:${Date.now()}`,
    source: connection.source,
    target: connection.target,
  });
}

export function mapDroppedCanonicalNodeToCanvasNode(
  canonicalNode: CanonicalNode,
  position: { x: number; y: number },
  showColumns: boolean,
  locale?: string
): Node<DbtNodeData> {
  const kindRegistration = resolveNodeKindRegistration(canonicalNode.kind);
  const copy = resolveCanvasViewCopy(locale);
  const presentationTruth = buildCanvasNodePresentationTruth({
    node: canonicalNode,
    nodes: [canonicalNode],
    edges: [],
  });
  const columns = presentationTruth.columns.visible.map((column) =>
    projectGraphNodeColumn(
      column,
      canonicalNode.kind !== 'dvt:transform' || column.provenance === 'declared'
    )
  );
  const presentationCopy = buildCanvasNodePresentationCopy(copy, locale);
  const typeLabelFromMetadata =
    typeof canonicalNode.metadata?.typeLabel === 'string'
      ? canonicalNode.metadata.typeLabel
      : undefined;

  return {
    id: canonicalNode.id,
    type: 'dbtNode',
    ariaLabel: copy.canvasNodeAccessibleLabelTemplate
      .replace('{name}', canonicalNode.name)
      .replace(
        '{kind}',
        presentationCopy.kindLabels?.[canonicalNode.kind] ?? kindRegistration.label
      ),
    position,
    data: {
      name: canonicalNode.name,
      type: typeLabelFromMetadata ?? kindRegistration.label,
      pluginId: canonicalNode.pluginId,
      pluginKind: canonicalNode.kind,
      role: canonicalNode.role,
      typeLabel: presentationCopy.kindLabels?.[canonicalNode.kind] ?? kindRegistration.label,
      status: canonicalNode.status,
      path: canonicalNode.path,
      description: canonicalNode.description,
      lastDuration: canonicalNode.lastDuration,
      lastCost: canonicalNode.lastCost,
      tags: canonicalNode.tags,
      displayTags: canonicalNode.tags.map((tag) => ({
        value: tag,
        label: tag === 'authoring' ? (presentationCopy.authoringTagLabel ?? tag) : tag,
      })),
      metadata: canonicalNode.metadata == null ? undefined : { ...canonicalNode.metadata },
      presentationTruth,
      presentationCopy,
      columns,
      showColumns: showColumns || (columns?.length ?? 0) > 0,
      portLabels: {
        target: copy.canvasNodePortTargetLabel,
        source: copy.canvasNodePortSourceLabel,
      },
      contextMenuCopy: {
        editGroupLabel: copy.canvasNodeContextEditGroupLabel,
        propertiesLabel: copy.canvasNodeContextPropertiesLabel,
        duplicateLabel: copy.canvasNodeContextDuplicateLabel,
        selectForExecutionLabel: copy.canvasNodeContextSelectForExecutionLabel,
        deselectForExecutionLabel: copy.canvasNodeContextDeselectForExecutionLabel,
        dangerGroupLabel: copy.canvasNodeContextDangerGroupLabel,
        deleteLabel: copy.canvasNodeContextDeleteLabel,
      },
      executionSelectionCopy: {
        selectLabel: copy.canvasNodeContextSelectForExecutionLabel,
        deselectLabel: copy.canvasNodeContextDeselectForExecutionLabel,
      },
    },
  };
}
