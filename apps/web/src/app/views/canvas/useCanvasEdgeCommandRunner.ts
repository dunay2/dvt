/** Owned concern: serialize Canvas edge command effects over one local snapshot. */
import { useCallback, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { Connection, Edge } from '@xyflow/react';
import type { WorkspaceGraphAuthoringEdgeExecutionGateCommand } from '@dvt/contracts';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasConnectionRejection } from './canvasConnectionAggregate';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import {
  resolveCanvasEdgeCreationTransaction,
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

type RunCanvasEdgeCreationCommandArgs = {
  connection: Connection;
  onNoop?: (rejection: CanvasConnectionRejection) => void;
  onCreated?: () => void;
};

type RunCanvasEdgeReconnectCommandArgs = {
  edge: Edge;
  connection: Connection;
  onNoop?: (rejection: CanvasConnectionRejection) => void;
  onReconnected?: () => void;
};

export type RunCanvasEdgeCreationCommand = (
  args: RunCanvasEdgeCreationCommandArgs
) => CanvasEdgeAdmissionTransaction;

export type RunCanvasEdgeReconnectCommand = (
  args: RunCanvasEdgeReconnectCommandArgs
) => CanvasEdgeAdmissionTransaction;

export type CanvasEdgeCommandRunner = {
  createConnection: RunCanvasEdgeCreationCommand;
  reconnectEdge: RunCanvasEdgeReconnectCommand;
  setExecutionGate: (args: {
    sourceId: string;
    targetId: string;
    gate: WorkspaceGraphAuthoringEdgeExecutionGateCommand;
  }) => boolean;
};

function applyAcceptedEdgeTransaction(args: {
  transaction: Extract<CanvasEdgeAdmissionTransaction, { outcome: 'created' | 'reconnected' }>;
  baselineDraftSession: CanvasDraftSession;
  latestEdgesRef: MutableRefObject<Edge[]>;
  latestDraftSessionRef: MutableRefObject<CanvasDraftSession>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
}) {
  const changedNodes = Object.entries(args.transaction.draftSession.localNodeCatalog ?? {})
    .filter(([nodeId, node]) => args.baselineDraftSession.localNodeCatalog?.[nodeId] !== node)
    .map(([, node]) => node);
  args.latestEdgesRef.current = args.transaction.edges;
  args.latestDraftSessionRef.current = args.transaction.draftSession;
  args.setEdges(args.transaction.edges);
  args.setDraftSession((currentDraftSession) => {
    let nextDraftSession = canvasGraphLifecycle.edge.replaceVisible(
      currentDraftSession,
      args.transaction.edges
    );
    for (const node of changedNodes) {
      nextDraftSession = canvasDraftSession.workingSet.upsertNode(nextDraftSession, node);
    }
    args.latestDraftSessionRef.current = nextDraftSession;
    return nextDraftSession;
  });
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

  const createConnectionCommand = useCallback<RunCanvasEdgeCreationCommand>(
    ({ connection, onNoop, onCreated }) => {
      const baselineDraftSession = latestDraftSessionRef.current;
      const transaction = resolveCanvasEdgeCreationTransaction({
        canonicalNodesById,
        connection,
        draftSession: baselineDraftSession,
        edges: latestEdgesRef.current,
        pluginPortMap,
      });

      if (transaction.outcome === 'noop') {
        onNoop?.(transaction.rejection);
        return transaction;
      }

      applyAcceptedEdgeTransaction({
        transaction,
        baselineDraftSession,
        latestEdgesRef,
        latestDraftSessionRef,
        setDraftSession,
        setEdges,
      });
      onCreated?.();
      return transaction;
    },
    [canonicalNodesById, pluginPortMap, setDraftSession, setEdges]
  );

  const reconnectEdgeCommand = useCallback<RunCanvasEdgeReconnectCommand>(
    ({ edge, connection, onNoop, onReconnected }) => {
      const baselineDraftSession = latestDraftSessionRef.current;
      const transaction = resolveCanvasEdgeReconnectTransaction({
        canonicalNodesById,
        connection,
        draftSession: baselineDraftSession,
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
        baselineDraftSession,
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

  const setExecutionGateCommand = useCallback<CanvasEdgeCommandRunner['setExecutionGate']>(
    (command) => {
      const currentDraftSession = latestDraftSessionRef.current;
      const nextDraftSession = canvasDraftSession.workingSet.setEdgeExecutionGate(
        currentDraftSession,
        command
      );
      if (nextDraftSession === currentDraftSession) {
        return false;
      }

      latestDraftSessionRef.current = nextDraftSession;
      setDraftSession((currentSession) => {
        const updatedSession = canvasDraftSession.workingSet.setEdgeExecutionGate(
          currentSession,
          command
        );
        latestDraftSessionRef.current = updatedSession;
        return updatedSession;
      });
      return true;
    },
    [setDraftSession]
  );

  return {
    createConnection: createConnectionCommand,
    reconnectEdge: reconnectEdgeCommand,
    setExecutionGate: setExecutionGateCommand,
  };
}
