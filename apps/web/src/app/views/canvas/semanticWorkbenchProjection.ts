/** Select and lay out the shared canonical semantic graph projection. */
import { Position, type Edge, type Node, type SmoothStepPathOptions } from '@xyflow/react';
import type { CanonicalNode } from '../../types/canonical';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { layoutSemanticExpressionGraph } from './semanticExpressionGraphLayout';
import { layoutGraph, routeEdgesByTransition } from './semanticWorkbenchLayout';
import { projectSemanticWorkbenchRelations } from './semanticWorkbenchRelations';

export type SemanticWorkbenchGroup = 'source' | 'condition' | 'transformation';

export type SemanticWorkbenchNodeData = Readonly<{
  label: string;
  semanticKind: 'group' | 'relation' | 'expression' | 'field' | 'literal';
  semanticGroup: SemanticWorkbenchGroup;
  relationKind?: 'read' | 'filter' | 'project' | 'join' | 'aggregate' | 'set' | 'unknown';
  detail: string;
  expression?: string;
  inputSummary?: string;
  outputSummary?: string;
  joinOperand?: Readonly<{
    joinRelationId: string;
    operand: 'left' | 'right';
  }>;
  joinConditionIndex?: number;
  fieldReference?: Readonly<{ fieldId: string; relationId: string; sourceFieldId?: string }>;
}>;

type SemanticWorkbenchEdgeData = Readonly<{
  semanticEdgeKind: 'relation' | 'expression';
}>;

type SemanticWorkbenchEdge = Edge<SemanticWorkbenchEdgeData, 'smoothstep'> & {
  pathOptions?: SmoothStepPathOptions;
};

export type SemanticWorkbenchGraph = Readonly<{
  nodes: Node<SemanticWorkbenchNodeData>[];
  edges: SemanticWorkbenchEdge[];
  relationCount: number;
  expressionCount: number;
  relationId: string;
}>;

export function projectSemanticWorkbenchGraph(
  transformNode: CanonicalNode,
  options: Readonly<{
    view?: 'complete' | 'relations' | 'relation-expressions' | 'unlaid';
    expressionRelationId?: string;
  }> = {}
): SemanticWorkbenchGraph {
  const authority = readDvtTransformAuthoringAuthority(transformNode);
  if (authority == null) throw new Error('Semantic Workbench requires a DVT semantic authority.');
  const draft = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  const root = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : undefined;
  if (root?.case !== 'root' || root.value.input == null) {
    throw new Error('Semantic Workbench requires one canonical Substrait root relation.');
  }

  const graph = projectSemanticWorkbenchRelations(draft, root.value.input, transformNode.id);
  if (options.view === 'unlaid') return graph;
  const { nodes, edges, relationCount, expressionCount, relationId } = graph;
  const routedEdges = routeEdgesByTransition(nodes, edges);

  if (options.view === 'relations') {
    const relationNodes = nodes.filter((node) => node.data.semanticKind === 'relation');
    const relationEdges = routedEdges.filter((edge) => edge.data?.semanticEdgeKind === 'relation');
    return {
      nodes: layoutGraph(relationNodes, relationEdges, 'LR'),
      edges: relationEdges,
      relationCount,
      expressionCount,
      relationId,
    };
  }

  if (options.view === 'relation-expressions') {
    if (options.expressionRelationId == null) {
      throw new Error('Expression view requires a selected relation identity.');
    }
    const includedNodeIds = new Set<string>();
    const pendingNodeIds = edges.flatMap((edge) =>
      edge.data?.semanticEdgeKind === 'expression' && edge.target === options.expressionRelationId
        ? [edge.source]
        : []
    );
    while (pendingNodeIds.length > 0) {
      const nodeId = pendingNodeIds.pop();
      if (nodeId == null || includedNodeIds.has(nodeId)) continue;
      includedNodeIds.add(nodeId);
      pendingNodeIds.push(
        ...edges.flatMap((edge) =>
          edge.data?.semanticEdgeKind === 'expression' && edge.target === nodeId
            ? [edge.source]
            : []
        )
      );
    }
    if (includedNodeIds.size === 0) {
      throw new Error('Selected relation does not own a projected scalar expression.');
    }
    const expressionNodes = nodes
      .filter((node) => includedNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      }));
    const expressionEdges = edges
      .filter(
        (edge) =>
          edge.data?.semanticEdgeKind === 'expression' &&
          includedNodeIds.has(edge.source) &&
          includedNodeIds.has(edge.target)
      )
      .map((edge) => ({
        ...edge,
        pathOptions: { borderRadius: 8, offset: 16, stepPosition: 0.5 },
      }));
    return layoutSemanticExpressionGraph({
      nodes: expressionNodes,
      edges: expressionEdges,
      relationCount: 0,
      expressionCount: expressionNodes.length,
      relationId: options.expressionRelationId,
    });
  }

  return {
    nodes: layoutGraph(nodes, routedEdges),
    edges: routedEdges,
    relationCount,
    expressionCount,
    relationId,
  };
}
