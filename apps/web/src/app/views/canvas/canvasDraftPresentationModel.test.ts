import { describe, expect, it } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  deriveCanvasDraftPresentationState,
  toRouteBootstrapPresentation,
} from './canvasDraftPresentationModel';
import { deriveCanvasDraftToolbarState } from './canvasDraftToolbarState';

describe('canvasDraftPresentationModel', () => {
  it('prioritizes backend blocked posture over recovery in the route presentation', () => {
    const draftToolbarState = deriveCanvasDraftToolbarState({
      draftSaveStatus: 'saved',
      recoveryReason: 'missing_remote',
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        shouldBlockCanvasInApiMode: true,
        backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
        workbenchState: { kind: 'ready' },
        recoveryReason: 'missing_remote',
        draftToolbarState,
      })
    ).toMatchObject({
      routeState: 'blocked_backend',
      bootstrapStatus: 'blocked',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: false,
    });
  });

  it('publishes recovery posture as blocked bootstrap state', () => {
    const draftToolbarState = deriveCanvasDraftToolbarState({
      draftSaveStatus: 'saved',
      recoveryReason: 'stale_conflict',
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        shouldBlockCanvasInApiMode: false,
        backendBlockMessage: null,
        workbenchState: { kind: 'ready' },
        recoveryReason: 'stale_conflict',
        draftToolbarState,
      })
    ).toMatchObject({
      routeState: 'recovery',
      bootstrapStatus: 'blocked',
      bootstrapDetail: canvasViewCopy.staleDraftMessage,
      canCompleteBootstrap: false,
    });
  });

  it('publishes empty and ready posture as bootstrap-completable states', () => {
    const draftToolbarState = deriveCanvasDraftToolbarState({
      draftSaveStatus: 'idle',
      recoveryReason: null,
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        shouldBlockCanvasInApiMode: false,
        backendBlockMessage: null,
        workbenchState: { kind: 'empty' },
        recoveryReason: null,
        draftToolbarState,
      })
    ).toMatchObject({
      routeState: 'empty',
      bootstrapStatus: 'complete',
      canCompleteBootstrap: true,
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        shouldBlockCanvasInApiMode: false,
        backendBlockMessage: null,
        workbenchState: { kind: 'ready' },
        recoveryReason: null,
        draftToolbarState,
      })
    ).toMatchObject({
      routeState: 'ready',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.canvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });

  it('maps the canvas route presentation into the generic bootstrap contract', () => {
    const draftToolbarState = deriveCanvasDraftToolbarState({
      draftSaveStatus: 'idle',
      recoveryReason: null,
    });
    const presentationState = deriveCanvasDraftPresentationState({
      isBackendCheckPending: false,
      shouldBlockCanvasInApiMode: false,
      backendBlockMessage: null,
      workbenchState: { kind: 'ready' },
      recoveryReason: null,
      draftToolbarState,
    });

    expect(toRouteBootstrapPresentation(presentationState)).toEqual({
      status: 'complete',
      detail: canvasViewCopy.canvasReadyDetail,
      canComplete: true,
    });
  });
});
