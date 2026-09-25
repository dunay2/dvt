import { describe, expect, it } from 'vitest';
import { SEMANTIC_WORKBENCH_TRANSFORM } from './semanticWorkbenchFixture';
import { projectSemanticWorkbenchGraph } from '../views/canvas/semanticWorkbenchProjection';

describe('semantic flow projection', () => {
  it('projects a relation-only flow without flattening the retained semantic tree', () => {
    const graph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM, {
      view: 'relations',
    });
    const relationNodes = graph.nodes.filter((node) => node.data.semanticKind === 'relation');
    const joinNodes = relationNodes.filter((node) => node.data.relationKind === 'join');

    expect(relationNodes).toHaveLength(5);
    expect(joinNodes).toHaveLength(2);
    expect(
      graph.nodes.every(
        (node) => node.data.semanticKind === 'group' || node.data.semanticKind === 'relation'
      )
    ).toBe(true);
    expect(graph.edges.every((edge) => edge.data?.semanticEdgeKind === 'relation')).toBe(true);
    expect(joinNodes.map((node) => node.data.expression)).toEqual(
      expect.arrayContaining([
        'orders.client_id = client.client_id',
        'orders.order_id = order_details.order_id',
      ])
    );
    const firstJoin = joinNodes.find((node) => node.id !== graph.relationId);
    const secondJoin = joinNodes.find((node) => node.id === graph.relationId);
    expect(firstJoin?.position.x).toBeLessThan(secondJoin?.position.x ?? 0);
    expect(
      graph.edges
        .filter((edge) => joinNodes.some((join) => join.id === edge.target))
        .map((edge) => edge.targetHandle)
    ).toEqual(expect.arrayContaining(['left', 'right']));
  });

  it('groups nodes for shared movement and stacks the JOIN chain in execution order', () => {
    const graph = projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM);
    const groups = graph.nodes.filter((node) => node.data.semanticKind === 'group');
    const members = graph.nodes.filter((node) => node.data.semanticKind !== 'group');

    expect(groups).toHaveLength(3);
    expect(groups.every((node) => node.draggable === true)).toBe(true);
    expect(
      members.every(
        (node) =>
          node.draggable === false &&
          node.extent === 'parent' &&
          node.parentId === `semantic-group-${node.data.semanticGroup}`
      )
    ).toBe(true);

    const firstJoin = members.find(
      (node) => node.data.relationKind === 'join' && node.id !== graph.relationId
    );
    const secondJoin = members.find(
      (node) => node.data.relationKind === 'join' && node.id === graph.relationId
    );
    const secondEqual = members.find(
      (node) =>
        node.data.semanticKind === 'expression' &&
        graph.edges.some((edge) => edge.source === node.id && edge.target === secondJoin?.id)
    );
    if (firstJoin == null || secondJoin == null || secondEqual == null) {
      throw new Error('Expected both JOIN stages and the second equality expression.');
    }
    expect(firstJoin.position.x).toBe(secondJoin.position.x);
    expect(firstJoin.position.y).toBeLessThan(secondJoin.position.y);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: firstJoin.id, target: secondJoin.id }),
        expect.objectContaining({ source: secondEqual.id, target: secondJoin.id }),
      ])
    );

    const nodeById = new Map(graph.nodes.map((node) => [node.id, node] as const));
    const lanesByTransition = new Map<string, number[]>();
    graph.edges.forEach((edge) => {
      const sourceGroup = nodeById.get(edge.source)?.data.semanticGroup;
      const targetGroup = nodeById.get(edge.target)?.data.semanticGroup;
      const kind = edge.data?.semanticEdgeKind;
      const stepPosition = edge.pathOptions?.stepPosition;
      if (sourceGroup == null || targetGroup == null || kind == null || stepPosition == null) {
        throw new Error('Expected every semantic edge to have a deterministic routing lane.');
      }
      const key = `${kind}:${sourceGroup}->${targetGroup}`;
      lanesByTransition.set(key, [...(lanesByTransition.get(key) ?? []), stepPosition]);
    });
    expect(
      [...lanesByTransition.values()]
        .filter((lanes) => lanes.length > 1)
        .every((lanes) => new Set(lanes).size === lanes.length)
    ).toBe(true);
  });
});
