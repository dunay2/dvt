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
import { confirmConnection, proposeConnection } from './canvasConnectionAggregate';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasEdgeAuthoringContracts,
  CanvasEdgeAuthoringPolicy,
  CanvasEdgeAuthoringState,
  ConfirmEdgeModalState,
} from './canvasGraphHandlerContracts';
import { canvasViewCopy, formatCanvasConnectionRejection } from './copy';

type UseCanvasEdgeAuthoringHandlersArgs = CanvasEdgeAuthoringContracts;

type UseCanvasEdgeAuthoringHandlersResult = {
  confirmEdgeModal: ConfirmEdgeModalState;
  setConfirmEdgeModal: Dispatch<SetStateAction<ConfirmEdgeModalState>>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
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
  state,
  effects,
  policy,
  pluginPortMap,
  pendingConnectionRef,
  setConfirmEdgeModal,
}: CanvasEdgeAuthoringContracts & {
  pluginPortMap: ReturnType<typeof getPluginPortMap>;
  pendingConnectionRef: PendingConnectionRef;
  setConfirmEdgeModal: ConfirmEdgeModalSetter;
}) {
  const { canonicalNodesById } = state;
  const { setDraftSession, setEdges } = effects;
  const { canEditEdges } = policy;

  return useCallback(() => {
    if (!canEditEdges) {
      toast.error(canvasViewCopy.mutationUnavailableMessage);
      clearPendingConnection(pendingConnectionRef, setConfirmEdgeModal);
      return;
    }

    const connection = pendingConnectionRef.current;
    if (connection?.source && connection.target) {
      setEdges((existingEdges) => {
        const edgeConfirmation = confirmConnection({
          connection,
          canonicalNodesById,
          edges: existingEdges,
          pluginPortMap,
        });
        if (edgeConfirmation.outcome === 'rejected') {
          notifyRejectedConnection(edgeConfirmation.rejection);
          return existingEdges;
        }

        const nextEdges = edgeConfirmation.nextEdges;
        setDraftSession((currentSession) =>
          canvasGraphLifecycle.edge.replaceVisible(currentSession, nextEdges)
        );
        toast.success(canvasViewCopy.dependencyAddedMessage);
        return nextEdges;
      });
    }

    clearPendingConnection(pendingConnectionRef, setConfirmEdgeModal);
  }, [
    canEditEdges,
    canonicalNodesById,
    pendingConnectionRef,
    pluginPortMap,
    setConfirmEdgeModal,
    setDraftSession,
    setEdges,
  ]);
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

  const onConnect = useCanvasConnectionProposalHandler({
    state,
    policy,
    pluginPortMap,
    pendingConnectionRef,
    setConfirmEdgeModal,
  });

  const confirmEdgeCreation = useCanvasConnectionConfirmationHandler({
    state,
    effects,
    policy,
    pluginPortMap,
    pendingConnectionRef,
    setConfirmEdgeModal,
  });

  return {
    confirmEdgeModal,
    setConfirmEdgeModal,
    onConnect,
    confirmEdgeCreation,
  };
}
