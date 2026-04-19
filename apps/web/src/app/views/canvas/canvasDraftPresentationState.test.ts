import { beforeEach, describe, expect, it } from 'vitest';

import { getRouteBootstrapRegistration } from '../../bootstrap/routeBootstrapRegistration';
import { canvasViewCopy } from './copy';
import {
  CANVAS_ROUTE_BOOTSTRAP_HANDLE,
  deriveCanvasDraftPresentationState,
  deriveCanvasDraftToolbarState,
  deriveDraftRecoveryReason,
  getCanvasDraftPresentationState,
  publishCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
  toRouteBootstrapPresentation,
} from './canvasDraftPresentationState';

describe('canvasDraftPresentationState', () => {
  beforeEach(() => {
    resetCanvasDraftPresentationState();
  });

  it('derives stale_conflict with highest precedence', () => {
    expect(
      deriveDraftRecoveryReason({
        hasMissingRemoteDraft: true,
        hasStaleDraftVersion: true,
        hasDraftProjectionGap: true,
      })
    ).toBe('stale_conflict');
  });

  it('derives missing_remote when the persisted draft disappeared', () => {
    expect(
      deriveDraftRecoveryReason({
        hasMissingRemoteDraft: true,
        hasStaleDraftVersion: false,
        hasDraftProjectionGap: true,
      })
    ).toBe('missing_remote');
  });

  it('derives projection_gap when projection completeness is incomplete', () => {
    expect(
      deriveDraftRecoveryReason({
        hasMissingRemoteDraft: false,
        hasStaleDraftVersion: false,
        hasDraftProjectionGap: true,
      })
    ).toBe('projection_gap');
  });

  it('uses neutral draft labels when no recovery is active', () => {
    expect(
      deriveCanvasDraftToolbarState({
        draftSaveStatus: 'idle',
        recoveryReason: null,
      }).label
    ).toBe(canvasViewCopy.draftSyncedLabel);
    expect(
      deriveCanvasDraftToolbarState({
        draftSaveStatus: 'saving',
        recoveryReason: null,
      }).label
    ).toBe(canvasViewCopy.savingDraftLabel);
  });

  it('uses warning and danger toolbar states for recovery reasons', () => {
    expect(
      deriveCanvasDraftToolbarState({
        draftSaveStatus: 'saved',
        recoveryReason: 'stale_conflict',
      })
    ).toEqual({
      label: canvasViewCopy.staleVersionLabel,
      tone: 'danger',
      showReloadAction: true,
    });

    expect(
      deriveCanvasDraftToolbarState({
        draftSaveStatus: 'saved',
        recoveryReason: 'missing_remote',
      })
    ).toEqual({
      label: canvasViewCopy.draftMissingLabel,
      tone: 'warning',
      showReloadAction: true,
    });
  });

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
