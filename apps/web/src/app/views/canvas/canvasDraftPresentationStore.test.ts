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
import { deriveCanvasDraftStatusState } from './canvasDraftStatusState';

describe('canvasDraftPresentationStore', () => {
  beforeEach(() => {
    resetCanvasDraftPresentationState();
  });

  it('publishes and resets the external route presentation store', () => {
    const nextState = deriveCanvasDraftPresentationState({
      isBackendCheckPending: false,
      startupBlockState: null,
      workbenchState: { kind: 'ready' },
      recoveryReason: null,
      draftStatusState: deriveCanvasDraftStatusState({
        draftSaveStatus: 'saved',
        recoveryReason: null,
      }),
    });

    publishCanvasDraftPresentationState(nextState);
    expect(getCanvasDraftPresentationState()).toEqual(nextState);

    resetCanvasDraftPresentationState();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'loading_graph',
      routeReadiness: {
        status: 'pending',
        detail: canvasViewCopy.preparingCanvasRouteDetail,
      },
    });
  });

  it('exposes the canonical canvas route-bootstrap handle and registration shape', () => {
    expect(CANVAS_ROUTE_BOOTSTRAP_HANDLE).toEqual({
      mode: 'published',
      initialPresentation: {
        status: 'pending',
        detail: canvasViewCopy.preparingCanvasRouteDetail,
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
