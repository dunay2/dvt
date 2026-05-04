/**
 * Owned concern: synchronize canonical Canvas route presentation into bootstrap and route-publication seams.
 */
import { useEffect } from 'react';
import { useMatches } from 'react-router';

import { usePublishedRouteBootstrap } from '../../bootstrap/usePublishedRouteBootstrap';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { toRouteBootstrapPresentation } from './canvasDraftPresentationModel';
import {
  CANVAS_ROUTE_ID,
  CANVAS_WORKBENCH_ROUTE_ID,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvasDraftPresentationStore';

function useCanvasBootstrapRouteId(): string {
  const matches = useMatches();
  return matches.some((match) => match.id === CANVAS_WORKBENCH_ROUTE_ID)
    ? CANVAS_WORKBENCH_ROUTE_ID
    : CANVAS_ROUTE_ID;
}

export function useCanvasRoutePresentationSync(
  presentationState: CanvasDraftPresentationState
): void {
  const routeId = useCanvasBootstrapRouteId();

  usePublishedRouteBootstrap(routeId, toRouteBootstrapPresentation(presentationState));

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
