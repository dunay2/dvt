// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

    await act(async () => {
      (openOperationalDetails as (detail: GraphNodeOperationalDetail, anchorRect: DOMRect) => void)(
        detail,
        new DOMRect(120, 180, 80, 24)
      );
    });

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).not.toBeNull();
    expect(container.textContent).toContain('Orders source health');
    expect(container.textContent).toContain('18.2 GB');

    const onPaneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    await act(async () => {
      onPaneClick?.({ clientX: 20, clientY: 30 } as unknown as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="graph-node-health-popover"]')).toBeNull();
  });
});
