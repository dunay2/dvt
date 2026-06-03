/** Owned concern: decide when remote draft coordinates may seed local Canvas layout persistence. */
import type { CanvasNodePositions } from './canvasAuthoringRuntime.types';

function hasNodePositions(nodePositions: CanvasNodePositions): boolean {
  return Object.keys(nodePositions).length > 0;
}

export function shouldSeedCanvasLayoutFromRemoteDraft({
  persistedNodePositions,
  remoteNodePositions,
}: {
  persistedNodePositions: CanvasNodePositions;
  remoteNodePositions: CanvasNodePositions;
}): boolean {
  return !hasNodePositions(persistedNodePositions) && hasNodePositions(remoteNodePositions);
}
