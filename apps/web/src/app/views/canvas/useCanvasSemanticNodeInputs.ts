import { useMemo, useRef } from 'react';
import type { Node } from '@xyflow/react';

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

export function useCanvasSemanticNodeInputs(nodes: Node[]): Node[] {
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

export function useCanvasNodeGeometry(nodes: Node[], semanticNodesWithImpact: Node[]): Node[] {
  const projectedNodeReferencesRef = useRef<ReadonlyMap<string, ProjectedNodeReference>>(new Map());
  const nodesWithImpact = useMemo(() => {
    const previousReferences = projectedNodeReferencesRef.current;
    const nextReferences = new Map<string, ProjectedNodeReference>();
    const semanticNodesById = new Map(
      semanticNodesWithImpact.map((node) => [node.id, node] as const)
    );

    const projectedNodes = nodes.map((sourceNode) => {
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
  }, [nodes, semanticNodesWithImpact]);

  return nodesWithImpact;
}
