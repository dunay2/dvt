/** Owned concern: maps the broad mutation seam into sub-handler contracts. */

import type {
  CanvasGraphChangeContracts,
  CanvasMutationContracts,
  CanvasSourceImportContracts,
} from './canvasMutationHandlerContracts';

export function buildCanvasGraphChangeContracts(
  contracts: CanvasMutationContracts
): CanvasGraphChangeContracts {
  return {
    state: contracts.state,
    effects: {
      setDraftSession: contracts.effects.setDraftSession,
      setSelectedNodes: contracts.effects.setSelectedNodes,
      setInspectorNode: contracts.effects.setInspectorNode,
    },
  };
}

export function buildCanvasSourceImportContracts(
  contracts: CanvasMutationContracts
): CanvasSourceImportContracts {
  return {
    effects: contracts.effects,
    policy: contracts.policy,
  };
}
