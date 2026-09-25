import { describe, expect, it } from 'vitest';
import { Position } from '@xyflow/react';
import { SEMANTIC_WORKBENCH_TRANSFORM } from './semanticWorkbenchFixture';
import { projectSemanticWorkbenchGraph } from '../views/canvas/semanticWorkbenchProjection';

describe('semantic expression projection', () => {
  it('projects each real predicate as a semantic tree and summarizes it in its JOIN card', () => {
    const graph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM);
    const labels = graph.nodes.map((node) => node.data.label);

    expect(labels).toEqual(
      expect.arrayContaining([
        'FUENTES',
        'CONDICIÓN DEL JOIN',
        'TRANSFORMACIÓN',
        'SOURCE\nraw.orders',
        'SOURCE\nraw.client',
        'SOURCE\nraw.order_details',
        'FIELD\norders.client_id',
        'FIELD\nclient.client_id',
        'FIELD\norders.order_id',
        'FIELD\norder_details.order_id',
        'EQUAL\n=',
        'JOIN · INNER\norders.client_id = client.client_id',
        'JOIN · INNER\norders.order_id = order_details.order_id',
      ])
    );
    const joinNode = graph.nodes.find((node) => node.id === graph.relationId);
    expect(joinNode?.data.expression).toBe('orders.order_id = order_details.order_id');
    expect(
      graph.nodes
        .filter((node) => node.data.semanticKind === 'relation')
        .map((node) => node.data.expression)
    ).toEqual(
      expect.arrayContaining([
        'orders.client_id = client.client_id',
        'orders.order_id = order_details.order_id',
      ])
    );
    expect(joinNode?.data.inputSummary).toBe('3 fuentes');
    expect(joinNode?.data.outputSummary).toBe('22 columnas');
    const joinOperands = graph.nodes
      .filter((node) => node.data.semanticKind === 'field')
      .flatMap((node) => (node.data.joinOperand == null ? [] : [node.data.joinOperand]));
    expect(joinOperands).toHaveLength(4);
    expect(new Set(joinOperands.map((operand) => operand.joinRelationId)).size).toBe(2);
    expect(joinOperands).toEqual(
      expect.arrayContaining([
        { joinRelationId: graph.relationId, operand: 'left' },
        { joinRelationId: graph.relationId, operand: 'right' },
      ])
    );
    expect(graph.expressionCount).toBe(6);
    expect(graph.edges.map((edge) => edge.data?.semanticEdgeKind)).toEqual(
      expect.arrayContaining(['relation', 'expression'])
    );
  });

  it('projects only the selected JOIN expression when contextual detail is expanded', () => {
    const completeGraph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM);
    const selectedJoin = completeGraph.nodes.find(
      (node) => node.data.relationKind === 'join' && node.id === completeGraph.relationId
    );
    if (selectedJoin == null) throw new Error('Expected the second JOIN relation.');

    const expressionGraph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM, {
      view: 'relation-expressions',
      expressionRelationId: selectedJoin.id,
    });

    expect(expressionGraph.nodes.map((node) => node.data.label)).toEqual(
      expect.arrayContaining([
        'FIELD\norders.order_id',
        'FIELD\norder_details.order_id',
        'EQUAL\n=',
      ])
    );
    expect(expressionGraph.nodes).toHaveLength(3);
    expect(expressionGraph.nodes.every((node) => node.data.semanticKind !== 'relation')).toBe(true);
    expect(expressionGraph.edges).toHaveLength(2);
    expect(
      expressionGraph.edges.every((edge) => edge.data?.semanticEdgeKind === 'expression')
    ).toBe(true);
    expect(
      expressionGraph.nodes.every(
        (node) => node.sourcePosition === Position.Top && node.targetPosition === Position.Bottom
      )
    ).toBe(true);
    expect(
      projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM, {
        view: 'relation-expressions',
        expressionRelationId: selectedJoin.id,
      }).nodes.map((node) => ({ id: node.id, position: node.position }))
    ).toEqual(expressionGraph.nodes.map((node) => ({ id: node.id, position: node.position })));
  });
});
