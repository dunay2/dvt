import { beforeEach, describe, expect, it } from 'vitest';

import { getRouteBootstrapRegistration } from '../../bootstrap/routeBootstrapRegistration';
import { canvasViewCopy } from './copy';
import { deriveCanvasDraftPresentationState } from './canvasDraftPresentationModel';
import {
  CANVAS_ROUTE_BOOTSTRAP_HANDLE,
  getCanvasDraftPresentationState,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
} from './canvasDraftPresentationStore';
import { deriveCanvasDraftToolbarState } from './canvasDraftToolbarState';

describe('canvasDraftPresentationStore', () => {
  beforeEach(() => {
    resetCanvasDraftPresentationState();
  });

  it('publishes and resets the external route presentation store', () => {
    const nextState = deriveCanvasDraftPresentationState({
      isBackendCheckPending: false,
      shouldBlockCanvasInApiMode: false,
      backendBlockMessage: null,
      workbenchState: { kind: 'ready' },
      recoveryReason: null,
      draftToolbarState: deriveCanvasDraftToolbarState({
        draftSaveStatus: 'saved',
        recoveryReason: null,
      }),
    });

    publishCanvasDraftPresentationState(nextState);
    expect(getCanvasDraftPresentationState()).toEqual(nextState);

    resetCanvasDraftPresentationState();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'loading_graph',
      bootstrapStatus: 'pending',
      bootstrapDetail: canvasViewCopy.preparingCanvasRouteDetail,
      canCompleteBootstrap: false,
    });
  });

  it('exposes the canonical canvas route-bootstrap handle and registration shape', () => {
    expect(CANVAS_ROUTE_BOOTSTRAP_HANDLE).toEqual({
      mode: 'published',
      initialPresentation: {
        status: 'pending',
        detail: canvasViewCopy.preparingCanvasRouteDetail,
        canComplete: false,
      },
    });

    expect(
      getRouteBootstrapRegistration('dbt.canvas', {
        routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
      })
    ).toEqual({
      routeId: 'dbt.canvas',
      routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
    });
  });
});
