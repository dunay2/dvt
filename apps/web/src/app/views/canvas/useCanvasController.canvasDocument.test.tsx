import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
  createRenderedHarness,
  createUnrenderedHarness,
  setHarnessRemoteDraftRecord,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';
import { renderCanvasCenterSurface } from './CanvasCenterSurface';
import { deriveCanvasRouteViewState } from './canvasRouteViewState';
import { canvasViewCopy } from './copy';

describe('useCanvasController canvas document contract', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('fails closed for legacy dbt canvas documents', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord({
        canvas: {
          kind: 'dbt',
          title: 'dbt graph',
        },
        nodeIds: ['node_1', 'node_2'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
          node_2: { x: 100, y: 0 },
        },
        edges: [{ sourceId: 'node_1', targetId: 'node_2' }],
      })
    );

    await harness.renderProbe();
    await harness.renderProbe();

    expect(harness.mocks.findCanvasRuntimeRegistration).toHaveBeenCalledWith('dbt', undefined);
    expect(harness.getLatestResult()?.canEditInspectorNode).toBe(false);
    expect(harness.getLatestResult()?.canOpenSourceImport).toBe(false);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
        canPlan: false,
        canRun: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        graphStrategy: null,
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        executionStrategy: null,
        canPlan: false,
        canRun: false,
      })
    );
  });

  it('keeps first-canvas creation available while graph mutation waits for a typed document', async () => {
    harness.cleanup();
    harness = await createRenderedHarness();

    expect(harness.getLatestResult()?.canvasDocument).toBeNull();
    expect(harness.getLatestResult()?.canCreateCanvasDocument).toBe(true);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('shows a rejected first-canvas write and recovers only through another explicit host click', async () => {
    harness.cleanup();
    harness = await createRenderedHarness();
    const save = vi.mocked(harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft);
    save.mockRejectedValueOnce(new Error('write failed'));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const renderSurface = async (): Promise<void> => {
      const controller = harness.getLatestResult();
      if (controller == null) throw new Error('Real Canvas controller was not rendered.');
      await act(async () => {
        root.render(
          renderCanvasCenterSurface({
            ...deriveCanvasRouteViewState(controller),
            onCreateCanvasDocument: (command) => {
              void controller.handleCreateCanvasDocument(command);
            },
          })
        );
      });
    };
    const clickCreate = async (): Promise<void> => {
      const button = container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-playground-template-choice"]'
      );
      expect(button).not.toBeNull();
      expect(button?.disabled).toBe(false);
      await act(async () => {
        button?.click();
      });
      await harness.renderProbe();
      await renderSurface();
    };

    try {
      await renderSurface();
      await clickCreate();

      expect(save).toHaveBeenCalledTimes(1);
      expect(harness.getLatestResult()?.draftSaveStatus).toBe('failed');
      expect(harness.getLatestResult()?.canvasDocument).toBeNull();
      expect(harness.state.remoteDraftRecord).toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-playground-template-unavailable"]')?.textContent
      ).toBe(canvasViewCopy.draftSaveFailedLabel);

      await clickCreate();

      expect(save).toHaveBeenCalledTimes(2);
      expect(harness.getLatestResult()?.canvasDocument).toEqual(
        expect.objectContaining({
          kind: 'transformation',
          title: 'Canvas',
        })
      );
      expect(harness.state.remoteDraftRecord?.draft.canvas).toEqual(
        expect.objectContaining({
          kind: 'transformation',
          title: 'Canvas',
        })
      );
      expect(container.querySelector('[data-slot="canvas-playground-template-choice"]')).toBeNull();
      expect(
        container.querySelector('[data-slot="canvas-playground-template-unavailable"]')
      ).toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('adopts a saved first canvas after the canonical reread confirms its authority', async () => {
    harness.cleanup();
    harness = await createRenderedHarness();
    harness.state.queryClient.setQueryData = vi.fn();

    await act(async () => {
      await harness.getLatestResult()?.handleCreateCanvasDocument({
        kind: 'transformation',
        title: 'Transformation canvas',
      });
    });
    await harness.renderProbe();

    expect(
      harness.state.services.workspaceGraphDraftAuthoringPort.saveGraphDraft
    ).toHaveBeenCalled();
    expect(harness.getLatestResult()?.canvasDocument).toEqual({
      id: 'transformation-canvas',
      kind: 'transformation',
      title: 'Transformation canvas',
    });
    expect(harness.getLatestResult()?.activeCanvasId).toBe('transformation-canvas');
    expect(harness.getLatestResult()?.canvasDocuments).toEqual([
      {
        id: 'transformation-canvas',
        kind: 'transformation',
        title: 'Transformation canvas',
      },
    ]);
    expect(harness.getLatestResult()?.canCreateCanvasDocument).toBe(false);
  });

  it('keeps first-canvas creation available from draft persistence when graph edits are denied', async () => {
    harness.cleanup();
    harness = createUnrenderedHarness();
    const storeState = harness.state.store as unknown as {
      userPermissions: {
        canEditEdges: boolean;
        canPersistGraphDraft: boolean;
      };
    };
    storeState.userPermissions = {
      ...storeState.userPermissions,
      canEditEdges: false,
      canPersistGraphDraft: true,
    };

    await harness.renderProbe();

    expect(harness.getLatestResult()?.canvasDocument).toBeNull();
    expect(harness.getLatestResult()?.canCreateCanvasDocument).toBe(true);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canEditEdges: false,
      })
    );
  });

  it('routes unsupported canvas kinds through the runtime policy fail-closed posture', async () => {
    setHarnessRemoteDraftRecord(
      harness,
      buildRemoteDraftRecord({
        canvas: {
          kind: 'retired-canvas-kind',
          title: 'retired graph',
        },
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );

    await harness.renderProbe();
    await harness.renderProbe();

    expect(harness.getLatestResult()?.canEditInspectorNode).toBe(false);
    expect(harness.getLatestResult()?.canOpenSourceImport).toBe(false);
    expect(harness.getLatestResult()?.userPermissions).toEqual(
      expect.objectContaining({
        canEditEdges: false,
        canPlan: false,
        canRun: false,
      })
    );
    expect(harness.mocks.useCanvasGraphHandlers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        graphStrategy: null,
        canEditEdges: false,
      })
    );
    expect(harness.mocks.useCanvasExecutionActions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        executionStrategy: null,
        canPlan: false,
        canRun: false,
      })
    );
  });
});
