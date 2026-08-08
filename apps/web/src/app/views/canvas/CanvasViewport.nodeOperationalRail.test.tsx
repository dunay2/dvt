// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => import('./canvasViewportXyflowTestAdapter'));
vi.mock(
  '../../plugins/nodeTypeRegistry',
  () => import('./canvasViewportNodeTypeRegistryTestAdapter')
);

import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';
import {
  createCanvasViewportHarness,
  getCanvasViewportXyflowState,
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

const xyflowState = getCanvasViewportXyflowState();

describe('CanvasViewport node operational rail', () => {
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

  it('injects an operational detail port into nodes and closes the popover on pane click', async () => {
    await renderViewport({
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    const node = (
      xyflowState.lastReactFlowProps?.nodes as CanvasViewportProps['nodesWithImpact']
    )[0];
    if (node == null) {
      throw new Error('Expected CanvasViewport to pass the rendered node to React Flow.');
    }
    const openOperationalDetails = (node.data as Record<string, unknown>).onOpenOperationalDetails;
    expect(openOperationalDetails).toEqual(expect.any(Function));

    const detail: GraphNodeOperationalDetail = {
      title: 'Orders source health',
      ariaLabel: 'Open Orders source health metrics',
      rows: [
        { id: 'freshness', label: 'Freshness', value: '12 min' },
        { id: 'size', label: 'Dataset size', value: '18.2 GB' },
      ],
    };

    const viewport = container.querySelector<HTMLElement>('[data-testid="canvas-viewport"]');
    if (viewport == null) {
      throw new Error('Expected the Canvas viewport surface.');
    }
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 60, 800, 600));
    const anchor = document.createElement('button');
    container.append(anchor);
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 180, 80, 24));

    await act(async () => {
      (
        openOperationalDetails as (
          detail: GraphNodeOperationalDetail,
          anchorElement: HTMLElement
        ) => void
      )(detail, anchor);
    });

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();
    const popover = container.querySelector<HTMLElement>('[data-slot="graph-node-health-popover"]');
    expect(popover?.style.getPropertyValue('--graph-node-health-popover-x')).toBe('80px');
    expect(popover?.style.getPropertyValue('--graph-node-health-popover-y')).toBe('152px');
    expect(container.textContent).toContain('Orders source health');
    expect(container.textContent).toContain('18.2 GB');

    const onPaneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      ((event: React.MouseEvent<Element>) => void) | undefined;
    await act(async () => {
      onPaneClick?.({ clientX: 20, clientY: 30 } as unknown as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).toBeNull();
  });

  it('closes the popover on Escape from the canvas surface', async () => {
    await renderViewport({
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    const anchor = await openOperationalDetails('source_orders');

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).toBeNull();
    expect(document.activeElement).toBe(anchor);
  });

  it('does not replace health details when an embedded node control emits a node click', async () => {
    await renderViewport({
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await openOperationalDetails('source_orders');
    const selectedNode = (
      xyflowState.lastReactFlowProps?.nodes as CanvasViewportProps['nodesWithImpact']
    )[0];
    const handleNodeClick = xyflowState.lastReactFlowProps?.onNodeClick as
      | ((event: React.MouseEvent<Element>, graphNode: NonNullable<typeof selectedNode>) => void)
      | undefined;
    const nodeElement = document.createElement('div');
    const embeddedControl = document.createElement('button');
    embeddedControl.setAttribute('data-canvas-node-control', '');
    nodeElement.append(embeddedControl);

    await act(async () => {
      handleNodeClick?.(
        {
          currentTarget: nodeElement,
          target: embeddedControl,
          clientX: 120,
          clientY: 180,
        } as unknown as React.MouseEvent<Element>,
        selectedNode!
      );
    });

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();
    expect(document.body.querySelector('[data-slot="canvas-node-floating-toolbar"]')).toBeNull();
  });

  it('closes the popover when the user clicks outside it within the canvas viewport', async () => {
    await renderViewport({
      nodesWithImpact: [
        {
          id: 'source_orders',
          position: { x: 40, y: 80 },
          data: { name: 'Orders source', selectedForExecution: false },
          type: 'dbtNode',
        },
      ] as CanvasViewportProps['nodesWithImpact'],
    });

    await openOperationalDetails('source_orders');

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();

    const viewport = container.querySelector<HTMLElement>('[data-testid="canvas-viewport"]');
    expect(viewport).not.toBeNull();
    const outsideTarget = document.createElement('button');
    viewport!.append(outsideTarget);
    try {
      await act(async () => {
        fireEvent.pointerDown(outsideTarget);
      });
    } finally {
      outsideTarget.remove();
    }

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).toBeNull();
  });

  it('keeps an explicitly opened popover independent from visual and execution selection', async () => {
    const buildNodes = (
      selectedNodeId?: string
    ): CanvasViewportProps['nodesWithImpact'] => [
      {
        id: 'source_orders',
        position: { x: 40, y: 80 },
        data: {
          name: 'Orders source',
          selectedForExecution: selectedNodeId === 'source_orders',
        },
        type: 'dbtNode',
      },
      {
        id: 'model_orders',
        position: { x: 260, y: 80 },
        data: {
          name: 'Orders model',
          selectedForExecution: selectedNodeId === 'model_orders',
        },
        type: 'dbtNode',
      },
    ];

    await renderViewport({ nodesWithImpact: buildNodes() });
    await openOperationalDetails('source_orders');

    expect(xyflowState.lastReactFlowProps?.onSelectionChange).toBeUndefined();
    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();

    await renderViewport({ nodesWithImpact: buildNodes('source_orders') });
    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();

    await renderViewport({ nodesWithImpact: buildNodes('model_orders') });
    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();
  });

  async function openOperationalDetails(nodeId: string): Promise<HTMLButtonElement> {
    const node = (
      xyflowState.lastReactFlowProps?.nodes as CanvasViewportProps['nodesWithImpact']
    ).find((candidate) => candidate.id === nodeId);
    if (node == null) {
      throw new Error(`Expected node ${nodeId} to be rendered.`);
    }

    const openOperationalDetails = (node.data as Record<string, unknown>).onOpenOperationalDetails;
    expect(openOperationalDetails).toEqual(expect.any(Function));

    const detail: GraphNodeOperationalDetail = {
      title: 'Orders source health',
      ariaLabel: 'Open Orders source health metrics',
      rows: [
        { id: 'freshness', label: 'Freshness', value: '12 min' },
        { id: 'size', label: 'Dataset size', value: '18.2 GB' },
      ],
    };

    const anchor = document.createElement('button');
    container.append(anchor);
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 180, 80, 24));

    await act(async () => {
      (
        openOperationalDetails as (
          detail: GraphNodeOperationalDetail,
          anchorElement: HTMLElement
        ) => void
      )(detail, anchor);
    });
    return anchor;
  }
});
