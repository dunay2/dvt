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
      setSelectedNodes: contracts.effects.setSelectedNodes,
      setInspectorNode: contracts.effects.setInspectorNode,
      onLayoutComplete: contracts.effects.onLayoutComplete,
    },
  };
}

function sourceImport(contracts: CanvasMutationContracts): CanvasSourceImportContracts {
  return {
    effects: contracts.effects,
    policy: contracts.policy,
  };
}

export const canvasMutationHandlerContractBuilders = {
  graphChange,
  sourceImport,
};
