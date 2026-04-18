import { addEdge, type Connection, type Edge, type Node } from '@xyflow/react';

import {
  evaluateConnection,
  type PluginPortMap,
} from '../../plugins/contracts/ConnectionRules';
import { resolveCanvasEdgeType } from '../../plugins/nodeTypeRegistry';
import type { CanvasGraphStrategy } from '../../plugins/dbt/dbtNodeAdapter';
import type { CanonicalNode, CoreNodeRole } from '../../types/canonical';
import {
  createCanvasEdgeFromConnection,
  mapDroppedCanonicalNodeToCanvasNode,
} from './canvasNodeMapper';
import { guardTransformationAuthoringNode } from './transformationAuthoringGuard';
import { guardTransformationConnection } from './transformationConnectionGuard';

function mapEdgesToCanonicalEdges(edges: Edge[]) {
  return edges.map((edge) => ({
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    relation: 'lineage' as const,
  }));
}

function resolveExistingRoles(nodes: Node[]): CoreNodeRole[] {
  return nodes
    .map((node) => node.data)
    .map((data) => (data && typeof data === 'object' ? (data as { role?: unknown }).role : null))
    .filter(
      (role): role is CoreNodeRole =>
        role === 'input' ||
        role === 'transform' ||
        role === 'check' ||
        role === 'output' ||
        role === 'control'
    );
}

type ConnectionCheckArgs = {
  connection: Connection;
  canonicalNodesById: Map<string, CanonicalNode>;
  edges: Edge[];
  pluginPortMap: PluginPortMap;
};

export type ProposedConnectionResult =
  | {
      outcome: 'allowed';
      sourceNode: CanonicalNode;
      targetNode: CanonicalNode;
      edgeType: string;
    }
  | {
      outcome: 'rejected';
      reason: string;
    };

export function proposeConnection({
  connection,
  canonicalNodesById,
  edges,
  pluginPortMap,
}: ConnectionCheckArgs): ProposedConnectionResult {
  if (!connection.source || !connection.target) {
    return { outcome: 'rejected', reason: 'Connection is incomplete.' };
  }

  const sourceNode = canonicalNodesById.get(connection.source);
  const targetNode = canonicalNodesById.get(connection.target);
  if (!sourceNode || !targetNode) {
    return { outcome: 'rejected', reason: 'Node not found in graph.' };
  }

  const transformationGuard = guardTransformationConnection({
    sourceNode,
    targetNode,
    canonicalNodes: canonicalNodesById.values(),
    edges,
  });
  if (!transformationGuard.allowed) {
    return { outcome: 'rejected', reason: transformationGuard.reason };
  }

  const connectionResult = evaluateConnection(
    sourceNode,
    targetNode,
    mapEdgesToCanonicalEdges(edges),
    pluginPortMap
  );
  if (!connectionResult.allowed) {
    return { outcome: 'rejected', reason: connectionResult.reason };
  }

  const edgeType = resolveCanvasEdgeType({
    sourceRole: sourceNode.role,
    targetRole: targetNode.role,
    sourceKind: sourceNode.kind,
    targetKind: targetNode.kind,
  });

  return {
    outcome: 'allowed',
    sourceNode,
    targetNode,
    edgeType,
  };
}

export type ConfirmConnectionResult =
  | { outcome: 'added'; nextEdges: Edge[] }
  | { outcome: 'rejected'; reason: string };

export function confirmConnection(args: ConnectionCheckArgs): ConfirmConnectionResult {
  const proposed = proposeConnection(args);
  if (proposed.outcome === 'rejected') {
    return proposed;
  }

  const nextEdges = addEdge(
    createCanvasEdgeFromConnection({
      source: proposed.sourceNode.id,
      target: proposed.targetNode.id,
    }),
    args.edges
  );

  return {
    outcome: 'added',
    nextEdges,
  };
}

type DropCanonicalNodeArgs = {
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
  nodes: Node[];
  graphStrategy: CanvasGraphStrategy;
  columnLevelLineageEnabled: boolean;
};

export type DropCanonicalNodeResult =
  | {
      outcome: 'added';
      nextNodes: Node[];
    }
  | {
      outcome: 'noop';
      reason: 'Node already on canvas';
    }
  | {
      outcome: 'rejected';
      reason: string;
    };

export function dropCanonicalNode({
  canonicalNode,
  position,
  nodes,
  graphStrategy,
  columnLevelLineageEnabled,
}: DropCanonicalNodeArgs): DropCanonicalNodeResult {
  if (nodes.some((node) => node.id === canonicalNode.id)) {
    return { outcome: 'noop', reason: 'Node already on canvas' };
  }

  const authoringGuard = guardTransformationAuthoringNode({
    authoringModeEnabled: graphStrategy.id === 'transformation',
    existingRoles: resolveExistingRoles(nodes),
    nextRole: canonicalNode.role,
  });
  if (!authoringGuard.allowed) {
    return { outcome: 'rejected', reason: authoringGuard.reason };
  }

  const newNode = mapDroppedCanonicalNodeToCanvasNode(
    canonicalNode,
    position,
    columnLevelLineageEnabled
  );

  return {
    outcome: 'added',
    nextNodes: [...nodes, newNode],
  };
}

export function removeEdgesForNode(edges: Edge[], nodeId: string): Edge[] {
  return edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
}

export type RemoveNodeFromGraphResult =
  | {
      outcome: 'removed';
      nextNodes: Node[];
      nodeName: string;
    }
  | {
      outcome: 'noop';
    };

export function removeNodeFromGraph(nodes: Node[], nodeId: string): RemoveNodeFromGraphResult {
  const nodeToRemove = nodes.find((node) => node.id === nodeId);
  if (!nodeToRemove) {
    return { outcome: 'noop' };
  }

  return {
    outcome: 'removed',
    nextNodes: nodes.filter((node) => node.id !== nodeId),
    nodeName: String(nodeToRemove.data?.name ?? nodeId),
  };
}
