import { describe, expect, it } from 'vitest';

import { buildController } from '../Canvas.test.controller';
import { deriveCanvasDraftAccessPosture } from './canvasDraftAccessPostureModel';
import { deriveCanvasRouteInteractionState } from './canvasRouteInteractionState';

describe('canvasRouteInteractionState', () => {
  it('converts draft transport failures into a route-safe disabled interaction posture', () => {
    const controller = buildController({
      explorerNodes: [
        {
          id: 'node.orders',
          name: 'orders',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
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

  it('fails closed with disabled-plugin copy when a registered canvas kind is unavailable', () => {
    const controller = buildController();
    const interactionState = deriveCanvasRouteInteractionState(
      buildController({
        canvasDocument: {
          kind: 'dbt',
          title: 'dbt canvas',
        },
        availableCanvasKinds: controller.availableCanvasKinds.filter(
          (registration) => registration.kind !== 'dbt'
        ),
      }),
      null
    );

    expect(interactionState.effectiveWorkbenchState).toEqual({
      kind: 'error',
      message:
        'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.',
    });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
    expect(interactionState.workbenchErrorMessage).toBe(
      'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.'
    );
  });

  it('keeps route interactions readable but non-editable for read-only draft access', () => {
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
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
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

  it('fails closed when the canvas route is mounted outside api runtime mode', () => {
    const controller = buildController({
      dataSourceMode: 'mock',
    });

    const interactionState = deriveCanvasRouteInteractionState(controller, null);

    expect(interactionState.startupBlockState).toEqual({
      kind: 'runtime_mode',
      title: 'Canvas runtime unavailable',
      message: 'Canvas authoring requires API runtime mode and protected workspace draft access.',
    });
    expect(interactionState.effectiveWorkbenchState).toEqual({ kind: 'ready' });
    expect(interactionState.effectiveUserPermissions).toMatchObject({
      canPlan: false,
      canRun: false,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toBeNull();
  });

  it('blocks interactions in api mode before backend readiness is available', () => {
    const controller = buildController({
      dataSourceMode: 'api',
      backendReady: false,
    });

    const interactionState = deriveCanvasRouteInteractionState(controller, null);

    expect(interactionState.startupBlockState).toEqual({
      kind: 'backend_readiness',
      title: 'Backend not ready',
      message: 'Canvas stays blocked until backend readiness is restored in API mode.',
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
