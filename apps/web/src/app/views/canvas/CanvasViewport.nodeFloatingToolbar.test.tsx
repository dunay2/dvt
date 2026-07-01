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

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: {
            name: 'Orders model',
            selectedForExecution: false,
            onInspectNode,
          },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', 420, 240);

    expect(toolbarText()).toContain('Código');
    expect(toolbarText()).not.toContain('Congelar');
    expect(toolbarText()).not.toContain('Más acciones');
    expect(toolbarText()).not.toContain('Seleccionar para ejecución');
    expect(toolbarButton('Seleccionar para ejecución')).toBeNull();

    await act(async () => {
      toolbarButton('Código')?.click();
    });

    expect(onInspectNode).toHaveBeenCalledWith('model_orders', 'code');

    await paneClick(440, 260);

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  it('aligns the node floating toolbar with the node card instead of the click point', async () => {
    const onInspectNode = vi.fn();

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: { name: 'Orders model', onInspectNode },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', {
      clientX: 640,
      clientY: 320,
      nodeRect: { left: 320, top: 180, width: 180, height: 72 },
    });

    const toolbar = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-node-floating-toolbar"]'
    );

    expect(toolbar?.style.getPropertyValue('--node-toolbar-x')).toBe('320px');
    expect(toolbar?.style.getPropertyValue('--node-toolbar-y')).toBe('128px');
  });

  it('does not render an empty toolbar when the clicked node has no operable actions', async () => {
    await renderViewport({
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: { name: 'Orders model' },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', 420, 240);

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  it('closes the node floating toolbar before opening the background context menu', async () => {
    const onInspectNode = vi.fn();

    await renderViewport({
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: vi.fn(),
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false, onInspectNode },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('source_orders', 320, 180);
    expect(
      document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')
    ).not.toBeNull();

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

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('closes the node floating toolbar when its owning node is removed', async () => {
    const onInspectNode = vi.fn();

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false, onInspectNode },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('source_orders', 320, 180);
    expect(
      document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')
    ).not.toBeNull();

    await renderViewport({
      nodesWithImpact: [] as CanvasViewportProps['nodesWithImpact'],
    });

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  it('does not leave toolbar or health detail surfaces orphaned when node details open or disappear', async () => {
    const onInspectNode = vi.fn();

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false, onInspectNode },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('source_orders', 320, 180);
    expect(
      document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')
    ).not.toBeNull();

    await openOperationalDetails('source_orders');

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="graph-node-health-popover"]')?.textContent
    ).toContain('Source health');

    await renderViewport({
      nodesWithImpact: [] as CanvasViewportProps['nodesWithImpact'],
    });

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).toBeNull();
  });

  async function clickNode(
    nodeId: string,
    eventInput:
      | number
      | {
          clientX: number;
          clientY: number;
          nodeRect?: { left: number; top: number; width: number; height: number };
        },
    legacyClientY?: number
  ): Promise<void> {
    const clickEvent =
      typeof eventInput === 'number'
        ? { clientX: eventInput, clientY: legacyClientY ?? 0 }
        : eventInput;
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
          clientX: clickEvent.clientX,
          clientY: clickEvent.clientY,
          currentTarget:
            clickEvent.nodeRect == null
              ? undefined
              : {
                  getBoundingClientRect: () => clickEvent.nodeRect,
                },
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

  async function openOperationalDetails(nodeId: string): Promise<void> {
    const node = (
      xyflowState.lastReactFlowProps?.nodes as CanvasViewportProps['nodesWithImpact']
    ).find((candidate) => candidate.id === nodeId);
    expect(node).toBeDefined();

    const onOpenOperationalDetails = node?.data.onOpenOperationalDetails as
      | ((
          detail: {
            title: string;
            rows: readonly { id: string; label: string; value: string }[];
          },
          anchorRect: DOMRect
        ) => void)
      | undefined;
    expect(typeof onOpenOperationalDetails).toBe('function');

    await act(async () => {
      onOpenOperationalDetails?.(
        {
          title: 'Source health',
          rows: [
            { id: 'freshness', label: 'Freshness', value: '12 min' },
            { id: 'size', label: 'Dataset size', value: '18.2 GB' },
          ],
        },
        {
          left: 320,
          bottom: 260,
        } as DOMRect
      );
    });
  }

  function toolbarText(): string {
    return (
      document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')?.textContent ?? ''
    );
  }

  function toolbarButton(label: string): HTMLButtonElement | null {
    return document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  }
});
