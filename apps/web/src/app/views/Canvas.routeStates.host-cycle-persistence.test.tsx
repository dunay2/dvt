import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../components/shell/operationalDrawerContributionStore';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import { canvasViewCopy } from './canvas/copy';
import { buildCanvasHostCycleControllerState } from './Canvas.test.hostCycleScenario';
import {
  buildController,
  createCanvasRouteHarness,
  expectActiveCanvasShellIdentity,
  expectCanvasBootstrapState,
  currentCanvasRouteState,
  mockedUseCanvasController,
  renderCanvasRouteWithController,
  requireAuthoringNodeKind,
  type CanvasRouteHarness,
} from './Canvas.test.support';

type FirstCanvasCycleFixture = Readonly<{
  canvasKind: 'transformation';
  createLabel: string;
  title: string;
  firstNodeKind: string;
}>;

const FIRST_CANVAS_CYCLE_FIXTURE: FirstCanvasCycleFixture = {
  canvasKind: 'transformation',
  createLabel: 'Transformation',
  title: 'Transformation canvas',
  firstNodeKind: 'dvt:source',
};

function installFirstCanvasCycleController(fixture: FirstCanvasCycleFixture): {
  handleCreateCanvasDocument: ReturnType<typeof vi.fn>;
  handleCreateAuthoringNode: ReturnType<typeof vi.fn>;
} {
  let currentController = buildController(
    buildCanvasHostCycleControllerState({ kind: 'needs_canvas' })
  );

  const handleCreateCanvasDocument = vi.fn(async (command: { kind: string; title: string }) => {
    currentController = buildController({
      ...buildCanvasHostCycleControllerState({
        kind: 'typed_empty',
        canvasKind: fixture.canvasKind,
        title: command.title,
      }),
      handleCreateCanvasDocument,
      handleCreateAuthoringNode,
    });
  });
  const handleCreateAuthoringNode = vi.fn((registration: NodeKindRegistration) => {
    currentController = buildController({
      ...buildCanvasHostCycleControllerState({
        kind: 'graph_ready',
        canvasKind: fixture.canvasKind,
        title: fixture.title,
        firstNodeKind: registration.kind,
      }),
      handleCreateCanvasDocument,
      handleCreateAuthoringNode,
    });
  });

  currentController = buildController({
    ...buildCanvasHostCycleControllerState({ kind: 'needs_canvas' }),
    handleCreateCanvasDocument,
    handleCreateAuthoringNode,
  });
  mockedUseCanvasController.mockImplementation(() => currentController);

  return { handleCreateCanvasDocument, handleCreateAuthoringNode };
}

