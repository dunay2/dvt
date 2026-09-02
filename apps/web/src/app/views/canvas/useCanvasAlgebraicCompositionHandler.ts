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
  const resolveOperations = useCallback(
    (identity: CanvasAlgebraicCompositionIdentity): CanvasAlgebraicCompositionOperation[] =>
      policy.canEditEdges
        ? resolveCanvasAlgebraicCompositionOperations({
            canonicalNodesById: state.canonicalNodesById,
            draftSession: state.draftSession,
            edges: state.edges,
            pluginPortMap: getPluginPortMap(),
            ...identity,
          })
        : [],
    [policy.canEditEdges, state]
  );

  const composeNodes = useCallback(
    (
      identity: CanvasAlgebraicCompositionIdentity & {
        operation: CanvasAlgebraicCompositionOperation;
      }
    ) => {
      if (!policy.canEditEdges) return;
      const transaction = resolveCanvasAlgebraicCompositionTransaction({
        canonicalNodesById: state.canonicalNodesById,
        draftSession: state.draftSession,
        edges: state.edges,
        pluginPortMap: getPluginPortMap(),
        ...identity,
      });
      if (transaction.outcome !== 'created') return;
      effects.setEdges(transaction.edges);
      effects.setDraftSession(transaction.draftSession);
    },
    [effects, policy.canEditEdges, state]
  );

  return { resolveOperations, composeNodes };
}
