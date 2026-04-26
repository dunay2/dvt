/** Owned concern: translate edge-authoring gestures into governed connection proposals and confirmations. */

import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { toast } from 'sonner';

import { getPluginPortMap } from '../../plugins/registry';
import { proposeConnection } from './canvasConnectionAggregate';
import type {
  CanvasEdgeAuthoringContracts,
  CanvasEdgeAuthoringPolicy,
  CanvasEdgeAuthoringState,
  ConfirmEdgeModalState,
} from './canvasGraphHandlerContracts';
import { canvasViewCopy, formatCanvasConnectionRejection } from './copy';
import {
  useCanvasEdgeCommandRunner,
  type CanvasEdgeCommandRunner,
} from './useCanvasEdgeCommandRunner';

type UseCanvasEdgeAuthoringHandlersArgs = CanvasEdgeAuthoringContracts;

type UseCanvasEdgeAuthoringHandlersResult = {
  confirmEdgeModal: ConfirmEdgeModalState;
  setConfirmEdgeModal: Dispatch<SetStateAction<ConfirmEdgeModalState>>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  confirmEdgeCreation: () => void;
};

type PendingConnection = Parameters<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>[0];
type PendingConnectionRef = MutableRefObject<PendingConnection | null>;
type ConfirmEdgeModalSetter = Dispatch<SetStateAction<ConfirmEdgeModalState>>;
type CanvasConnectionProposalContracts = {
  state: CanvasEdgeAuthoringState;
  policy: CanvasEdgeAuthoringPolicy;
};

function clearPendingConnection(
  pendingConnectionRef: PendingConnectionRef,
  setConfirmEdgeModal: ConfirmEdgeModalSetter
) {
  pendingConnectionRef.current = null;
  setConfirmEdgeModal({ open: false, edge: null });
}

function openPendingConnectionConfirmation(args: {
  pendingConnectionRef: PendingConnectionRef;
  setConfirmEdgeModal: ConfirmEdgeModalSetter;
  connection: PendingConnection;
  sourceLabel: string;
  targetLabel: string;
  edgeType: string;
}) {
  args.setConfirmEdgeModal({
    open: true,
    edge: {
      source: args.sourceLabel,
      target: args.targetLabel,
      type: args.edgeType,
    },
  });
  args.pendingConnectionRef.current = args.connection;
}

function notifyRejectedConnection(
  rejection: Parameters<typeof formatCanvasConnectionRejection>[0]
) {
  toast.error(formatCanvasConnectionRejection(rejection));
}

function useCanvasConnectionProposalHandler({
  state,
  policy,
  pluginPortMap,
  pendingConnectionRef,
  setConfirmEdgeModal,
}: CanvasConnectionProposalContracts & {
  pluginPortMap: ReturnType<typeof getPluginPortMap>;
  pendingConnectionRef: PendingConnectionRef;
  setConfirmEdgeModal: ConfirmEdgeModalSetter;
}) {
  const { canonicalNodesById, edges } = state;
  const { canEditEdges } = policy;

  return useCallback<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>(
    (connection) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const proposedConnection = proposeConnection({
        connection,
        canonicalNodesById,
        edges,
        pluginPortMap,
      });
      if (proposedConnection.outcome === 'rejected') {
        notifyRejectedConnection(proposedConnection.rejection);
        return;
      }

      openPendingConnectionConfirmation({
        pendingConnectionRef,
        setConfirmEdgeModal,
        connection,
        sourceLabel: proposedConnection.sourceNode.name,
        targetLabel: proposedConnection.targetNode.name,
        edgeType: proposedConnection.edgeType,
      });
    },
    [
      canEditEdges,
      canonicalNodesById,
      edges,
      pendingConnectionRef,
      pluginPortMap,
      setConfirmEdgeModal,
    ]
  );
}

function useCanvasConnectionConfirmationHandler({
  edgeCommandRunner,
  policy,
  pendingConnectionRef,
  setConfirmEdgeModal,
}: {
  edgeCommandRunner: CanvasEdgeCommandRunner;
  policy: CanvasEdgeAuthoringPolicy;
  pendingConnectionRef: PendingConnectionRef;
  setConfirmEdgeModal: ConfirmEdgeModalSetter;
}) {
  const { canEditEdges } = policy;

  return useCallback(() => {
    if (!canEditEdges) {
      toast.error(canvasViewCopy.mutationUnavailableMessage);
      clearPendingConnection(pendingConnectionRef, setConfirmEdgeModal);
      return;
    }

    const connection = pendingConnectionRef.current;
    if (connection?.source && connection.target) {
      edgeCommandRunner.confirmConnection({
        connection,
        onNoop: notifyRejectedConnection,
        onConfirmed: () => {
          toast.success(canvasViewCopy.dependencyAddedMessage);
        },
      });
    }

    clearPendingConnection(pendingConnectionRef, setConfirmEdgeModal);
  }, [canEditEdges, edgeCommandRunner, pendingConnectionRef, setConfirmEdgeModal]);
}

function useCanvasEdgeReconnectHandler({
  edgeCommandRunner,
  policy,
}: {
  edgeCommandRunner: CanvasEdgeCommandRunner;
  policy: CanvasEdgeAuthoringPolicy;
}) {
  const { canEditEdges } = policy;

  return useCallback<NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>>(
    (edge, connection) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      edgeCommandRunner.reconnectEdge({
        edge,
        connection,
        onNoop: notifyRejectedConnection,
      });
    },
    [canEditEdges, edgeCommandRunner]
  );
}

export function useCanvasEdgeAuthoringHandlers({
  state,
  effects,
  policy,
}: UseCanvasEdgeAuthoringHandlersArgs): UseCanvasEdgeAuthoringHandlersResult {
  const pendingConnectionRef = useRef<PendingConnection | null>(null);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<ConfirmEdgeModalState>({
    open: false,
    edge: null,
  });
  const pluginPortMap = useMemo(() => getPluginPortMap(), []);
  const edgeCommandRunner = useCanvasEdgeCommandRunner({
    state,
    effects,
    pluginPortMap,
  });

  const onConnect = useCanvasConnectionProposalHandler({
    state,
    policy,
    pluginPortMap,
    pendingConnectionRef,
    setConfirmEdgeModal,
  });

  const confirmEdgeCreation = useCanvasConnectionConfirmationHandler({
    edgeCommandRunner,
    policy,
    pendingConnectionRef,
    setConfirmEdgeModal,
  });
  const onReconnect = useCanvasEdgeReconnectHandler({
    edgeCommandRunner,
    policy,
  });

  return {
    confirmEdgeModal,
    setConfirmEdgeModal,
    onConnect,
    onReconnect,
    confirmEdgeCreation,
  };
}
