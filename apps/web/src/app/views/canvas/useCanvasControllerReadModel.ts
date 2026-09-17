import { useCallback, useMemo, useRef, useState } from 'react';
import type { Edge, EdgeChange, Node } from '@xyflow/react';

import { buildCanvasNodeInteractionPresentation } from './canvasNodeInteractionPresentation';
import { validateTransformationGraph } from './transformationGraphValidation';
import type { RuntimeCapabilities } from '../../plugins/registry';
import { getGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';
import {
  projectCanvasColumnLineage,
  resolveCanvasColumnPortDirections,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import type { InteractiveCanvasColumnLineageEdgeData } from './CanvasColumnLineageEdge';
import {
  canAuthorCanvasColumnMappings,
  readCanvasColumnMappingInputFields,
} from './canvasColumnProjectionAuthority';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';
import { projectCanvasColumnFunctionMenus } from './canvasColumnFunctionMenuProjection';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import { isDvtSourceOutputProjectionNode } from './canvasDvtSourceSemanticAuthoring';
import { readCanvasJoinColumnOutputs } from './canvasJoinColumnOutputModel';
import { projectInteractiveCanvasColumns } from './canvasGraphNodeColumnProjection';

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
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph: boolean;
  canSelectExecution: boolean;
  columnLevelLineageEnabled: boolean;
};

function semanticNodeInputsEqual(left: readonly Node[], right: readonly Node[]): boolean {
  return (
    left.length === right.length &&
    left.every((node, index) => {
      const candidate = right[index];
      return (
        candidate != null &&
        node.id === candidate.id &&
        node.data === candidate.data &&
        node.ariaLabel === candidate.ariaLabel
      );
    })
  );
}

function useCanvasSemanticNodeInputs(nodes: Node[]): Node[] {
  const semanticNodesRef = useRef(nodes);

  if (!semanticNodeInputsEqual(semanticNodesRef.current, nodes)) {
    semanticNodesRef.current = nodes;
  }

  return semanticNodesRef.current;
}

type ProjectedNodeReference = {
  sourceNode: Node;
  semanticNode: Node;
  projectedNode: Node;
};

export function useCanvasControllerReadModel({
  graphModel,
  visibleScope,
  executionScope,
  uiScope,
  overlayModel,
  graphHandlers,
  onToggleExecutionSelection,
  runtimeCapabilities,
  canMutateGraph,
  canSelectExecution,
  columnLevelLineageEnabled,
}: UseCanvasControllerReadModelArgs) {
  const [selectedColumnLineageEdgeId, setSelectedColumnLineageEdgeId] = useState<string | null>(
    null
  );
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
    () => getGraphNodeCardStrategies(runtimeCapabilities),
    [runtimeCapabilities]
  );
  const columnFunctionNodes = useMemo(
    () => (canMutateGraph ? [...graphModel.canonicalNodesById.values()] : undefined),
    [canMutateGraph, graphModel.canonicalNodesById]
  );
  const columnFunctionEdges = useMemo(
    () =>
      !canMutateGraph
        ? undefined
        : graphModel.edges.length > 0
          ? graphModel.edges.map((edge) => ({
              sourceId: edge.source,
              targetId: edge.target,
            }))
          : visibleScope.canonicalEdges,
    [canMutateGraph, graphModel.edges, visibleScope.canonicalEdges]
  );
  const semanticGraphNodes = useCanvasSemanticNodeInputs(graphModel.nodes);
  const projectedColumnLineage = useMemo(() => {
    const expandedNodeIds = new Set(
      semanticGraphNodes
        .filter((node) => node.data.columnDisclosureExpanded === true)
        .map((node) => node.id)
    );
    return projectCanvasColumnLineage({
      nodes: visibleScope.canonicalNodes,
      edges: visibleScope.canonicalEdges,
      expandedNodeIds,
    });
  }, [semanticGraphNodes, visibleScope.canonicalEdges, visibleScope.canonicalNodes]);
  const readOnlyColumnLineageNodeIds = useMemo(
    () =>
      new Set(
        projectedColumnLineage
          .filter((edge) => edge.data?.removable !== true)
          .flatMap((edge) => [edge.source, edge.target])
      ),
    [projectedColumnLineage]
  );

  const semanticNodesWithImpact = useMemo(
    () =>
      buildCanvasNodeInteractionPresentation({
        nodes: semanticGraphNodes,
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
        const joinOutputs =
          canonicalNode == null ? null : readCanvasJoinColumnOutputs(canonicalNode);
        const canAuthorColumnMappings =
          canonicalNode?.role !== 'transform' || canAuthorCanvasColumnMappings(canonicalNode);
        const canAuthorDbtModelColumns =
          canonicalNode != null && isDbtCompatibleModel(canonicalNode);
        const canProjectSourceOutputs =
          canonicalNode != null && isDvtSourceOutputProjectionNode(canonicalNode);
        const hasReadOnlyColumnLineage =
          canonicalNode?.role === 'transform' &&
          !canAuthorColumnMappings &&
          readOnlyColumnLineageNodeIds.has(canonicalNode.id);
        const functionProjection =
          columnFunctionNodes != null && columnFunctionEdges != null && canonicalNode != null
            ? projectCanvasColumnFunctionMenus({
                node: canonicalNode,
                nodes: columnFunctionNodes,
                edges: columnFunctionEdges,
              })
            : { hasEditableProjection: false, supportsCalculatedColumns: false };
        const columnFunctionMenus = functionProjection.menus;
        const interactiveColumns = projectInteractiveCanvasColumns(
          node,
          graphModel.canonicalNodesById,
          columnFunctionMenus,
          joinOutputs?.fields.map((field) => ({
            id: field.columnId,
            name: field.name,
            type: field.dataType,
            output: field.selected,
            reference: field.columnId,
            sourceReference: field.sourceReference,
          }))
        );
        const hasStructuredProjection =
          canonicalNode?.pluginId === 'dvt' &&
          canonicalNode.kind === 'dvt:transform' &&
          interactiveColumns.some((column) => column.children?.length);
        const hasEditableProjection = functionProjection.hasEditableProjection;
        const hasMaterializableMappingInput =
          canAuthorColumnMappings &&
          !hasEditableProjection &&
          canonicalNode != null &&
          columnFunctionEdges != null &&
          columnFunctionEdges.some((edge) => {
            if (edge.targetId !== canonicalNode.id) return false;
            const sourceNode = graphModel.canonicalNodesById.get(edge.sourceId);
            return (
              sourceNode != null &&
              readCanvasColumnMappingInputFields({
                sourceNode,
                edges: columnFunctionEdges,
                resolveNode: (nodeId) => graphModel.canonicalNodesById.get(nodeId),
              }).length > 0
            );
          });
        const canApplyStructuredField = hasEditableProjection || hasStructuredProjection;

        const projectedNodeData = {
          ...node.data,
          onToggleNodeSelection: canSelectExecution ? onToggleExecutionSelection : undefined,
          activeRunId: overlayModel.activeRunId,
          runStatusByNodeId: overlayModel.runStatusByNodeId,
          overlayDecoration: overlayModel.overlayDecorations.get(node.id) ?? null,
          runtimeCapabilities,
          activeColumnHandleId: graphHandlers.activeColumnHandleId,
          onColumnPortActivate: canAuthorColumnMappings
            ? node.data.onColumnPortActivate
            : undefined,
          onApplyCanvasColumnFunction: hasEditableProjection
            ? node.data.onApplyCanvasColumnFunction
            : undefined,
          resolveCanvasColumnCompositionFunctions: hasEditableProjection
            ? functionProjection.resolveCompositionFunctions
            : undefined,
          onApplyCanvasStructuredField: canApplyStructuredField
            ? node.data.onApplyCanvasStructuredField
            : undefined,
          onAddCanvasCalculatedColumn: functionProjection.supportsCalculatedColumns
            ? node.data.onAddCanvasCalculatedColumn
            : undefined,
          expressionInputColumns: functionProjection.expressionInputs,
          onToggleCanvasColumnOutput:
            (canAuthorColumnMappings && (hasEditableProjection || hasMaterializableMappingInput)) ||
            hasStructuredProjection ||
            canAuthorDbtModelColumns ||
            canProjectSourceOutputs ||
            joinOutputs != null
              ? node.data.onToggleCanvasColumnOutput
              : undefined,
          onReorderCanvasColumnOutput:
            hasEditableProjection ||
            hasStructuredProjection ||
            canAuthorDbtModelColumns ||
            canProjectSourceOutputs ||
            joinOutputs != null
              ? node.data.onReorderCanvasColumnOutput
              : undefined,
          onAutomapColumns: canAuthorColumnMappings ? node.data.onAutomapColumns : undefined,
          columns: interactiveColumns,
          columnPortDirections:
            canonicalNode != null
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
      columnFunctionEdges,
      columnFunctionNodes,
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
      graphHandlers.handleApplyCanvasStructuredField,
      graphHandlers.handleAddCanvasCalculatedColumn,
      graphHandlers.handleReorderCanvasColumnOutput,
      graphHandlers.handleToggleCanvasColumnOutput,
      graphHandlers.resolveCanvasAlgebraicCompositionOperations,
      graphHandlers.handleComposeCanvasNodes,
      onToggleExecutionSelection,
      graphModel.canonicalNodesById,
      semanticGraphNodes,
      graphNodeCardStrategies,
      overlayModel.activeRunId,
      overlayModel.overlayDecorations,
      overlayModel.runStatusByNodeId,
      runtimeCapabilities,
      readOnlyColumnLineageNodeIds,
      uiScope.selectedNodeIds,
    ]
  );

  const projectedNodeReferencesRef = useRef<ReadonlyMap<string, ProjectedNodeReference>>(new Map());
  const nodesWithImpact = useMemo(() => {
    const previousReferences = projectedNodeReferencesRef.current;
    const nextReferences = new Map<string, ProjectedNodeReference>();
    const semanticNodesById = new Map(
      semanticNodesWithImpact.map((node) => [node.id, node] as const)
    );

    const projectedNodes = graphModel.nodes.map((sourceNode) => {
      const semanticNode = semanticNodesById.get(sourceNode.id);
      if (semanticNode == null) {
        throw new Error('Canvas semantic projection omitted node ' + sourceNode.id);
      }

      const previousReference = previousReferences.get(sourceNode.id);
      const projectedNode =
        previousReference?.sourceNode === sourceNode &&
        previousReference.semanticNode === semanticNode
          ? previousReference.projectedNode
          : {
              ...sourceNode,
              ariaLabel: semanticNode.ariaLabel,
              data: semanticNode.data,
            };

      nextReferences.set(sourceNode.id, {
        sourceNode,
        semanticNode,
        projectedNode,
      });
      return projectedNode;
    });

    projectedNodeReferencesRef.current = nextReferences;
    return projectedNodes;
  }, [graphModel.nodes, semanticNodesWithImpact]);

  const edgesWithImpact = useMemo(() => {
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
    [columnLineageEdgesById, graphModel.onEdgesChange]
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
