/** Owned concern: compute pure Canvas edge-admission transactions for graph handlers. */
import type { Connection, Edge } from '@xyflow/react';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import {
  confirmConnection,
  confirmReconnect,
  type CanvasConnectionRejection,
} from './canvasConnectionAggregate';
import { automapCanvasColumns } from './canvasColumnMappingAuthoring';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasDraftSession } from './canvasDraftSession';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

type CanvasEdgeAdmissionTransactionState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  edges: Edge[];
  pluginPortMap: PluginPortMap;
};

type ResolveCanvasEdgeConfirmationTransactionArgs = CanvasEdgeAdmissionTransactionState & {
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
      outcome: 'confirmed' | 'reconnected';
      edges: Edge[];
      draftSession: CanvasDraftSession;
    };

type AcceptedCanvasEdgeAdmissionTransaction = Exclude<
  CanvasEdgeAdmissionTransaction,
  { outcome: 'noop' }
>;

function buildAcceptedEdgeTransaction(args: {
  outcome: 'confirmed' | 'reconnected';
  draftSession: CanvasDraftSession;
  nextEdges: Edge[];
}): CanvasEdgeAdmissionTransaction {
  return {
    outcome: args.outcome,
    edges: args.nextEdges,
    draftSession: canvasGraphLifecycle.edge.replaceVisible(args.draftSession, args.nextEdges),
  };
}

function resolveDraftNodes(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): CanonicalNode[] {
  const nodesById = new Map(canonicalNodesById);
  for (const node of Object.values(draftSession.localNodeCatalog ?? {})) {
    nodesById.set(node.id, node);
  }
  return draftSession.workingSet.visibleNodeIds.flatMap((nodeId) => {
    const node = nodesById.get(nodeId);
    return node == null ? [] : [node];
  });
}

function applyConfirmedConnectionColumnMappings(args: {
  transaction: AcceptedCanvasEdgeAdmissionTransaction;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
}): AcceptedCanvasEdgeAdmissionTransaction {
  const nodes = resolveDraftNodes(args.transaction.draftSession, args.canonicalNodesById);
  const targetNode = nodes.find((node) => node.id === args.targetNodeId);
  if (targetNode?.pluginId !== 'dvt' || targetNode.kind !== 'dvt:transform') {
    return args.transaction;
  }
  const targetColumns = projectCanvasNodePresentationTruth({
    node: targetNode,
    nodes,
    edges: args.transaction.draftSession.workingSet.visibleEdges,
  }).columns.visible.flatMap((column) =>
    column.provenance === 'declared' ? [] : [{ name: column.name, type: column.type }]
  );
  const mappingResult = automapCanvasColumns({
    draftSession: args.transaction.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    targetNodeId: targetNode.id,
    targetColumns,
  });

  return mappingResult.outcome === 'applied'
    ? { ...args.transaction, draftSession: mappingResult.draftSession }
    : args.transaction;
}

export function resolveCanvasEdgeConfirmationTransaction({
  canonicalNodesById,
  connection,
  draftSession,
  edges,
  pluginPortMap,
}: ResolveCanvasEdgeConfirmationTransactionArgs): CanvasEdgeAdmissionTransaction {
  const result = confirmConnection({
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
    outcome: 'confirmed',
    draftSession,
    nextEdges: result.nextEdges,
  });
  if (transaction.outcome !== 'confirmed' || connection.target == null) {
    return transaction;
  }
  return applyConfirmedConnectionColumnMappings({
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
  const result = confirmReconnect({
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

  return buildAcceptedEdgeTransaction({
    outcome: 'reconnected',
    draftSession,
    nextEdges: result.nextEdges,
  });
}
