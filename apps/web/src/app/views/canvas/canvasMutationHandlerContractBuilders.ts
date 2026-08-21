/** Owned concern: maps the broad mutation seam into sub-handler contracts. */

import type {
  CanvasGraphChangeContracts,
  CanvasMutationContracts,
  CanvasSourceImportContracts,
} from './canvasMutationHandlerContracts';

function graphChange(contracts: CanvasMutationContracts): CanvasGraphChangeContracts {
  return {
    state: contracts.state,
    effects: {
      setDraftSession: contracts.effects.setDraftSession,
      reconcileSelectionAfterNodeRemoval: contracts.effects.reconcileSelectionAfterNodeRemoval,
      setInspectorNode: contracts.effects.setInspectorNode,
      onLayoutComplete: contracts.effects.onLayoutComplete,
    },
  };
}

function sourceImport(contracts: CanvasMutationContracts): CanvasSourceImportContracts {
  return {
    state: {
      graphModel: contracts.state.graphModel,
    },
    effects: {
      setDraftSession: contracts.effects.setDraftSession,
      setInspectorNode: contracts.effects.setInspectorNode,
      setCurrentPlan: contracts.effects.setCurrentPlan,
      onLayoutComplete: contracts.effects.onLayoutComplete,
      invalidateInFlightSaveAttempt: contracts.effects.invalidateInFlightSaveAttempt,
    },
    policy: contracts.policy,
  };
}

export const canvasMutationHandlerContractBuilders = {
  graphChange,
  sourceImport,
};
