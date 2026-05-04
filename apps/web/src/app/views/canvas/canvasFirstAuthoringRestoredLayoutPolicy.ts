/** Owned concern: decide whether restored route-local layout matches persisted first-node layout. */

import type {
  CanvasFirstAuthoringLayout,
  CanvasFirstAuthoringRestoredDraft,
} from './canvasFirstAuthoringLiveProof.types';

export function hasRestoredLayout(
  restoredDraft: CanvasFirstAuthoringRestoredDraft,
  layout: CanvasFirstAuthoringLayout
): boolean {
  const restoredPosition = restoredDraft.nodePositions[layout.nodeId];

  return (
    restoredPosition != null &&
    restoredPosition.x === layout.position.x &&
    restoredPosition.y === layout.position.y
  );
}
