/** Visual layout shared by relational and output expression projections. */
import { Position } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { getLayoutedElements } from './canvasGraphUtils';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

const EXPRESSION_STYLE: CSSProperties = {
  width: 138,
  minHeight: 44,
  padding: 0,
  border: '1px solid #3b5b88',
  borderRadius: 8,
  background: '#10192d',
  color: '#e2e8f0',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
  textAlign: 'left',
};
export const semanticExpressionStyles = {
  expression: EXPRESSION_STYLE,
  field: {
    ...EXPRESSION_STYLE,
    width: 206,
    border: '1px solid #245f88',
    background: '#0a1829',
    color: '#7dd3fc',
  },
  literal: {
    ...EXPRESSION_STYLE,
    border: '1px solid #67552d',
    background: '#211b0d',
    color: '#f3d58a',
  },
};

export function layoutSemanticExpressionGraph(
  graph: SemanticWorkbenchGraph
): SemanticWorkbenchGraph {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    sourcePosition: Position.Top,
    targetPosition: Position.Bottom,
  }));
  return {
    ...graph,
    nodes: getLayoutedElements(nodes, graph.edges, {
      rankdir: 'BT',
      ranksep: 28,
      nodesep: 28,
      marginx: 8,
      marginy: 8,
      nodeSize: { width: 206, height: 60 },
    }).nodes,
    edges: graph.edges.map((edge) => ({
      ...edge,
      pathOptions: { borderRadius: 8, offset: 16, stepPosition: 0.5 },
    })),
  };
}
