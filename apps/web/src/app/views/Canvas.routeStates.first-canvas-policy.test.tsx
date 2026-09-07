import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasRouteHarness,
  expectActiveCanvasShellIdentity,
  currentCanvasRouteState,
  renderCanvasRouteWithController,
  requireAuthoringNodeKind,
  type CanvasRouteHarness,
} from './Canvas.test.support';

describe('Canvas route first-canvas policy', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('creates the first transformation canvas through the controller command', async () => {
    const handleCreateCanvasDocument = vi.fn();
    await renderCanvasRouteWithController(harness, {
      canvasDocument: null,
      canCreateCanvasDocument: true,
      handleCreateCanvasDocument,
    });

    const createButton = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start canvas')
    );

    expect(createButton).toBeDefined();
    createButton?.click();

    expect(handleCreateCanvasDocument).toHaveBeenCalledWith({
      kind: 'transformation',
      title: 'Canvas',
    });
  });

  it('opens an existing empty Canvas as an unobstructed authoring viewport', async () => {
    const handleCreateAuthoringNode = vi.fn();
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      handleCreateAuthoringNode,
    });

    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Main canvas',
      kindLabel: 'Transformation',
    });

    const viewportProps = currentCanvasRouteState().viewportProps;
    const createFromViewport = viewportProps?.onCreateAuthoringNode as
      ((registration: ReturnType<typeof requireAuthoringNodeKind>) => void) | undefined;
    const sourceKind = requireAuthoringNodeKind('dvt:source');

    expect(viewportProps?.authoringNodeKinds).toContain(sourceKind);
    expect(createFromViewport).toBeTypeOf('function');
    createFromViewport?.(sourceKind);
    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(sourceKind);
  });

  it('keeps a read-only empty Canvas unobstructed without exposing mutating commands', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canPersistGraphDraft: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(currentCanvasRouteState().viewportProps?.canEditEdges).toBe(false);
  });
});
