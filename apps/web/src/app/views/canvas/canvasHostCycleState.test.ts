import { describe, expect, it, vi } from 'vitest';

import { deriveCanvasHostCycleState } from './canvasHostCycleState';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';

function buildCanvasKinds(): readonly CanvasKindRegistration[] {
  return [
    {
      kind: 'dbt',
      pluginId: 'dbt',
      label: 'dbt',
      description: 'dbt canvas',
      createTitle: 'dbt canvas',
      nodeKinds: [],
    },
    {
      kind: 'transformation',
      pluginId: 'dvt',
      label: 'Transformation',
      description: 'Transformation canvas',
      createTitle: 'Transformation canvas',
      nodeKinds: [],
    },
  ];
}

function buildArgs(
  overrides: Partial<CanvasWorkbenchSurfaceArgs> = {}
): CanvasWorkbenchSurfaceArgs {
  return {
    presentationState: {
      routeState: 'needs_canvas',
      recoveryReason: null,
      draftStatusState: {
        label: 'Draft synced',
        tone: 'neutral',
        showReloadAction: false,
      },
      routeReadiness: {
        status: 'complete',
        detail: 'ready',
      },
    },
    workspaceScope: {
      tenantId: 'tenant-a',
      projectId: 'project-orders',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    },
    startupBlockState: null,
    workbenchErrorMessage: null,
    canvasDocument: null,
    draftSaveStatus: 'saved',
    availableCanvasKinds: buildCanvasKinds(),
    canCreateCanvasDocument: true,
    onCreateCanvasDocument: vi.fn(),
    ...overrides,
  };
}

describe('canvasHostCycleState', () => {
  it('derives the first-canvas creation cycle from host posture', () => {
    const cycle = deriveCanvasHostCycleState(buildArgs());

    expect(cycle).toEqual({
      kind: 'needs_canvas',
      availableCanvasKinds: buildCanvasKinds(),
      onCreateCanvasDocument: expect.any(Function),
      unavailableMessage: null,
    });
  });

  it('keeps read-only first-canvas posture explicit and non-mutating', () => {
    const cycle = deriveCanvasHostCycleState(buildArgs({ canCreateCanvasDocument: false }));

    expect(cycle).toMatchObject({
      kind: 'needs_canvas',
      onCreateCanvasDocument: undefined,
    });
  });

  it('keeps an existing empty canvas as host identity without presentation copy', () => {
    const canvasDocument = {
      kind: 'transformation',
      title: 'Main canvas',
    };
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'empty',
        },
        canvasDocument,
      })
    );

    expect(cycle).toEqual({ kind: 'typed_empty', canvasDocument });
  });

  it('rejects an empty posture without a persisted canvas identity', () => {
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'empty',
        },
        canvasDocument: null,
      })
    );

    expect(cycle).toBeNull();
  });

  it('derives a graph-ready cycle once graph content exists', () => {
    const canvasDocument = {
      kind: 'transformation',
      title: 'Main canvas',
    };
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'ready',
        },
        canvasDocument,
      })
    );

    expect(cycle).toEqual({ kind: 'graph_ready', canvasDocument });
  });
});
