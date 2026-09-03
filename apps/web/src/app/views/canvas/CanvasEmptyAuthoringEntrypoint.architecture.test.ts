import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { getCanvasRuntimeRegistrations } from '../../plugins/graphStrategyRegistry';
import { readArchitectureSiblingSource } from '../architecture.test.support';
import type { CanvasWorkbenchSurfaceArgs } from './canvasCenterSurface.types';
import type { CanvasDraftPresentationState } from './canvasDraftPresentationModel';
import { deriveCanvasHostCycleState } from './canvasHostCycleState';
import { canvasViewCopy } from './copy';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md'
);
const NODE_COMMAND_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasAuthoringNodeCommand.ts'
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

function buildPresentationState(
  routeState: CanvasDraftPresentationState['routeState']
): CanvasDraftPresentationState {
  return {
    routeState,
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
  };
}

function buildWorkbenchArgs(
  overrides: Partial<CanvasWorkbenchSurfaceArgs> = {}
): CanvasWorkbenchSurfaceArgs {
  return {
    presentationState: buildPresentationState('empty'),
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
    canEditEdges: true,
    canOpenSourceImport: true,
    emptyStateGuideVisible: true,
    onEmptyStateGuideVisibilityChange: vi.fn(),
    onCreateCanvasDocument: vi.fn(),
    onCreateAuthoringNode: vi.fn(),
    ...overrides,
  };
}

describe('Canvas empty authoring entrypoint architecture', () => {
  it('ships a component guide with public API, invariants, transitions, and consumers', () => {
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
    expect(docText).toContain('canvasDocument.kind');
  });

  it('states owned concern docblocks on the entrypoint modules', () => {
    for (const source of [
      NODE_COMMAND_SOURCE,
      NODE_CREATION_HANDLER_SOURCE,
      NODE_ADMISSION_COMMAND_RUNNER_SOURCE,
      NODE_AUTHORING_HANDLER_SOURCE,
      CENTER_WORKBENCH_SOURCE,
    ]) {
      expect(source).toContain('Owned concern:');
    }
  });

  it('derives the needs-canvas creation choices from runtime registrations', () => {
    const cycleState = deriveCanvasHostCycleState(
      buildWorkbenchArgs({
        presentationState: buildPresentationState('needs_canvas'),
        canvasDocument: null,
      })
    );

    expect(cycleState).toMatchObject({
      kind: 'needs_canvas',
    });
    if (cycleState?.kind !== 'needs_canvas') {
      return;
    }

    expect(cycleState.availableCanvasKinds.map((canvasKind) => canvasKind.kind)).toEqual([
      'dbt',
      'transformation',
    ]);
    expect(cycleState.onCreateCanvasDocument).toEqual(expect.any(Function));
    expect(cycleState.unavailableMessage).toBeNull();
  });

  it('derives typed empty copy and contextual node catalog from the active canvas kind', () => {
    const onCreateAuthoringNode = vi.fn();
    const transformationRuntime = getCanvasRuntimeRegistrations().find(
      (registration) => registration.kind === 'transformation'
    );

    const cycleState = deriveCanvasHostCycleState(
      buildWorkbenchArgs({
        onCreateAuthoringNode,
      })
    );

    expect(cycleState).toMatchObject({
      kind: 'typed_empty',
      title: transformationRuntime?.emptyState.title,
      message: transformationRuntime?.emptyState.editableMessage,
    });
    if (cycleState?.kind !== 'typed_empty') {
      return;
    }

    expect(cycleState.nodeKinds).toBe(transformationRuntime?.nodeKinds);
    expect(cycleState.onCreateAuthoringNode).toBe(onCreateAuthoringNode);
  });

  it('keeps first-node authoring available when source import is unavailable', () => {
    const transformationRuntime = getCanvasRuntimeRegistrations().find(
      (registration) => registration.kind === 'transformation'
    );

    const cycleState = deriveCanvasHostCycleState(
      buildWorkbenchArgs({
        canOpenSourceImport: false,
      })
    );

    expect(cycleState).toMatchObject({
      kind: 'typed_empty',
      message: canvasViewCopy.routeEmptyImportUnavailableMessage,
    });
    if (cycleState?.kind !== 'typed_empty') {
      return;
    }

    expect(cycleState.nodeKinds).toBe(transformationRuntime?.nodeKinds);
    expect(cycleState.onCreateAuthoringNode).toEqual(expect.any(Function));
  });

  it('keeps read-only typed empty posture non-mutating without losing typed copy', () => {
    const dbtRuntime = getCanvasRuntimeRegistrations().find(
      (registration) => registration.kind === 'dbt'
    );

    const cycleState = deriveCanvasHostCycleState(
      buildWorkbenchArgs({
        canvasDocument: {
          kind: 'dbt',
          title: 'dbt canvas',
        },
        canEditEdges: false,
      })
    );

    expect(cycleState).toMatchObject({
      kind: 'typed_empty',
      title: dbtRuntime?.emptyState.title,
      message: canvasViewCopy.routeEmptyReadOnlyMessage,
      nodeKinds: [],
      onCreateAuthoringNode: undefined,
    });
  });

  it('keeps narrow source tripwires for handler ownership boundaries', () => {
    expect(CENTER_WORKBENCH_SOURCE).toContain('deriveCanvasHostCycleState');
    expect(NODE_CREATION_HANDLER_SOURCE).toContain('useCanvasNodeAdmissionCommandRunner');
    expect(NODE_CREATION_HANDLER_SOURCE).not.toContain('resolveCanvasNodeAdmissionTransaction');
    expect(NODE_CREATION_HANDLER_SOURCE).not.toContain('WorkspaceGraphDraft');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('resolveCanvasNodeAdmissionTransaction');
    expect(NODE_ADMISSION_COMMAND_RUNNER_SOURCE).toContain('latestDraftSessionRef');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasNodeDropHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasAuthoringNodeCreationHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).toContain('useCanvasNodeRemovalHandlers');
    expect(NODE_AUTHORING_HANDLER_SOURCE).not.toContain('admitCanonicalNodeToCanvas');
    expect(NODE_AUTHORING_HANDLER_SOURCE).not.toContain('toast.');
  });
});
