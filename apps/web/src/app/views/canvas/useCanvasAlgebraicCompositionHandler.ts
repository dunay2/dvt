/** Owned concern: expose supported algebraic composition through ConfigureCanvasDvtNode. */
import { useCallback, useEffect, useRef } from 'react';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanvasGraphInteractionContracts } from './canvasGraphHandlerContracts';
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
    async (
      identity: CanvasAlgebraicCompositionIdentity & {
        operation: CanvasAlgebraicCompositionOperation;
      }
    ) => {
      if (!active.current || !latest.current.canEditEdges) return;
      const transaction = await resolveCanvasAlgebraicCompositionTransaction({
        canonicalNodesById,
        draftSession,
        edges,
        pluginPortMap: getPluginPortMap(),
        ...identity,
      });
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
    },
    [canEditEdges, canonicalNodesById, draftSession, edges, setDraftSession, setEdges]
  );

  return { resolveOperations, composeNodes };
}
