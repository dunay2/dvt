import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import { canvasViewCopy } from './canvas/copy';
import { buildCanvasHostCycleControllerState } from './Canvas.test.hostCycleScenario';
import {
  buildController,
  createCanvasRouteHarness,
  expectActiveCanvasTab,
  expectCanvasBootstrapState,
  getPrimaryCanvasButtons,
  mockedUseCanvasController,
  renderCanvasRouteWithController,
  requireAuthoringNodeKind,
  type CanvasRouteHarness,
} from './Canvas.test.support';

type FirstCanvasCycleFixture = Readonly<{
  canvasKind: 'transformation' | 'dbt';
  createLabel: string;
  title: string;
  emptyText: string;
  firstNodeText: string;
  firstNodeKind: string;
}>;

const FIRST_CANVAS_CYCLE_FIXTURES: Record<
  FirstCanvasCycleFixture['canvasKind'],
  FirstCanvasCycleFixture
> = {
  transformation: {
    canvasKind: 'transformation',
    createLabel: 'Transformation',
    title: 'Transformation canvas',
    emptyText: 'Start transformation canvas',
    firstNodeText: 'Add first transformation node',
    firstNodeKind: 'dvt:source',
  },
  dbt: {
    canvasKind: 'dbt',
    createLabel: 'dbt',
    title: 'dbt canvas',
    emptyText: 'Start dbt canvas',
    firstNodeText: 'Add first dbt node',
    firstNodeKind: 'dbt:source',
  },
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

  it.each(Object.values(FIRST_CANVAS_CYCLE_FIXTURES))(
    'proves the first $canvasKind host cycle from create canvas to graph-ready authoring',
    async (fixture) => {
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
      expect(harness.container.textContent).toContain(fixture.emptyText);
      expect(harness.container.textContent).toContain(fixture.firstNodeText);
      expectCanvasBootstrapState({
        routeState: 'empty',
        bootstrapStatus: 'complete',
        bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
        canCompleteBootstrap: true,
      });

      const sourceButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Source')
      );
      expect(sourceButton).toBeDefined();

      sourceButton?.click();
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
        bootstrapStatus: 'complete',
        bootstrapDetail: canvasViewCopy.canvasReadyDetail,
        canCompleteBootstrap: true,
      });
    }
  );

  it('continues the typed transformation host cycle into preview and run without losing host context', async () => {
    let currentController = buildController(
      buildCanvasHostCycleControllerState({ kind: 'needs_canvas' })
    );

    const handlePlan = vi.fn(async () => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'graph_ready',
          canvasKind: 'transformation',
          title: 'Transformation canvas',
          firstNodeKind: 'dvt:source',
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePlan,
        handleStartRun,
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
    const handleStartRun = vi.fn();
    const handleCreateCanvasDocument = vi.fn(async (command: { kind: string; title: string }) => {
      currentController = buildController({
        ...buildCanvasHostCycleControllerState({
          kind: 'typed_empty',
          canvasKind: 'transformation',
          title: command.title,
        }),
        handleCreateCanvasDocument,
        handleCreateAuthoringNode,
        handlePlan,
        handleStartRun,
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
        handlePlan,
        handleStartRun,
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
      handlePlan,
      handleStartRun,
    });
    mockedUseCanvasController.mockImplementation(() => currentController);

    await harness.render();

    Array.from(harness.container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Transformation'))
      ?.click();
    await harness.render();

    Array.from(harness.container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Source'))
      ?.click();
    await harness.render();

    expectActiveCanvasTab({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });

    getPrimaryCanvasButtons(harness.container).planButton?.click();
    await harness.render();

    expect(handlePlan).toHaveBeenCalledTimes(1);
    expect(
      getPrimaryCanvasButtons(harness.container).runButton?.getAttribute('disabled')
    ).toBeNull();

    getPrimaryCanvasButtons(harness.container).runButton?.click();

    expect(handleStartRun).toHaveBeenCalledTimes(1);
    expectActiveCanvasTab({
      container: harness.container,
      title: 'Transformation canvas',
      kindLabel: 'Transformation',
    });
  });

  it('restores the authoritative typed empty canvas tab and posture from draft truth on reopen', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'restored_empty',
        canvasKind: 'dbt',
        title: 'Warehouse dbt',
      }),
      canvasAuthoringMode: 'transformation',
    });

    expectActiveCanvasTab({
      container: harness.container,
      title: 'Warehouse dbt',
      kindLabel: 'dbt',
    });
    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expect(harness.container.textContent).not.toContain('Create canvas');
    expect(harness.container.textContent).not.toContain('Start transformation canvas');
    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'empty',
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.emptyCanvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });

  it('restores the authoritative graph-ready canvas tab and posture from draft truth on reopen', async () => {
    await renderCanvasRouteWithController(harness, {
      ...buildCanvasHostCycleControllerState({
        kind: 'restored_graph_ready',
        canvasKind: 'transformation',
        title: 'Transformation canvas',
        firstNodeKind: 'dvt:source',
      }),
      canvasAuthoringMode: 'dbt',
    });

    expectActiveCanvasTab({
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
      bootstrapStatus: 'complete',
      bootstrapDetail: canvasViewCopy.canvasReadyDetail,
      canCompleteBootstrap: true,
    });
  });
});
