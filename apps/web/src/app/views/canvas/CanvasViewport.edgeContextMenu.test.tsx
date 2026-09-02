// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => import('./canvasViewportXyflowTestAdapter'));
vi.mock(
  '../../plugins/nodeTypeRegistry',
  () => import('./canvasViewportNodeTypeRegistryTestAdapter')
);

import {
  createCanvasViewportHarness,
  getCanvasViewportXyflowState,
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

const xyflowState = getCanvasViewportXyflowState();

describe('CanvasViewport edge context menu', () => {
  let container: HTMLDivElement;
  let renderViewport: (props?: Partial<CanvasViewportProps>) => Promise<CanvasViewportProps>;
  let unmountViewport: () => void;

  beforeEach(() => {
    const harness = createCanvasViewportHarness();
    container = harness.container;
    renderViewport = harness.render;
    unmountViewport = harness.unmount;
  });

  afterEach(() => {
    unmountViewport();
  });

  function getMenuText(): string {
    return document.querySelector('[data-slot="canvas-context-menu"]')?.textContent ?? '';
  }

  async function openEdgeContextMenu(props: CanvasViewportProps): Promise<void> {
    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const edge = props.edges?.[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault: vi.fn(),
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );

      const contextSurface = container.querySelector(
        '[data-slot="canvas-viewport-context-surface"]'
      );
      const edgeTarget = document.createElement('div');
      edgeTarget.className = 'react-flow__edge';
      contextSurface?.appendChild(edgeTarget);
      edgeTarget.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          buttons: 2,
          clientX: 600,
          clientY: 360,
        })
      );
    });
  }

  it('opens a governed remove-edge menu from the edge context gesture', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await openEdgeContextMenu(props);

    const removeAction = document.querySelector<HTMLElement>(
      '[data-slot="canvas-context-menu-item"][data-menu-action="remove-edge"]'
    );
    expect(removeAction?.textContent).toContain('Remove connection');

    await act(async () => {
      removeAction?.click();
    });

    expect(props.onEdgesChange).toHaveBeenCalledWith([
      {
        id: 'edge-source-model',
        type: 'remove',
      },
    ]);
  });

  it('does not offer removal for non-editable derived field lineage', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'derived-field-lineage',
          source: 'source',
          target: 'model',
          type: 'columnLineage',
          data: { removable: false },
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await openEdgeContextMenu(props);

    expect(
      document.querySelector(
        '[data-slot="canvas-context-menu-item"][data-menu-action="remove-edge"]'
      )
    ).toBeNull();
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });

  it('dismisses the edge context menu when the user clicks the graph background', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await openEdgeContextMenu(props);

    expect(getMenuText()).toContain('Remove connection');

    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      ((event: React.MouseEvent<Element>) => void) | undefined;

    await act(async () => {
      paneClick?.({ button: 0 } as React.MouseEvent<Element>);
    });

    expect(getMenuText()).not.toContain('Remove connection');
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });

  it('dismisses the edge context menu when the user clicks outside the viewport', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    await openEdgeContextMenu(props);

    expect(getMenuText()).toContain('Remove connection');

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(getMenuText()).not.toContain('Remove connection');
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });
});
