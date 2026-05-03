import type { LucideIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import { deriveCanvasHostCycleState } from './canvasHostCycleState';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { CanvasKindRegistration, NodeKindRegistration } from '../../plugins/nodeTypeContracts';

const TestIcon = (() => null) as unknown as LucideIcon;

function buildNodeKind(kind: NodeKindRegistration['kind'], label: string): NodeKindRegistration {
  return {
    kind,
    pluginId: 'dvt',
    label,
    role: 'transform',
    icon: TestIcon,
    borderClass: 'border',
    minimapColor: '#000000',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: false,
  };
}

function buildCanvasKinds(): readonly CanvasKindRegistration[] {
  return [
    {
      kind: 'dbt',
      pluginId: 'dbt',
      label: 'dbt',
      description: 'dbt canvas',
      createTitle: 'dbt canvas',
      emptyState: {
        title: 'Start dbt canvas',
        editableMessage: 'Start dbt modeling',
        firstNodeLabel: 'Add first dbt node',
        firstNodeHelper: 'Choose a dbt resource',
      },
      nodeKinds: [buildNodeKind('dbt:model', 'Model')],
    },
    {
      kind: 'transformation',
      pluginId: 'dvt',
      label: 'Transformation',
      description: 'Transformation canvas',
      createTitle: 'Transformation canvas',
      emptyState: {
        title: 'Start transformation canvas',
        editableMessage: 'Start transformation authoring',
        firstNodeLabel: 'Add first transformation node',
        firstNodeHelper: 'Choose a transformation node',
      },
      nodeKinds: [buildNodeKind('dvt:source', 'Source')],
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
      draftToolbarState: {
        label: 'Draft synced',
        tone: 'neutral',
        showReloadAction: false,
      },
      bootstrapStatus: 'complete',
      bootstrapDetail: 'ready',
      canCompleteBootstrap: true,
    },
    startupBlockState: null,
    workbenchErrorMessage: null,
    canvasDocument: null,
    draftSaveStatus: 'saved',
    availableCanvasKinds: buildCanvasKinds(),
    canEditEdges: true,
    canOpenSourceImport: true,
    onCreateCanvasDocument: vi.fn(),
    onCreateAuthoringNode: vi.fn(),
    ...overrides,
  };
}

describe('canvasHostCycleState', () => {
  it('derives a needs-canvas cycle from the host route posture', () => {
    const cycle = deriveCanvasHostCycleState(buildArgs());

    expect(cycle).toEqual({
      kind: 'needs_canvas',
      availableCanvasKinds: buildCanvasKinds(),
      onCreateCanvasDocument: expect.any(Function),
    });
  });

  it('derives a typed transformation empty cycle from the active canvas kind', () => {
    const onCreateAuthoringNode = vi.fn();
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'empty',
        },
        canvasDocument: {
          kind: 'transformation',
          title: 'Main canvas',
        },
        onCreateAuthoringNode,
      })
    );

    expect(cycle).toEqual({
      kind: 'typed_empty',
      title: 'Start transformation canvas',
      message: 'Start transformation authoring',
      firstNodeLabel: 'Add first transformation node',
      firstNodeHelper: 'Choose a transformation node',
      nodeKinds: buildCanvasKinds()[1]?.nodeKinds,
      onCreateAuthoringNode,
    });
  });

  it('matches typed empty cycle when canvas kind has casing and whitespace drift', () => {
    const onCreateAuthoringNode = vi.fn();
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'empty',
        },
        canvasDocument: {
          kind: ' Transformation ',
          title: 'Main canvas',
        },
        onCreateAuthoringNode,
      })
    );

    expect(cycle).toEqual({
      kind: 'typed_empty',
      title: 'Start transformation canvas',
      message: 'Start transformation authoring',
      firstNodeLabel: 'Add first transformation node',
      firstNodeHelper: 'Choose a transformation node',
      nodeKinds: buildCanvasKinds()[1]?.nodeKinds,
      onCreateAuthoringNode,
    });
  });

  it('keeps first-node creation closed until the first canvas save settles', () => {
    const cycle = deriveCanvasHostCycleState({
      ...buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'empty',
        },
        canvasDocument: {
          kind: 'transformation',
          title: 'Main canvas',
        },
      }),
      draftSaveStatus: 'saving',
    });

    expect(cycle).toEqual({
      kind: 'typed_empty',
      title: 'Start transformation canvas',
      message: 'Start transformation authoring',
      firstNodeLabel: 'Add first transformation node',
      firstNodeHelper: 'Choose a transformation node',
      nodeKinds: [],
      onCreateAuthoringNode: undefined,
    });
  });

  it('keeps read-only empty posture host-owned while preserving the typed title', () => {
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'empty',
        },
        canvasDocument: {
          kind: 'dbt',
          title: 'dbt canvas',
        },
        canEditEdges: false,
      })
    );

    expect(cycle).toEqual({
      kind: 'typed_empty',
      title: 'Start dbt canvas',
      message: canvasViewCopy.routeEmptyReadOnlyMessage,
      firstNodeLabel: 'Add first dbt node',
      firstNodeHelper: 'Choose a dbt resource',
      nodeKinds: [],
      onCreateAuthoringNode: undefined,
    });
  });

  it('derives a graph-ready cycle once the route has moved past empty host posture', () => {
    const cycle = deriveCanvasHostCycleState(
      buildArgs({
        presentationState: {
          ...buildArgs().presentationState,
          routeState: 'ready',
        },
        canvasDocument: {
          kind: 'transformation',
          title: 'Main canvas',
        },
      })
    );

    expect(cycle).toEqual({
      kind: 'graph_ready',
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
    });
  });
});
