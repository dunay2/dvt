// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasViewportHarness,
  getCanvasViewportXyflowState,
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

const xyflowState = getCanvasViewportXyflowState();

describe('CanvasViewport node floating toolbar', () => {
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

  it('opens the node floating toolbar on left-click and closes it on pane click', async () => {
    const onInspectNode = vi.fn();
    const onToggleNodeSelection = vi.fn();

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: {
            name: 'Orders model',
            selectedForExecution: false,
            onInspectNode,
            onToggleNodeSelection,
          },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', 420, 240);

    expect(toolbarText()).toContain('Código');
    expect(toolbarText()).toContain('Congelar');
    expect(toolbarButton('Seleccionar para ejecución')?.dataset.tone).toBe('success');

    await act(async () => {
      toolbarButton('Código')?.click();
    });
    await act(async () => {
      toolbarButton('Seleccionar para ejecución')?.click();
    });

    expect(onInspectNode).toHaveBeenCalledWith('model_orders', 'code');
    expect(onToggleNodeSelection).toHaveBeenCalledWith('model_orders', true);

    await paneClick(440, 260);

    expect(container.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  it('closes the node floating toolbar before opening the background context menu', async () => {
    await renderViewport({
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: vi.fn(),
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('source_orders', 320, 180);
    expect(container.querySelector('[data-slot="canvas-node-floating-toolbar"]')).not.toBeNull();

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  async function clickNode(nodeId: string, clientX: number, clientY: number): Promise<void> {
    const onNodeClick = xyflowState.lastReactFlowProps?.onNodeClick as
      | ((
          event: React.MouseEvent<Element>,
          node: CanvasViewportProps['nodesWithImpact'][number]
        ) => void)
      | undefined;
    const node = (
      xyflowState.lastReactFlowProps?.nodes as CanvasViewportProps['nodesWithImpact']
    ).find((candidate) => candidate.id === nodeId);
    expect(node).toBeDefined();

    await act(async () => {
      onNodeClick?.(
        {
          clientX,
          clientY,
          stopPropagation: vi.fn(),
        } as unknown as React.MouseEvent<Element>,
        node as CanvasViewportProps['nodesWithImpact'][number]
      );
    });
  }

  async function paneClick(clientX: number, clientY: number): Promise<void> {
    const onPaneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      onPaneClick?.({
        clientX,
        clientY,
      } as unknown as React.MouseEvent<Element>);
    });
  }

  function toolbarText(): string {
    return container.querySelector('[data-slot="canvas-node-floating-toolbar"]')?.textContent ?? '';
  }

  function toolbarButton(label: string): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  }
});
