import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { getCanvasRuntimeRegistrations } from '../../plugins/graphStrategyRegistry';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import { deriveCanvasHostCycleState } from './canvasHostCycleState';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md'
);
const NODE_CREATION_HANDLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringNodeCreationHandlers.ts'
);
const NODE_ADMISSION_COMMAND_RUNNER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAdmissionCommandRunner.ts'
);
const NODE_AUTHORING_HANDLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeAuthoringHandlers.ts'
);
const CENTER_WORKBENCH_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasCenterSurfaceWorkbench.tsx'
);

function buildWorkbenchArgs(
  overrides: Partial<CanvasWorkbenchSurfaceArgs> = {}
): CanvasWorkbenchSurfaceArgs {
  return {
    presentationState: {
      routeState: 'empty',
      recoveryReason: null,
      draftStatusState: {
        label: 'Draft synced',
        tone: 'neutral',
        showReloadAction: false,
      },
      routeReadiness: { status: 'complete', detail: 'ready' },
    },
    workspaceScope: {
      tenantId: 'tenant-a',
      projectId: 'project-orders',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    },
    startupBlockState: null,
    workbenchErrorMessage: null,
    canvasDocument: {
      kind: 'transformation',
      title: 'Transformation canvas',
    },
    draftSaveStatus: 'saved',
    availableCanvasKinds: getCanvasRuntimeRegistrations(),
    canCreateCanvasDocument: true,
    onCreateCanvasDocument: vi.fn(),
    ...overrides,
  };
}

describe('Canvas empty authoring entrypoint architecture', () => {
  it('documents the unobstructed empty Canvas and its existing authoring rail', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Component Flow',
      '## Consumers',
      '## Drift To Prevent',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).toContain('CanvasKindRegistration');
    expect(docText).toContain('passive onboarding card');
  });

  it('keeps first-canvas creation derived from runtime registrations', () => {
    const cycleState = deriveCanvasHostCycleState(
      buildWorkbenchArgs({
        presentationState: {
          ...buildWorkbenchArgs().presentationState,
          routeState: 'needs_canvas',
        },
        canvasDocument: null,
      })
    );

    expect(cycleState).toMatchObject({ kind: 'needs_canvas' });
    if (cycleState?.kind !== 'needs_canvas') return;
    expect(cycleState.availableCanvasKinds.map((canvasKind) => canvasKind.kind)).toEqual([
      'transformation',
    ]);
  });

  it('keeps typed-empty identity without rendering the retired guide', () => {
    expect(deriveCanvasHostCycleState(buildWorkbenchArgs())).toEqual({
      kind: 'typed_empty',
      canvasDocument: {
        kind: 'transformation',
        title: 'Transformation canvas',
      },
    });
    expect(CENTER_WORKBENCH_SOURCE).not.toContain('CanvasEmptyStateView');
    expect(CENTER_WORKBENCH_SOURCE).not.toContain('canvas-empty-state');
  });

  it('keeps canonical node admission ownership unchanged', () => {
    expect(NODE_CREATION_HANDLER_SOURCE).toContain('useCanvasNodeAdmissionCommandRunner');
    expect(NODE_CREATION_HANDLER_SOURCE).not.toContain('WorkspaceGraphDraft');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasNodeAdmissionTransaction');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasNodeDropHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasAuthoringNodeCreationHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).not.toContain('admitCanonicalNodeToCanvas');
  });
});