describe('Canvas route host-cycle persistence', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  function createFirstNodeFromViewport(kind: string): void {
    const viewportProps = currentCanvasRouteState().viewportProps;
    const createFromViewport = viewportProps?.onCreateAuthoringNode as
      ((registration: NodeKindRegistration) => void) | undefined;
    const registration = requireAuthoringNodeKind(kind);

    expect(viewportProps?.authoringNodeKinds).toContain(registration);
    expect(createFromViewport).toBeTypeOf('function');
    createFromViewport?.(registration);
  }

  it('proves the shared Canvas host cycle from create canvas to graph-ready authoring', async () => {
    const fixture = FIRST_CANVAS_CYCLE_FIXTURE;
    const { handleCreateCanvasDocument, handleCreateAuthoringNode } =
      installFirstCanvasCycleController(fixture);

    await harness.render();

    const createButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(fixture.createLabel)
    );
    expect(createButton).toBeDefined();

    createButton?.click();
    await harness.render();

    expect(handleCreateCanvasDocument).toHaveBeenCalledWith({
      kind: fixture.canvasKind,
      title: fixture.title,
    });
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'empty',
      readinessStatus: 'complete',
      readinessDetail: canvasViewCopy.emptyCanvasReadyDetail,
    });

    expect(
      harness.container.querySelector('[data-slot="canvas-add-node-palette-trigger"]')
    ).toBeNull();
    expect(document.body.querySelector('[data-slot="canvas-add-node-palette"]')).toBeNull();

    createFirstNodeFromViewport(fixture.firstNodeKind);
    await harness.render();

    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(
      requireAuthoringNodeKind(fixture.firstNodeKind)
    );
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-playground-empty-state"]')
    ).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'ready',
      readinessStatus: 'complete',
      readinessDetail: canvasViewCopy.canvasReadyDetail,
    });
  });

  it('continues the shared Canvas host cycle into contextual preview without losing host context', async () => {
    let currentController = buildController(
      buildCanvasHostCycleControllerState({ kind: 'needs_canvas' })
    );

    const handlePreviewExecutionPlan = vi.fn(async () => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'transformation',
          title: 'Transformation canvas',
          firstNodeKind: 'dvt:source',
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePreviewExecutionPlan,
        canStartRun: true,
        planStatusSummary: canvasViewCopy.planStatusPreviewReadyMessage,
        transformationValidation: {
          valid: true,
          summaryCode: 'valid',
          draftSignature: 'draft-ready',
          scopedNodeIds: ['node.source'],
          scopedEdgeIds: [],
          nodeRolesById: { 'node.source': 'source' },
        },
      });
    });
    const handleCreateCanvasDocument = vi.fn(async (command: { kind: string; title: string }) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'typed_empty',
          canvasKind: 'transformation',
          title: command.title,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePreviewExecutionPlan,
      });
    });
    const handleCreateAuthoringNode = vi.fn((registration: NodeKindRegistration) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'transformation',
          title: 'Transformation canvas',
          firstNodeKind: registration.kind,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePreviewExecutionPlan,
        planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
        transformationValidation: {
          valid: true,
          summaryCode: 'valid',
          draftSignature: 'draft-ready',
          scopedNodeIds: ['node.source'],
          scopedEdgeIds: [],
          nodeRolesById: { 'node.source': 'source' },
        },
      });
    });

    currentController = buildController({
      ...buildCanvasHostCycleControllerState({ kind: 'needs_canvas' }),
      handleCreateCanvasDocument,
      handleCreateAuthoringNode,
      handlePreviewExecutionPlan,
    });
    mockedUseCanvasController.mockImplementation(() => currentController);

    await harness.render();

    Array.from(harness.container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Transformation'))
      ?.click();
    await harness.render();

    createFirstNodeFromViewport('dvt:source');
    await harness.render();

    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });

    const operationalDrawerContribution =
      useOperationalDrawerContributionStore.getState().contribution;
    expect(operationalDrawerContribution?.source).toBe('canvas');
    expect(operationalDrawerContribution?.preview).toMatchObject({
      canPreview: true,
      summary: canvasViewCopy.planStatusPreviewRequiredMessage,
    });
    await act(async () => {
      operationalDrawerContribution?.preview.onPreviewExecutionPlan();
    });
    await harness.render();

    expect(handlePreviewExecutionPlan).toHaveBeenCalledTimes(1);
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });
  });

  it('restores the authoritative empty shared Canvas posture from draft truth on reopen', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'restored_empty',
        canvasKind: 'transformation',
        title: 'Warehouse flow',
      }),
      canvasAuthoringMode: 'transformation',
    });

    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Warehouse flow',
      kindLabel: 'Transformation',
    });
    expect(harness.container.textContent).not.toContain('Create canvas');
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'empty',
      readinessStatus: 'complete',
      readinessDetail: canvasViewCopy.emptyCanvasReadyDetail,
    });
  });

  it('restores the authoritative graph-ready shared Canvas posture from draft truth on reopen', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'restored_graph_ready',
        canvasKind: 'transformation',
        title: 'Transformation canvas',
        firstNodeKind: 'dvt:source',
      }),
      canvasAuthoringMode: 'transformation',
    });

    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-playground-empty-state"]')
    ).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'ready',
      readinessStatus: 'complete',
      readinessDetail: canvasViewCopy.canvasReadyDetail,
    });
  });
});
