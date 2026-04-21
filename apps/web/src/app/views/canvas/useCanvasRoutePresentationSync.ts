/**
 * Owned concern: synchronize canonical Canvas route presentation into bootstrap and route-publication seams.
 */
import { useEffect } from 'react';

import { usePublishedRouteBootstrap } from '../../bootstrap/usePublishedRouteBootstrap';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { toRouteBootstrapPresentation } from './canvasDraftPresentationModel';
import {
  CANVAS_ROUTE_ID,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvasDraftPresentationStore';

export function useCanvasRoutePresentationSync(
  presentationState: CanvasDraftPresentationState
): void {
  usePublishedRouteBootstrap(
    CANVAS_ROUTE_ID,
    toRouteBootstrapPresentation(presentationState)
  );

  useEffect(() => {
    publishCanvasDraftPresentationState(presentationState);
  }, [
    presentationState.bootstrapDetail,
    presentationState.bootstrapStatus,
    presentationState.canCompleteBootstrap,
    presentationState.draftToolbarState.label,
    presentationState.draftToolbarState.showReloadAction,
    presentationState.draftToolbarState.tone,
    presentationState.recoveryReason,
    presentationState.routeState,
  ]);

  useEffect(() => {
    return () => {
      resetCanvasDraftPresentationState();
    };
  }, []);
}
