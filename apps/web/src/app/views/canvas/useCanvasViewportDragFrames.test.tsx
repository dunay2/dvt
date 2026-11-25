// @vitest-environment jsdom
import type { Node, NodeChange, ReactFlowProps } from '@xyflow/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => import('./canvasViewportXyflowTestAdapter'));
vi.mock(
  '../../plugins/nodeTypeRegistry',
  () => import('./canvasViewportNodeTypeRegistryTestAdapter')
);

import {
  createCanvasViewportHarness,
  getCanvasViewportXyflowState,
} from './CanvasViewport.testHarness';

const nodes: Node[] = ['left', 'right', 'still'].map((id, index) => ({
  id,
  position: { x: index * 350, y: 20 },
  data: {
    name: id,
    pluginKind: 'dvt:transform',
    pluginId: 'dvt',
    role: 'transform',
    status: 'idle',
    tags: [],
  },
}));
function flow(): ReactFlowProps {
  return getCanvasViewportXyflowState().lastReactFlowProps as ReactFlowProps;
}
function move(id: string, x: number, dragging: boolean): NodeChange {
  return { type: 'position', id, dragging, position: { x, y: 45 } };
}
function dispatch(changes: NodeChange[]): void {
  act(() => flow().onNodesChange!(changes));
}
function positions(): Node['position'][] | undefined {
  return flow().nodes?.map((node) => node.position);
}

describe('Canvas pointer movement', () => {
  let harness: ReturnType<typeof createCanvasViewportHarness>;
  beforeEach(() => {
    harness = createCanvasViewportHarness();
  });
  afterEach(() => harness.unmount());

  it('renders intermediate selection positions without routing each pointer update through the workspace', async () => {
    const onNodesChange = vi.fn();
    await harness.render({ nodesWithImpact: nodes, canMoveNodes: true, onNodesChange });
    const stationary = flow().nodes![2];
    dispatch([move('left', 9, true), move('right', 359, true)]);
    expect(positions()).toEqual([{ x: 9, y: 45 }, { x: 359, y: 45 }, nodes[2]!.position]);
    dispatch([move('left', 15, true), move('right', 365, true)]);
    expect(onNodesChange).not.toHaveBeenCalled();
    expect(flow().nodes![2]).toBe(stationary);
    const release = [move('left', 15, false), move('right', 365, false)];
    dispatch(release);
    expect(onNodesChange.mock.calls).toEqual([[release]]);
  });

  it('forgets a provisional position when the node disappears from the source graph', async () => {
    const initial = { nodesWithImpact: nodes, canMoveNodes: true, onNodesChange: vi.fn() };
    await harness.render(initial);
    dispatch([move('left', 80, true)]);
    await harness.render({ ...initial, nodesWithImpact: nodes.slice(1) });
    await harness.render(initial);
    expect(positions()?.[0]).toEqual(nodes[0]!.position);
    expect(initial.onNodesChange).not.toHaveBeenCalled();
  });

  it('forwards selection and keyboard updates and discards an unfinished gesture when the Canvas changes', async () => {
    const onNodesChange = vi.fn();
    const initial = { nodesWithImpact: nodes, canMoveNodes: true, onNodesChange };
    await harness.render({ ...initial, catalogueScopeKey: 'one' });
    const selection: NodeChange = { type: 'select', id: 'right', selected: true };
    dispatch([move('left', 44, true), selection]);
    expect(onNodesChange.mock.calls).toEqual([[[selection]]]);
    expect(positions()?.[0]).toEqual({ x: 44, y: 45 });
    await harness.render({ ...initial, catalogueScopeKey: 'two' });
    expect(positions()?.[0]).toEqual(nodes[0]!.position);
    const keyboard = { type: 'position' as const, id: 'left', position: { x: 8, y: 20 } };
    dispatch([keyboard]);
    expect(onNodesChange.mock.calls).toEqual([[[selection]], [[keyboard]]]);
  });
});
