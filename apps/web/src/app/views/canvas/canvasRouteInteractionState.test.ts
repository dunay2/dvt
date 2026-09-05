// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { buildController, type CanvasController } from '../Canvas.test.controller';
import { deriveCanvasDraftAccessPosture } from './canvasDraftAccessPostureModel';
import { deriveCanvasRouteInteractionState } from './canvasRouteInteractionState';

function buildReadyNodes(): CanvasController['nodesWithImpact'] {
  return [
    {
      id: 'node.ready',
      position: { x: 0, y: 0 },
      data: {},
    },
  ] as unknown as CanvasController['nodesWithImpact'];
}

describe('canvasRouteInteractionState', () => {
  it('converts draft transport failures into a route-safe disabled interaction posture', () => {
    const controller = buildController({
      nodesWithImpact: [
        {
          id: 'node.orders',
          position: { x: 0, y: 0 },
          data: {
            name: 'orders',
            pluginKind: 'dvt:transform',
          },
        },
      ] as unknown as CanvasController['nodesWithImpact'],
    });

    const interactionState = deriveCanvasRouteInteractionState(controller, {
      kind: 'format_error',
      title: 'Draft schema unsupported',
      message: 'Stored schema version is unsupported.',
    });

    expect(interactionState.effectiveWorkbenchState).toEqual({
      kind: 'error',
      message: 'Stored schema version is unsupported.',
    });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
    expect(interactionState.workbenchErrorMessage).toBe('Stored schema version is unsupported.');
  });

  it('fails closed when a persisted canvas document uses an unsupported kind', () => {
    const interactionState = deriveCanvasRouteInteractionState(
      buildController({
        canvasDocument: {
          kind: 'unknown',
          title: 'Unknown canvas',
        },
      }),
      null
    );

    expect(interactionState.effectiveWorkbenchState).toEqual({
      kind: 'error',
      message:
        'Canvas cannot open persisted canvas kind "unknown" because no runtime registration is available.',
    });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
    expect(interactionState.workbenchErrorMessage).toBe(
      'Canvas cannot open persisted canvas kind "unknown" because no runtime registration is available.'
    );
  });

  it('fails closed when a retired canvas kind has no runtime registration', () => {
    const interactionState = deriveCanvasRouteInteractionState(
      buildController({
        canvasDocument: {
          kind: 'dbt',
          title: 'dbt canvas',
        },
      }),
      null
    );

    expect(interactionState.effectiveWorkbenchState).toEqual({
      kind: 'error',
      message:
        'Canvas cannot open persisted canvas kind "dbt" because no runtime registration is available.',
    });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
    expect(interactionState.workbenchErrorMessage).toBe(
      'Canvas cannot open persisted canvas kind "dbt" because no runtime registration is available.'
    );
  });

  it('keeps route interactions inspectable but non-executable for read-only draft access', () => {
    const draftAccessPosture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'read_only',
      draftCapabilityReason: 'write_denied',
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'idle',
    });
    const controller = buildController({
      draftAccessMode: 'read_only',
      draftAccessPosture,
      nodesWithImpact: buildReadyNodes(),
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canPersistGraphDraft: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    const interactionState = deriveCanvasRouteInteractionState(controller, null);

    expect(interactionState.startupBlockState).toBeNull();
    expect(interactionState.effectiveWorkbenchState).toEqual({ kind: 'ready' });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toMatchObject({
      title: 'Read-only canvas',
    });
    expect(interactionState.workbenchErrorMessage).toBeNull();
  });

  it('keeps writable autosave from becoming a limited-access layout state', () => {
    const draftAccessPosture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'writable',
      draftCapabilityReason: null,
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'saving',
    });
    const interactionState = deriveCanvasRouteInteractionState(
      buildController({
        authorizationPermissions: {
          canPlan: true,
          canRun: true,
          canEditEdges: true,
          canPersistGraphDraft: true,
          canManagePlugins: false,
          canManageRBAC: false,
        },
        draftAccessMode: 'writable',
        draftAccessPosture,
        draftSaveStatus: 'saving',
        nodesWithImpact: buildReadyNodes(),
        userPermissions: {
          canPlan: true,
          canRun: false,
          canEditEdges: true,
          canPersistGraphDraft: true,
          canManagePlugins: false,
          canManageRBAC: false,
        },
      }),
      null
    );

    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: true,
      canRun: false,
      canEditEdges: true,
    });
    expect(interactionState.readOnlyState).toBeNull();
  });

  it('keeps real limited permissions visible during autosave', () => {
    const draftAccessPosture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'writable',
      draftCapabilityReason: null,
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'saving',
    });
    const limitedPermissions = {
      canPlan: true,
      canRun: false,
      canEditEdges: true,
      canPersistGraphDraft: true,
      canManagePlugins: false,
      canManageRBAC: false,
    };
    const interactionState = deriveCanvasRouteInteractionState(
      buildController({
        authorizationPermissions: limitedPermissions,
        draftAccessPosture,
        draftSaveStatus: 'saving',
        nodesWithImpact: buildReadyNodes(),
        userPermissions: limitedPermissions,
      }),
      null
    );

    expect(interactionState.readOnlyState).not.toBeNull();
  });

  it('blocks interactions before backend readiness is available', () => {
    const controller = buildController({
      backendReady: false,
      nodesWithImpact: buildReadyNodes(),
    });

    const interactionState = deriveCanvasRouteInteractionState(controller, null);

    expect(interactionState.startupBlockState).toEqual({
      kind: 'backend_readiness',
      title: 'Backend not ready',
      message: 'Canvas stays blocked until backend readiness is restored.',
    });
    expect(interactionState.effectiveWorkbenchState).toEqual({ kind: 'ready' });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
    expect(interactionState.workbenchErrorMessage).toBeNull();
  });
});
