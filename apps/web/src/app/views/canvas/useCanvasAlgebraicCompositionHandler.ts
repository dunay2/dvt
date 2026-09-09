/** Owned concern: expose supported algebraic composition through ConfigureCanvasDvtNode. */
import { useCallback } from 'react';

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
      if (!canEditEdges) return;
      const transaction = resolveCanvasAlgebraicCompositionTransaction({
        canonicalNodesById,
        draftSession,
        edges,
        pluginPortMap: getPluginPortMap(),
        ...identity,
      });
      if (transaction.outcome !== 'created') return;
      setEdges(transaction.edges);
      setDraftSession(transaction.draftSession);
    },
    [canEditEdges, canonicalNodesById, draftSession, edges, setDraftSession, setEdges]
  );

  return { resolveOperations, composeNodes };
}
