import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getPluginPortMap } from '../../plugins/registry';
import { canvasViewCopy } from './copy';
import { confirmConnection, proposeConnection } from './canvasGraphAggregate';
import { replaceCanvasVisibleEdges } from './canvasInteractionCommands';
import type {
  ConfirmEdgeModalState,
  UseCanvasGraphHandlersParams,
  UseCanvasGraphHandlersResult,
} from './useCanvasGraphHandlers.types';

type UseCanvasEdgeAuthoringHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  'canonicalNodesById' | 'edges' | 'canEditEdges' | 'setEdges' | 'setDraftSession'
>;

type UseCanvasEdgeAuthoringHandlersResult = Pick<
  UseCanvasGraphHandlersResult,
  'confirmEdgeModal' | 'setConfirmEdgeModal' | 'onConnect' | 'confirmEdgeCreation'
>;

export function useCanvasEdgeAuthoringHandlers({
  canonicalNodesById,
  edges,
  canEditEdges,
  setEdges,
  setDraftSession,
}: UseCanvasEdgeAuthoringHandlersArgs): UseCanvasEdgeAuthoringHandlersResult {
  const pendingConnectionRef = useRef<Parameters<
    NonNullable<ReactFlowProps<Node, Edge>['onConnect']>
  >[0] | null>(null);
  const [confirmEdgeModal, setConfirmEdgeModal] = useState<ConfirmEdgeModalState>({
    open: false,
    edge: null,
  });
  const pluginPortMap = useMemo(() => getPluginPortMap(), []);

  const onConnect = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>(
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
        toast.error(proposedConnection.reason);
        return;
      }

      setConfirmEdgeModal({
        open: true,
        edge: {
          source: proposedConnection.sourceNode.name,
          target: proposedConnection.targetNode.name,
          type: proposedConnection.edgeType,
        },
      });
      pendingConnectionRef.current = connection;
    },
    [canEditEdges, canonicalNodesById, edges, pluginPortMap]
  );

  const confirmEdgeCreation = useCallback(() => {
    if (!canEditEdges) {
      toast.error(canvasViewCopy.mutationUnavailableMessage);
      pendingConnectionRef.current = null;
      setConfirmEdgeModal({ open: false, edge: null });
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
          toast.error(edgeConfirmation.reason);
          return existingEdges;
        }

        const nextEdges = edgeConfirmation.nextEdges;
        setDraftSession((currentSession) => replaceCanvasVisibleEdges(currentSession, nextEdges));
        toast.success('Dependency added');
        return nextEdges;
      });
    }

    pendingConnectionRef.current = null;
    setConfirmEdgeModal({ open: false, edge: null });
  }, [canEditEdges, canonicalNodesById, pluginPortMap, setDraftSession, setEdges]);

  return {
    confirmEdgeModal,
    setConfirmEdgeModal,
    onConnect,
    confirmEdgeCreation,
  };
}
