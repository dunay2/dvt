/** Owned concern: serialize Canvas edge command effects over one local snapshot. */
import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { Connection, Edge } from '@xyflow/react';
import type { WorkspaceGraphAuthoringEdgeExecutionGateCommand } from '@dvt/contracts';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasConnectionRejection } from './canvasConnectionAggregate';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { applyAcceptedEdgeTransaction } from './canvasEdgeCommandEffects';
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
  canEditEdges: boolean;
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
) => Promise<CanvasEdgeAdmissionTransaction>;

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

export function useCanvasEdgeCommandRunner({
  state,
  effects,
  pluginPortMap,
  canEditEdges,
}: UseCanvasEdgeCommandRunnerArgs): CanvasEdgeCommandRunner {
  const { canonicalNodesById, draftSession, edges } = state;
  const { setDraftSession, setEdges } = effects;
  const latestEdgesRef = useRef(edges);
  const latestDraftSessionRef = useRef(draftSession);
  latestEdgesRef.current = edges;
  latestDraftSessionRef.current = draftSession;
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const latestPolicy = useRef({ canEditEdges, canonicalNodesById, pluginPortMap });
  latestPolicy.current = { canEditEdges, canonicalNodesById, pluginPortMap };

  const createConnectionCommand = useCallback<RunCanvasEdgeCreationCommand>(
    async ({ connection, onNoop, onCreated }) => {
      if (!active.current || !latestPolicy.current.canEditEdges) {
        return { outcome: 'noop', rejection: { code: 'graph_changed' } };
      }
      const baselineDraftSession = latestDraftSessionRef.current;
      const baselineEdges = latestEdgesRef.current;
      const transaction = await resolveCanvasEdgeCreationTransaction({
        canonicalNodesById,
        connection,
        draftSession: baselineDraftSession,
        edges: baselineEdges,
        pluginPortMap,
      });

      if (
        !active.current ||
        !latestPolicy.current.canEditEdges ||
        latestPolicy.current.canonicalNodesById !== canonicalNodesById ||
        latestPolicy.current.pluginPortMap !== pluginPortMap ||
        latestDraftSessionRef.current !== baselineDraftSession ||
        latestEdgesRef.current !== baselineEdges
      ) {
        const rejection: CanvasConnectionRejection = { code: 'graph_changed' };
        if (active.current) onNoop?.(rejection);
        return { outcome: 'noop', rejection };
      }

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
      if (!active.current || !latestPolicy.current.canEditEdges) {
        return { outcome: 'noop', rejection: { code: 'graph_changed' } };
      }
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
      if (!active.current || !latestPolicy.current.canEditEdges) return false;
      const currentDraftSession = latestDraftSessionRef.current;
      const nextDraftSession = canvasDraftSession.workingSet.setEdgeExecutionGate(
        currentDraftSession,
        command
      );
      if (nextDraftSession === currentDraftSession) return false;

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
