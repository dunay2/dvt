import { describe, expect, it } from 'vitest';

import { buildController } from '../Canvas.test.controller';
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

  it('keeps route interactions readable but non-editable for read-only draft access', () => {
    const controller = buildController({
      draftAccessMode: 'read_only',
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
      canPlan: true,
      canRun: true,
      canEditEdges: false,
    });
    expect(interactionState.readOnlyState).toMatchObject({
      title: 'Limited mutation access',
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
