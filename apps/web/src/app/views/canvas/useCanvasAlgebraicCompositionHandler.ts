/** Owned concern: expose supported algebraic composition through ConfigureCanvasDvtNode. */
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanvasGraphInteractionContracts } from './canvasGraphHandlerContracts';
import { canvasViewCopy } from './copy';
import {
  resolveCanvasAlgebraicCompositionOperations,
  resolveCanvasAlgebraicCompositionTransaction,
  type CanvasAlgebraicCompositionIdentity,
  type CanvasAlgebraicCompositionOperation,
} from './canvasAlgebraicComposition';

export function useCanvasAlgebraicCompositionHandler({
  state,
  effects,
  policy,
}: CanvasGraphInteractionContracts) {
  const { canonicalNodesById, draftSession, edges } = state;
  const { setEdges, setDraftSession } = effects;
  const { canEditEdges } = policy;
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const latest = useRef({ draftSession, edges, canEditEdges, canonicalNodesById });
  latest.current = { draftSession, edges, canEditEdges, canonicalNodesById };

  const resolveOperations = useCallback(
    (identity: CanvasAlgebraicCompositionIdentity): CanvasAlgebraicCompositionOperation[] =>
      canEditEdges
        ? resolveCanvasAlgebraicCompositionOperations({
            canonicalNodesById,
            draftSession,
            edges,
            pluginPortMap: getPluginPortMap(),
            ...identity,
          })
        : [],
    [canEditEdges, canonicalNodesById, draftSession, edges]
  );

  const composeNodes = useCallback(
    (
      identity: CanvasAlgebraicCompositionIdentity & {
        operation: CanvasAlgebraicCompositionOperation;
      }
    ) => {
      if (!active.current || !latest.current.canEditEdges) return;
      void resolveCanvasAlgebraicCompositionTransaction({
        canonicalNodesById,
        draftSession,
        edges,
        pluginPortMap: getPluginPortMap(),
        ...identity,
      })
        .then((transaction) => {
          if (
            !active.current ||
            latest.current.canonicalNodesById !== canonicalNodesById ||
            transaction.outcome !== 'created' ||
            latest.current.draftSession !== draftSession ||
            latest.current.edges !== edges ||
            !latest.current.canEditEdges
          )
            return;
          setEdges(transaction.edges);
          setDraftSession(transaction.draftSession);
        })
        .catch(() => toast.error(canvasViewCopy.dependencyCreationFailedMessage));
    },
    [canEditEdges, canonicalNodesById, draftSession, edges, setDraftSession, setEdges]
  );

  return { resolveOperations, composeNodes };
}
