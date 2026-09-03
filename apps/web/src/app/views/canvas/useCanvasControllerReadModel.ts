import { useCallback, useMemo, useState } from 'react';
import type { Edge, EdgeChange, Node } from '@xyflow/react';

import { buildCanvasNodeInteractionPresentation } from './canvasNodeInteractionPresentation';
import { validateTransformationGraph } from './transformationGraphValidation';
import type { RuntimeCapabilities } from '../../plugins/registry';
import { getCanvasGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';
import {
  canOfferDbtExecutionSelectionToggle,
  isDbtExecutionSelectableNode,
} from './dbtExecutionScopePolicy';
import {
  createCanvasColumnHandleId,
  projectCanvasColumnLineage,
  resolveCanvasColumnPortDirections,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import type { InteractiveCanvasColumnLineageEdgeData } from './CanvasColumnLineageEdge';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';
import { canAuthorCanvasColumnMappings } from './canvasColumnProjectionAuthority';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { projectCanvasColumnFunctionMenus } from './canvasColumnFunctionMenuProjection';
import { isReorderableCanvasSource } from './canvasSourceColumnOrder';

function isInteractiveColumn(value: unknown): value is GraphNodeColumn {
  if (
    typeof value !== 'object' ||
    value == null ||
    typeof (value as { name?: unknown }).name !== 'string' ||
    typeof (value as { type?: unknown }).type !== 'string'
  ) {
    return false;
  }
  const children = (value as { children?: unknown }).children;
  return children == null || (Array.isArray(children) && children.every(isInteractiveColumn));
}

function readInteractiveColumns(node: Node): GraphNodeColumn[] {
  return Array.isArray(node.data.columns) ? node.data.columns.filter(isInteractiveColumn) : [];
}

function projectInteractiveColumns(
  node: Node,
  functionMenus?: ReadonlyMap<
    string,
    Readonly<{
      columnId: string;
      menu: NonNullable<GraphNodeColumn['functionMenu']>;
    }>
  >
): GraphNodeColumn[] {
  const columns = readInteractiveColumns(node);
  const presentationTruth = node.data.presentationTruth as CanvasNodePresentationTruth | undefined;
  return columns.map((column, index) => {
    const presentationColumn = presentationTruth?.columns.visible[index];
    const id =
      presentationColumn?.provenance === 'declared'
        ? (presentationColumn.reference ?? column.name)
        : column.name;
    const functionProjection = functionMenus?.get(id) ?? functionMenus?.get(column.name);
    const interactiveId = functionProjection?.columnId ?? id;
    return {
      ...column,
      id: interactiveId,
      ...(functionProjection == null ? {} : { functionMenu: functionProjection.menu }),
      sourceHandleId: createCanvasColumnHandleId({
        direction: 'source',
        nodeId: node.id,
        columnId: interactiveId,
      }),
      targetHandleId: createCanvasColumnHandleId({
        direction: 'target',
        nodeId: node.id,
        columnId: interactiveId,
      }),
    };
  });
}

type UseCanvasControllerReadModelArgs = {
  graphModel: {
    nodes: Node[];
    edges: Edge[];
    canonicalNodesById: Map<string, CanonicalNode>;
    onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  };
  visibleScope: {
    canonicalNodes: CanonicalNode[];
    canonicalEdges: CanonicalEdge[];
  };
  executionScope: {
    selectedNodeIds: string[];
    workspaceNodeIds: string[];
  };
  uiScope: {
    selectedNodeIds: string[];
    inspectorNodeId: string | null;
  };
  overlayModel: {
    activeRunId: string | null;
    overlayDecorations: ReadonlyMap<string, unknown>;
    runStatusByNodeId: ReadonlyMap<string, string>;
  };
  graphHandlers: Pick<
    UseCanvasGraphHandlersResult,
    | 'handleInspectNode'
    | 'handleDuplicateNode'
    | 'handleRemoveNode'
    | 'handleToggleNodeSelection'
    | 'handleAttachSchemaToNode'
    | 'activeColumnHandleId'
    | 'handleColumnPortActivate'
    | 'handleApplyCanvasColumnFunction'
    | 'handleApplyCanvasStructuredField'
    | 'handleAddCanvasCalculatedColumn'
    | 'handleToggleCanvasColumnOutput'
    | 'handleReorderCanvasColumnOutput'
    | 'handleColumnDisclosureChange'
    | 'handleAutomapCanvasColumns'
    | 'handleRemoveColumnMapping'
    | 'resolveCanvasAlgebraicCompositionOperations'
    | 'handleComposeCanvasNodes'
  >;
  onToggleExecutionSelection: (nodeId: string, shouldSelect: boolean) => void;
  activeCanvasKind: string;
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph: boolean;
  canSelectExecution: boolean;
  columnLevelLineageEnabled: boolean;
};

export function useCanvasControllerReadModel({
  graphModel,
  visibleScope,
  executionScope,
  uiScope,
  overlayModel,
  graphHandlers,
  onToggleExecutionSelection,
  activeCanvasKind,
  runtimeCapabilities,
  canMutateGraph,
  canSelectExecution,
  columnLevelLineageEnabled,
}: UseCanvasControllerReadModelArgs) {
  const [selectedColumnLineageEdgeId, setSelectedColumnLineageEdgeId] = useState<string | null>(
    null
  );
  const presentsColumnLineage = activeCanvasKind === 'transformation' || activeCanvasKind === 'dbt';
  const transformationValidation = useMemo(
    () =>
      validateTransformationGraph({
        nodes: visibleScope.canonicalNodes,
        edges: visibleScope.canonicalEdges,
        selectedNodeIds: executionScope.selectedNodeIds,
        workspaceNodeIds: executionScope.workspaceNodeIds,
      }),
    [
      executionScope.selectedNodeIds,
      executionScope.workspaceNodeIds,
      visibleScope.canonicalEdges,
      visibleScope.canonicalNodes,
    ]
  );
  const graphNodeCardStrategies = useMemo(
    () => getCanvasGraphNodeCardStrategies(activeCanvasKind, runtimeCapabilities),
    [activeCanvasKind, runtimeCapabilities]
  );
  const projectedColumnLineage = useMemo(() => {
    if (!presentsColumnLineage) return [];
    const expandedNodeIds = new Set(
      graphModel.nodes
        .filter((node) => node.data.columnDisclosureExpanded === true)
        .map((node) => node.id)
    );
    return projectCanvasColumnLineage({
      nodes: visibleScope.canonicalNodes,
      edges: visibleScope.canonicalEdges,
      expandedNodeIds,
    });
  }, [
    graphModel.nodes,
    presentsColumnLineage,
    visibleScope.canonicalEdges,
    visibleScope.canonicalNodes,
  ]);
  const readOnlyColumnLineageNodeIds = useMemo(
    () =>
      new Set(
        projectedColumnLineage
          .filter((edge) => edge.data?.removable !== true)
          .flatMap((edge) => [edge.source, edge.target])
      ),
    [projectedColumnLineage]
  );

  const nodesWithImpact = useMemo(
    () =>
      buildCanvasNodeInteractionPresentation({
        nodes: graphModel.nodes,
        selectedNodeIds: uiScope.selectedNodeIds,
        canMutateGraph,
        columnLevelLineageEnabled,
        handlers: {
          onInspectNode: graphHandlers.handleInspectNode,
          onDuplicateNode: canMutateGraph ? graphHandlers.handleDuplicateNode : undefined,
          onRemoveNode: canMutateGraph ? graphHandlers.handleRemoveNode : undefined,
          onToggleNodeSelection: canSelectExecution ? onToggleExecutionSelection : undefined,
          onAttachSchemaToNode: canMutateGraph ? graphHandlers.handleAttachSchemaToNode : undefined,
          onColumnPortActivate: canMutateGraph ? graphHandlers.handleColumnPortActivate : undefined,
          onApplyCanvasColumnFunction: canMutateGraph
            ? graphHandlers.handleApplyCanvasColumnFunction
            : undefined,
          onApplyCanvasStructuredField: canMutateGraph
            ? graphHandlers.handleApplyCanvasStructuredField
            : undefined,
          onAddCanvasCalculatedColumn: canMutateGraph
            ? graphHandlers.handleAddCanvasCalculatedColumn
            : undefined,
          onToggleCanvasColumnOutput: canMutateGraph
            ? graphHandlers.handleToggleCanvasColumnOutput
            : undefined,
          onReorderCanvasColumnOutput: canMutateGraph
            ? graphHandlers.handleReorderCanvasColumnOutput
            : undefined,
          onColumnDisclosureChange: graphHandlers.handleColumnDisclosureChange,
          onAutomapColumns: canMutateGraph ? graphHandlers.handleAutomapCanvasColumns : undefined,
          resolveAlgebraicCompositionOperations: canMutateGraph
            ? graphHandlers.resolveCanvasAlgebraicCompositionOperations
            : undefined,
          onComposeCanvasNodes: canMutateGraph ? graphHandlers.handleComposeCanvasNodes : undefined,
        },
      }).map((node) => {
        const canonicalNode = graphModel.canonicalNodesById.get(node.id);
        const canAuthorColumnMappings =
          canonicalNode?.role !== 'transform' || canAuthorCanvasColumnMappings(canonicalNode);
        const canAuthorDbtModelColumns =
          canonicalNode?.pluginId === 'dbt' &&
          canonicalNode.kind === 'dbt:model' &&
          createDbtNodeAuthoringMetadata(canonicalNode).modelSql == null;
        const canReorderSourceColumns = isReorderableCanvasSource(canonicalNode);
        const hasReadOnlyColumnLineage =
          canonicalNode?.role === 'transform' &&
          !canAuthorColumnMappings &&
          readOnlyColumnLineageNodeIds.has(canonicalNode.id);
        const selectedForExecution = uiScope.selectedNodeIds.includes(node.id);
        const canSelectNode =
          canSelectExecution &&
          (activeCanvasKind !== 'dbt' ||
            canOfferDbtExecutionSelectionToggle({
              isExecutableRoot:
                canonicalNode != null && isDbtExecutionSelectableNode(canonicalNode),
              selectedForExecution,
            }));
        const functionProjection =
          canMutateGraph && canonicalNode != null
            ? projectCanvasColumnFunctionMenus({
                node: canonicalNode,
                nodes: [...graphModel.canonicalNodesById.values()],
                edges:
                  graphModel.edges.length > 0
                    ? graphModel.edges.map((edge) => ({
                        sourceId: edge.source,
                        targetId: edge.target,
                      }))
                    : visibleScope.canonicalEdges,
                presentationTruth: node.data.presentationTruth as
                  CanvasNodePresentationTruth | undefined,
                presentedColumns: readInteractiveColumns(node),
              })
            : { hasEditableProjection: false, supportsCalculatedColumns: false };
        const columnFunctionMenus = functionProjection.menus;
        const hasStructuredProjection =
          canonicalNode?.pluginId === 'dvt' &&
          canonicalNode.kind === 'dvt:transform' &&
          readInteractiveColumns(node).some((column) => column.children?.length);
        const hasEditableProjection = functionProjection.hasEditableProjection;
        const canApplyStructuredField = hasEditableProjection || hasStructuredProjection;

        const projectedNodeData = {
          ...node.data,
          onToggleNodeSelection: canSelectNode ? onToggleExecutionSelection : undefined,
          activeRunId: overlayModel.activeRunId,
          canvasKind: activeCanvasKind,
          runStatusByNodeId: overlayModel.runStatusByNodeId,
          overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
          runtimeCapabilities,
          activeColumnHandleId: graphHandlers.activeColumnHandleId,
          onColumnPortActivate: canAuthorColumnMappings
            ? node.data.onColumnPortActivate
            : undefined,
          onApplyCanvasColumnFunction:
            columnFunctionMenus == null ? undefined : node.data.onApplyCanvasColumnFunction,
          onApplyCanvasStructuredField: canApplyStructuredField
            ? node.data.onApplyCanvasStructuredField
            : undefined,
          onAddCanvasCalculatedColumn: functionProjection.supportsCalculatedColumns
            ? node.data.onAddCanvasCalculatedColumn
            : undefined,
          onToggleCanvasColumnOutput:
            hasEditableProjection || canAuthorDbtModelColumns
              ? node.data.onToggleCanvasColumnOutput
              : undefined,
          onReorderCanvasColumnOutput:
            hasEditableProjection ||
            hasStructuredProjection ||
            canAuthorDbtModelColumns ||
            canReorderSourceColumns
              ? node.data.onReorderCanvasColumnOutput
              : undefined,
          canReorderTopLevelColumns: !hasStructuredProjection,
          onAutomapColumns: canAuthorColumnMappings ? node.data.onAutomapColumns : undefined,
          columns: presentsColumnLineage
            ? projectInteractiveColumns(node, columnFunctionMenus)
            : node.data.columns,
          columnPortDirections:
            presentsColumnLineage && canonicalNode != null
              ? canonicalNode.role === 'transform' &&
                !canAuthorColumnMappings &&
                !hasReadOnlyColumnLineage &&
                !canAuthorDbtModelColumns
                ? []
                : resolveCanvasColumnPortDirections(canonicalNode.role)
              : [],
        };
        return canonicalNode == null
          ? { ...node, data: projectedNodeData }
          : projectCanvasNodeAccessibleHealth({
              node,
              canonicalNode,
              data: projectedNodeData,
              graphNodeCardStrategies,
            });
      }),
    [
      canMutateGraph,
      canSelectExecution,
      columnLevelLineageEnabled,
      graphHandlers.handleInspectNode,
      graphHandlers.handleDuplicateNode,
      graphHandlers.handleRemoveNode,
      graphHandlers.handleAttachSchemaToNode,
      graphHandlers.activeColumnHandleId,
      graphHandlers.handleAutomapCanvasColumns,
      graphHandlers.handleColumnDisclosureChange,
      graphHandlers.handleColumnPortActivate,
      graphHandlers.handleApplyCanvasColumnFunction,
      graphHandlers.handleAddCanvasCalculatedColumn,
      graphHandlers.handleReorderCanvasColumnOutput,
      graphHandlers.handleToggleCanvasColumnOutput,
      graphHandlers.resolveCanvasAlgebraicCompositionOperations,
      graphHandlers.handleComposeCanvasNodes,
      onToggleExecutionSelection,
      graphModel.canonicalNodesById,
      graphModel.edges,
      graphModel.nodes,
      graphNodeCardStrategies,
      activeCanvasKind,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      runtimeCapabilities,
      uiScope.selectedNodeIds,
      readOnlyColumnLineageNodeIds,
      presentsColumnLineage,
      visibleScope.canonicalEdges,
      visibleScope.canonicalNodes,
    ]
  );

  const edgesWithImpact = useMemo(() => {
    if (!presentsColumnLineage) return graphModel.edges;
    const lineageEdges = projectedColumnLineage.map((edge) => ({
      ...edge,
      selected: edge.id === selectedColumnLineageEdgeId,
      ariaLabel: `${edge.data?.sourceColumnName ?? ''} → ${edge.data?.targetColumnName ?? ''}`,
      data: {
        ...(edge.data as CanvasColumnLineageEdgeData),
        onRemove:
          edge.data?.removable === true
            ? () =>
                graphHandlers.handleRemoveColumnMapping(edge.data as CanvasColumnLineageEdgeData)
            : undefined,
      } satisfies InteractiveCanvasColumnLineageEdgeData,
    }));
    return [...graphModel.edges, ...lineageEdges];
  }, [
    graphHandlers.handleRemoveColumnMapping,
    graphModel.edges,
    presentsColumnLineage,
    projectedColumnLineage,
    selectedColumnLineageEdgeId,
  ]);

  const columnLineageEdgesById = useMemo(
    () =>
      new Map(
        edgesWithImpact
          .filter((edge) => edge.type === 'columnLineage')
          .map((edge) => [edge.id, edge] as const)
      ),
    [edgesWithImpact]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const baseEdgeChanges: EdgeChange<Edge>[] = [];

      for (const change of changes) {
        if (change.type === 'add' || change.type === 'replace') {
          baseEdgeChanges.push(change);
          continue;
        }
        const lineageEdge = columnLineageEdgesById.get(change.id);
        if (lineageEdge == null) {
          baseEdgeChanges.push(change);
          continue;
        }

        if (change.type === 'select') {
          setSelectedColumnLineageEdgeId((currentId) =>
            change.selected ? change.id : currentId === change.id ? null : currentId
          );
          continue;
        }

        if (change.type === 'remove') {
          const data = lineageEdge.data as InteractiveCanvasColumnLineageEdgeData | undefined;
          if (data?.removable === true) {
            data.onRemove?.();
          }
          setSelectedColumnLineageEdgeId((currentId) =>
            currentId === change.id ? null : currentId
          );
        }
      }

      if (baseEdgeChanges.length > 0) {
        graphModel.onEdgesChange(baseEdgeChanges);
      }
    },
    [columnLineageEdgesById, graphModel]
  );

  const inspectorNode = uiScope.inspectorNodeId
    ? (graphModel.canonicalNodesById.get(uiScope.inspectorNodeId) ?? null)
    : null;

  return {
    transformationValidation,
    nodesWithImpact,
    edgesWithImpact,
    handleEdgesChange,
    inspectorNode,
  };
}
