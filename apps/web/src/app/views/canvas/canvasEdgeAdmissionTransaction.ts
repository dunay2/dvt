/** Owned concern: compute pure Canvas edge-admission transactions for graph handlers. */
import type { Connection, Edge } from '@xyflow/react';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import {
  createConnection,
  reconnectConnection,
  type CanvasConnectionRejection,
} from './canvasConnectionAggregate';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { reconcileDbtModelConnectedOrigin } from './canvasDbtAuthoringModel';

type CanvasEdgeAdmissionTransactionState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  edges: Edge[];
  pluginPortMap: PluginPortMap;
};

type ResolveCanvasEdgeCreationTransactionArgs = CanvasEdgeAdmissionTransactionState & {
  connection: Connection;
};

type ResolveCanvasEdgeReconnectTransactionArgs = CanvasEdgeAdmissionTransactionState & {
  edge: Edge;
  connection: Connection;
};

export type CanvasEdgeAdmissionTransaction =
  | {
      outcome: 'noop';
      rejection: CanvasConnectionRejection;
    }
  | {
      outcome: 'created' | 'reconnected';
      edges: Edge[];
      draftSession: CanvasDraftSession;
    };

type AcceptedCanvasEdgeAdmissionTransaction = Exclude<
  CanvasEdgeAdmissionTransaction,
  { outcome: 'noop' }
>;

function buildAcceptedEdgeTransaction(args: {
  outcome: 'created' | 'reconnected';
  draftSession: CanvasDraftSession;
  nextEdges: Edge[];
}): CanvasEdgeAdmissionTransaction {
  return {
    outcome: args.outcome,
    edges: args.nextEdges,
    draftSession: canvasGraphLifecycle.edge.replaceVisible(args.draftSession, args.nextEdges),
  };
}

function applyConnectedDbtModelOrigin(args: {
  transaction: AcceptedCanvasEdgeAdmissionTransaction;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
}): AcceptedCanvasEdgeAdmissionTransaction {
  const nodes = resolveCanvasDraftNodes(args.transaction.draftSession, args.canonicalNodesById);
  const targetNode = nodes.find((node) => node.id === args.targetNodeId);
  if (targetNode == null) return args.transaction;

  const reconciledNode = reconcileDbtModelConnectedOrigin({
    node: targetNode,
    nodes,
    edges: args.transaction.draftSession.workingSet.visibleEdges,
  });
  if (reconciledNode === targetNode) return args.transaction;

  return {
    ...args.transaction,
    draftSession: canvasDraftSession.workingSet.upsertNode(
      args.transaction.draftSession,
      reconciledNode
    ),
  };
}

export async function resolveCanvasEdgeCreationTransaction({
  canonicalNodesById,
  connection,
  draftSession,
  edges,
  pluginPortMap,
}: ResolveCanvasEdgeCreationTransactionArgs): Promise<CanvasEdgeAdmissionTransaction> {
  const result = createConnection({
    connection,
    canonicalNodesById,
    edges,
    pluginPortMap,
  });

  if (result.outcome === 'rejected') {
    return {
      outcome: 'noop',
      rejection: result.rejection,
    };
  }

  const transaction = buildAcceptedEdgeTransaction({
    outcome: 'created',
    draftSession,
    nextEdges: result.nextEdges,
  });
  if (transaction.outcome !== 'created' || connection.target == null) {
    return transaction;
  }
  return applyConnectedDbtModelOrigin({
    transaction,
    canonicalNodesById,
    targetNodeId: connection.target,
  });
}

export function resolveCanvasEdgeReconnectTransaction({
  canonicalNodesById,
  connection,
  draftSession,
  edge,
  edges,
  pluginPortMap,
}: ResolveCanvasEdgeReconnectTransactionArgs): CanvasEdgeAdmissionTransaction {
  const result = reconnectConnection({
    edge,
    connection,
    canonicalNodesById,
    edges,
    pluginPortMap,
  });

  if (result.outcome === 'rejected') {
    return {
      outcome: 'noop',
      rejection: result.rejection,
    };
  }

  const transaction = buildAcceptedEdgeTransaction({
    outcome: 'reconnected',
    draftSession,
    nextEdges: result.nextEdges,
  });
  if (transaction.outcome !== 'reconnected' || connection.target == null) return transaction;
  return applyConnectedDbtModelOrigin({
    transaction,
    canonicalNodesById,
    targetNodeId: connection.target,
  });
}
