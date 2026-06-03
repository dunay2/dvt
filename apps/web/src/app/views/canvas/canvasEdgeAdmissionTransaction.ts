/** Owned concern: compute pure Canvas edge-admission transactions for graph handlers. */
import type { Connection, Edge } from '@xyflow/react';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import {
  confirmConnection,
  confirmReconnect,
  type CanvasConnectionRejection,
} from './canvasConnectionAggregate';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasDraftSession } from './canvasDraftSession';

type CanvasEdgeAdmissionTransactionState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  edges: Edge[];
  pluginPortMap: PluginPortMap;
};

type ResolveCanvasEdgeConfirmationTransactionArgs =
  CanvasEdgeAdmissionTransactionState & {
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

function buildAcceptedEdgeTransaction(args: {
  outcome: 'confirmed' | 'reconnected';
  draftSession: CanvasDraftSession;
  nextEdges: Edge[];
}): CanvasEdgeAdmissionTransaction {
  return {
    outcome: args.outcome,
    edges: args.nextEdges,
    draftSession: canvasGraphLifecycle.edge.replaceVisible(
      args.draftSession,
      args.nextEdges
    ),
  };
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

  return buildAcceptedEdgeTransaction({
    outcome: 'confirmed',
    draftSession,
    nextEdges: result.nextEdges,
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
