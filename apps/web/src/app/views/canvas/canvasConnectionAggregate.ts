import { addEdge, reconnectEdge, type Connection, type Edge } from '@xyflow/react';

import {
  evaluateConnection,
  type ConnectionRuleResult,
  type PluginPortMap,
} from '../../plugins/contracts/ConnectionRules';
import { resolveCanvasEdgeType } from '../../plugins/nodeTypeRegistry';
import type { CanonicalNode, CoreNodeRole } from '../../types/canonical';
import { createCanvasEdgeFromConnection } from './canvasNodeMapper';

function mapEdgesToCanonicalEdges(edges: Edge[]) {
  return edges.map((edge) => ({
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    relation: 'lineage' as const,
  }));
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
      rejection: CanvasConnectionRejection;
    };

export type CanvasConnectionRejection =
  | { code: 'connection_incomplete' }
  | { code: 'node_not_found_in_graph' }
  | {
      code: 'self_connection' | 'duplicate_edge' | 'cycle_detected';
    }
  | {
      code: 'plugin_policy_missing';
      pluginId: string;
    }
  | {
      code: 'plugin_rule_blocked';
      reason?: string;
    }
  | {
      code: 'cross_plugin_bridge_missing';
      sourcePluginId: string;
      sourceRole: CoreNodeRole;
      targetPluginId: string;
      targetRole: CoreNodeRole;
    };

function mapConnectionRuleRejection(result: Exclude<ConnectionRuleResult, { allowed: true }>) {
  switch (result.reasonCode) {
    case 'plugin_policy_missing':
      return {
        code: 'plugin_policy_missing',
        pluginId: result.pluginId,
      } satisfies CanvasConnectionRejection;
    case 'plugin_rule_blocked':
      return {
        code: 'plugin_rule_blocked',
        ...(result.reason ? { reason: result.reason } : {}),
      } satisfies CanvasConnectionRejection;
    case 'cross_plugin_bridge_missing':
      return {
        code: 'cross_plugin_bridge_missing',
        sourcePluginId: result.sourcePluginId,
        sourceRole: result.sourceRole,
        targetPluginId: result.targetPluginId,
        targetRole: result.targetRole,
      } satisfies CanvasConnectionRejection;
    case 'self_connection':
      return { code: 'self_connection' } satisfies CanvasConnectionRejection;
    case 'duplicate_edge':
      return { code: 'duplicate_edge' } satisfies CanvasConnectionRejection;
    case 'cycle_detected':
      return { code: 'cycle_detected' } satisfies CanvasConnectionRejection;
  }
}

export function proposeConnection({
  connection,
  canonicalNodesById,
  edges,
  pluginPortMap,
}: ConnectionCheckArgs): ProposedConnectionResult {
  if (!connection.source || !connection.target) {
    return { outcome: 'rejected', rejection: { code: 'connection_incomplete' } };
  }

  const sourceNode = canonicalNodesById.get(connection.source);
  const targetNode = canonicalNodesById.get(connection.target);
  if (!sourceNode || !targetNode) {
    return { outcome: 'rejected', rejection: { code: 'node_not_found_in_graph' } };
  }

  const canonicalEdges = mapEdgesToCanonicalEdges(edges);
  const connectionResult = evaluateConnection(
    sourceNode,
    targetNode,
    canonicalEdges,
    pluginPortMap
  );
  if (!connectionResult.allowed) {
    return {
      outcome: 'rejected',
      rejection: mapConnectionRuleRejection(connectionResult),
    };
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

export type CreateConnectionResult =
  | { outcome: 'added'; nextEdges: Edge[] }
  | { outcome: 'rejected'; rejection: CanvasConnectionRejection };

export function createConnection(args: ConnectionCheckArgs): CreateConnectionResult {
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

export type ReconnectConnectionResult =
  | { outcome: 'reconnected'; nextEdges: Edge[] }
  | { outcome: 'rejected'; rejection: CanvasConnectionRejection };

export function reconnectConnection(
  args: ConnectionCheckArgs & { edge: Edge }
): ReconnectConnectionResult {
  const validationEdges = args.edges.filter((candidate) => candidate.id !== args.edge.id);
  const proposed = proposeConnection({
    ...args,
    edges: validationEdges,
  });
  if (proposed.outcome === 'rejected') {
    return proposed;
  }

  return {
    outcome: 'reconnected',
    nextEdges: reconnectEdge(args.edge, args.connection, args.edges, {
      shouldReplaceId: false,
    }),
  };
}
