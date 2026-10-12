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
    effects: {
      setDraftSession: contracts.effects.setDraftSession,
      setCurrentPlan: contracts.effects.setCurrentPlan,
      invalidateInFlightSaveAttempt: contracts.effects.invalidateInFlightSaveAttempt,
    },
    policy: contracts.policy,
  };
}

export const canvasMutationHandlerContractBuilders = {
  graphChange,
  sourceImport,
};
