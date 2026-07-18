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
    const onToggleFrozenNode = vi.fn();

    await renderViewport({
      onToggleFrozenNode,
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

    await clickNode('model_orders', {
      clientX: 420,
      clientY: 240,
      nodeElement: document.createElement('div'),
    });

    expect(toolbarText()).toBe('');
    expect(toolbarButton('Open node code')).not.toBeNull();
    expect(toolbarButton('Freeze node')?.getAttribute('data-action-state')).toBe('available');
    expect(toolbarButton('Freeze node')?.getAttribute('aria-pressed')).toBe('false');
    expect(toolbarButton('Freeze node')?.getAttribute('aria-disabled')).toBeNull();
    expect(toolbarButton('More node actions')).not.toBeNull();

    await act(async () => {
      toolbarButton('Open node code')?.click();
    });

    expect(onInspectNode).toHaveBeenCalledWith('model_orders', 'code');
    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();

    await clickNode('model_orders', {
      clientX: 420,
      clientY: 240,
      nodeElement: document.createElement('div'),
    });

    await act(async () => {
      toolbarButton('Freeze node')?.click();
    });

    expect(onToggleFrozenNode).toHaveBeenCalledWith('model_orders');

    await paneClick(440, 260);

    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  it('uses the node-specific code command instead of reopening the inspector Code tab', async () => {
    const onInspectNode = vi.fn();
    const onOpenNodeCode = vi.fn();

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: {
            name: 'Orders model',
            onInspectNode,
            onOpenNodeCode,
          },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', 420, 240);
    await act(async () => {
      toolbarButton('Open node code')?.click();
    });

    expect(onOpenNodeCode).toHaveBeenCalledWith('model_orders');
    expect(onInspectNode).not.toHaveBeenCalled();
  });

  it('does not offer Code when the node strategy declares no file authority', async () => {
    await renderViewport({
      onToggleFrozenNode: vi.fn(),
      nodesWithImpact: [
        {
          id: 'metric_without_path',
          position: { x: 160, y: 90 },
          data: {
            name: 'Metric without path',
            canOpenNodeCode: false,
            onInspectNode: vi.fn(),
          },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('metric_without_path', 420, 240);

    expect(toolbarButton('Open node code')).toBeNull();
    expect(toolbarButton('Freeze node')).not.toBeNull();
  });

  it('shows an unfreeze action when the clicked node is already frozen', async () => {
    await renderViewport({
      frozenNodeIds: new Set(['model_orders']),
      onToggleFrozenNode: vi.fn(),
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: {
            name: 'Orders model',
            onInspectNode: vi.fn(),
          },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', {
      clientX: 420,
      clientY: 240,
      nodeElement: document.createElement('div'),
    });

    expect(toolbarButton('Unfreeze node')?.getAttribute('aria-pressed')).toBe('true');
    expect(toolbarButton('Unfreeze node')?.getAttribute('data-tone')).toBe('active');
    expect(toolbarButton('Freeze node')).toBeNull();
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

  it('delegates More to the governed node context-menu gesture for the clicked card', async () => {
    const nodeElement = document.createElement('div');
    const dispatchEvent = vi.spyOn(nodeElement, 'dispatchEvent');

    await renderViewport({
      nodesWithImpact: [
        {
          id: 'model_orders',
          position: { x: 160, y: 90 },
          data: { name: 'Orders model', onInspectNode: vi.fn() },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await clickNode('model_orders', {
      clientX: 640,
      clientY: 320,
      nodeElement,
      nodeRect: { left: 320, top: 180, width: 180, height: 72 },
    });

    await act(async () => {
      toolbarButton('More node actions')?.click();
    });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const dispatchedEvent = dispatchEvent.mock.calls[0]?.[0];
    expect(dispatchedEvent).toBeInstanceOf(MouseEvent);
    expect((dispatchedEvent as MouseEvent).type).toBe('contextmenu');
    expect((dispatchedEvent as MouseEvent).clientX).toBe(320);
    expect((dispatchedEvent as MouseEvent).clientY).toBe(180);
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
      ((event: React.MouseEvent<Element>) => void) | undefined;
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

  it('closes the toolbar before the node interaction opens its workbench', async () => {
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

    await clickNode('model_orders', 420, 240);
    expect(
      document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')
    ).not.toBeNull();

    const projectedNode = (
      xyflowState.lastReactFlowProps?.nodes as CanvasViewportProps['nodesWithImpact']
    ).find(({ id }) => id === 'model_orders');
    const openWorkbench = projectedNode?.data.onInspectNode as
      ((nodeId: string, preferredTabId?: string) => void) | undefined;

    await act(async () => {
      openWorkbench?.('model_orders');
    });

    expect(onInspectNode).toHaveBeenCalledWith('model_orders');
    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  async function clickNode(
    nodeId: string,
    eventInput:
      | number
      | {
          clientX: number;
          clientY: number;
          nodeElement?: Element;
          nodeRect?: { left: number; top: number; width: number; height: number };
        },
    legacyClientY?: number
  ): Promise<void> {
    const clickEvent =
      typeof eventInput === 'number'
        ? { clientX: eventInput, clientY: legacyClientY ?? 0 }
        : eventInput;
    const resolvedNodeElement =
      clickEvent.nodeElement ??
      (clickEvent.nodeRect == null ? undefined : document.createElement('div'));
    if (resolvedNodeElement != null && clickEvent.nodeRect != null) {
      vi.spyOn(resolvedNodeElement, 'getBoundingClientRect').mockReturnValue({
        ...clickEvent.nodeRect,
        x: clickEvent.nodeRect.left,
        y: clickEvent.nodeRect.top,
        right: clickEvent.nodeRect.left + clickEvent.nodeRect.width,
        bottom: clickEvent.nodeRect.top + clickEvent.nodeRect.height,
        toJSON: () => ({}),
      } as DOMRect);
    }
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
          target: resolvedNodeElement,
          currentTarget: resolvedNodeElement,
          stopPropagation: vi.fn(),
        } as unknown as React.MouseEvent<Element>,
        node as CanvasViewportProps['nodesWithImpact'][number]
      );
    });
  }

  async function paneClick(clientX: number, clientY: number): Promise<void> {
    const onPaneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      ((event: React.MouseEvent<Element>) => void) | undefined;

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
          anchorElement: HTMLElement
        ) => void)
      | undefined;
    expect(typeof onOpenOperationalDetails).toBe('function');

    const anchorElement = document.createElement('button');
    anchorElement.getBoundingClientRect = () =>
      ({
        left: 320,
        bottom: 260,
      }) as DOMRect;
    container.append(anchorElement);

    await act(async () => {
      onOpenOperationalDetails?.(
        {
          title: 'Source health',
          rows: [
            { id: 'freshness', label: 'Freshness', value: '12 min' },
            { id: 'size', label: 'Dataset size', value: '18.2 GB' },
          ],
        },
        anchorElement
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
