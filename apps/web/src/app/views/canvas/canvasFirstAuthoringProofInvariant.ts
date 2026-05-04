/** Owned concern: assert completed first-authoring proof invariants. */

import type { CanvasFirstAuthoringLiveProof } from './canvasFirstAuthoringLiveProof.types';

export function isCanvasFirstAuthoringProofComplete(proof: CanvasFirstAuthoringLiveProof): boolean {
  return proof.kind === 'restored';
}

export function assertCanvasFirstAuthoringInvariant(
  proof: CanvasFirstAuthoringLiveProof
): asserts proof is CanvasFirstAuthoringLiveProof {
  if (proof.kind !== 'restored') {
    return;
  }

  if (proof.layout.nodeId !== proof.node.id) {
    throw new Error('restored proof layout must belong to the created node');
  }
}
