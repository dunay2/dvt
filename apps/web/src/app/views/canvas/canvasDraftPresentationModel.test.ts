import { describe, expect, it } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  deriveCanvasDraftPresentationState,
  toRouteBootstrapPresentation,
} from './canvasDraftPresentationModel';
import { deriveCanvasDraftStatusState } from './canvasDraftStatusState';

describe('canvasDraftPresentationModel', () => {
  it('publishes backend readiness failure as a routable blocked canvas posture after shell startup', () => {
    const draftStatusState = deriveCanvasDraftStatusState({
      draftSaveStatus: 'saved',
      recoveryReason: 'missing_remote',
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        startupBlockState: {
          kind: 'backend_readiness',
          title: 'Backend not ready',
          message: 'Readiness not satisfied: database_not_configured.',
        },
        workbenchState: { kind: 'ready' },
        recoveryReason: 'missing_remote',
        draftStatusState,
      })
    ).toMatchObject({
      routeState: 'blocked_backend',
      routeReadiness: {
        status: 'complete',
        detail: 'Readiness not satisfied: database_not_configured.',
      },
    });
  });

  it('publishes recovery posture as blocked bootstrap state', () => {
    const draftStatusState = deriveCanvasDraftStatusState({
      draftSaveStatus: 'saved',
      recoveryReason: 'stale_conflict',
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        startupBlockState: null,
        workbenchState: { kind: 'ready' },
        recoveryReason: 'stale_conflict',
        draftStatusState,
      })
    ).toMatchObject({
      routeState: 'recovery',
      routeReadiness: {
        status: 'blocked',
        detail: canvasViewCopy.staleDraftMessage,
      },
    });
  });

  it('publishes empty and ready posture as bootstrap-completable states', () => {
    const draftStatusState = deriveCanvasDraftStatusState({
      draftSaveStatus: 'idle',
      recoveryReason: null,
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        startupBlockState: null,
        workbenchState: { kind: 'empty' },
        recoveryReason: null,
        draftStatusState,
      })
    ).toMatchObject({
      routeState: 'empty',
      routeReadiness: { status: 'complete' },
    });

    expect(
      deriveCanvasDraftPresentationState({
        isBackendCheckPending: false,
        startupBlockState: null,
        workbenchState: { kind: 'ready' },
        recoveryReason: null,
        draftStatusState,
      })
    ).toMatchObject({
      routeState: 'ready',
      routeReadiness: {
        status: 'complete',
        detail: canvasViewCopy.canvasReadyDetail,
      },
    });
  });

  it('maps the canvas route presentation into the generic bootstrap contract', () => {
    const draftStatusState = deriveCanvasDraftStatusState({
      draftSaveStatus: 'idle',
      recoveryReason: null,
    });
    const presentationState = deriveCanvasDraftPresentationState({
      isBackendCheckPending: false,
      startupBlockState: null,
      workbenchState: { kind: 'ready' },
      recoveryReason: null,
      draftStatusState,
    });

    expect(toRouteBootstrapPresentation(presentationState)).toEqual({
      status: 'complete',
      detail: canvasViewCopy.canvasReadyDetail,
    });
  });
});
