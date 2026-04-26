/** Owned concern: serialize Canvas edge command effects over one local snapshot. */
import { useCallback, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { Connection, Edge } from '@xyflow/react';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasConnectionRejection } from './canvasConnectionAggregate';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasEdgeConfirmationTransaction,
  resolveCanvasEdgeReconnectTransaction,
  type CanvasEdgeAdmissionTransaction,
} from './canvasEdgeAdmissionTransaction';

type CanvasEdgeCommandRunnerState = {
  canonicalNodesById: Map<string, CanonicalNode>;
  draftSession: CanvasDraftSession;
  edges: Edge[];
};

type CanvasEdgeCommandRunnerEffects = {
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
};

type UseCanvasEdgeCommandRunnerArgs = {
  state: CanvasEdgeCommandRunnerState;
  effects: CanvasEdgeCommandRunnerEffects;
  pluginPortMap: PluginPortMap;
};

type RunCanvasEdgeConfirmationCommandArgs = {
  connection: Connection;
  onNoop?: (rejection: CanvasConnectionRejection) => void;
  onConfirmed?: () => void;
};

type RunCanvasEdgeReconnectCommandArgs = {
  edge: Edge;
  connection: Connection;
  onNoop?: (rejection: CanvasConnectionRejection) => void;
  onReconnected?: () => void;
};

export type RunCanvasEdgeConfirmationCommand = (
  args: RunCanvasEdgeConfirmationCommandArgs
) => CanvasEdgeAdmissionTransaction;

export type RunCanvasEdgeReconnectCommand = (
  args: RunCanvasEdgeReconnectCommandArgs
) => CanvasEdgeAdmissionTransaction;

export type CanvasEdgeCommandRunner = {
  confirmConnection: RunCanvasEdgeConfirmationCommand;
  reconnectEdge: RunCanvasEdgeReconnectCommand;
};

function applyAcceptedEdgeTransaction(args: {
  transaction: Extract<
    CanvasEdgeAdmissionTransaction,
    { outcome: 'confirmed' | 'reconnected' }
  >;
  latestEdgesRef: MutableRefObject<Edge[]>;
  latestDraftSessionRef: MutableRefObject<CanvasDraftSession>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
}) {
  args.latestEdgesRef.current = args.transaction.edges;
  args.latestDraftSessionRef.current = args.transaction.draftSession;
  args.setEdges(args.transaction.edges);
  args.setDraftSession(args.transaction.draftSession);
}

export function useCanvasEdgeCommandRunner({
  state,
  effects,
  pluginPortMap,
}: UseCanvasEdgeCommandRunnerArgs): CanvasEdgeCommandRunner {
  const { canonicalNodesById, draftSession, edges } = state;
  const { setDraftSession, setEdges } = effects;
  const latestEdgesRef = useRef(edges);
  const latestDraftSessionRef = useRef(draftSession);
  latestEdgesRef.current = edges;
  latestDraftSessionRef.current = draftSession;

  const confirmConnectionCommand = useCallback<RunCanvasEdgeConfirmationCommand>(
    ({ connection, onNoop, onConfirmed }) => {
      const transaction = resolveCanvasEdgeConfirmationTransaction({
        canonicalNodesById,
        connection,
        draftSession: latestDraftSessionRef.current,
        edges: latestEdgesRef.current,
        pluginPortMap,
      });

      if (transaction.outcome === 'noop') {
        onNoop?.(transaction.rejection);
        return transaction;
      }

      applyAcceptedEdgeTransaction({
        transaction,
        latestEdgesRef,
        latestDraftSessionRef,
        setDraftSession,
        setEdges,
      });
      onConfirmed?.();
      return transaction;
    },
    [canonicalNodesById, pluginPortMap, setDraftSession, setEdges]
  );

  const reconnectEdgeCommand = useCallback<RunCanvasEdgeReconnectCommand>(
    ({ edge, connection, onNoop, onReconnected }) => {
      const transaction = resolveCanvasEdgeReconnectTransaction({
        canonicalNodesById,
        connection,
        draftSession: latestDraftSessionRef.current,
        edge,
        edges: latestEdgesRef.current,
        pluginPortMap,
      });

      if (transaction.outcome === 'noop') {
        onNoop?.(transaction.rejection);
        return transaction;
      }

      applyAcceptedEdgeTransaction({
        transaction,
        latestEdgesRef,
        latestDraftSessionRef,
        setDraftSession,
        setEdges,
      });
      onReconnected?.();
      return transaction;
    },
    [canonicalNodesById, pluginPortMap, setDraftSession, setEdges]
  );

  return {
    confirmConnection: confirmConnectionCommand,
    reconnectEdge: reconnectEdgeCommand,
  };
}
