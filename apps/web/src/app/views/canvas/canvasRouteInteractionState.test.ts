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

    expect(interactionState.shouldBlockCanvasInApiMode).toBe(false);
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

  it('blocks interactions in api mode before backend readiness is available', () => {
    const controller = buildController({
      dataSourceMode: 'api',
      backendReady: false,
    });

    const interactionState = deriveCanvasRouteInteractionState(controller, null);

    expect(interactionState.shouldBlockCanvasInApiMode).toBe(true);
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
