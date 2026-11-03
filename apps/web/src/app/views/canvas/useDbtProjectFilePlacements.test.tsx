// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DragEvent } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from './canvasNodeDropPayload';
import { useDbtProjectFilePlacements } from './useDbtProjectFilePlacements';

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ screenToFlowPosition: () => ({ x: 480, y: 260 }) }),
}));
const source: CanonicalNode = {
  id: 'source.shop.orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: { authority: 'dbt-project-files', resourceType: 'source' },
};
const model: CanonicalNode = {
  ...source,
  id: 'model.shop.sales',
  name: 'sales',
  kind: 'dvt:transform',
  role: 'transform',
  metadata: { authority: 'dbt-project-files', resourceType: 'model' },
};
const resources = [source, model];
function drop(
  resourceId: string,
  mime = CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
  scopeKey = 'scope::canvas::root'
): DragEvent<HTMLDivElement> {
  return {
    preventDefault: vi.fn(),
    clientX: 400,
    clientY: 300,
    dataTransfer: {
      types: [mime],
      getData: () => JSON.stringify({ id: resourceId, scopeKey }),
      dropEffect: 'none',
    },
  } as unknown as DragEvent<HTMLDivElement>;
}
let root: Root;
let container: HTMLDivElement;
let placements: ReturnType<typeof useDbtProjectFilePlacements>;
function Harness(props: Parameters<typeof useDbtProjectFilePlacements>[0]): null {
  placements = useDbtProjectFilePlacements(props);
  return null;
}
function renderPlacements(args: Parameters<typeof useDbtProjectFilePlacements>[0]): void {
  act(() => {
    root.render(<Harness {...args} />);
  });
}
describe('file resource placement admission', () => {
  beforeEach(() => {
    localStorage.clear();
    useCanvasInteractionStore.setState({ canvasLayouts: {} });
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });
  it('places repeated sources and models with independent identities and preserves them on remount', () => {
    const args = { layoutKey: 'scope::canvas::root', resources, canPlaceReferences: true };
    renderPlacements(args);
    act(() => {
      placements.onDrop(drop(source.id));
      placements.onDrop(drop(source.id));
      placements.onDrop(drop(model.id));
    });
    const layout = useCanvasInteractionStore.getState().canvasLayouts[args.layoutKey]!;
    expect(layout.resourceInstances).toHaveLength(3);
    expect(new Set(layout.resourceInstances!.map((n) => n.id)).size).toBe(3);
    expect(Object.values(layout.nodePositions)).toEqual(Array(3).fill({ x: 380, y: 220 }));
    const modelInstance = layout.resourceInstances![2]!;
    expect(placements.definitionIdByInstanceId.get(modelInstance.id)).toBe(model.id);
    const before = JSON.stringify(resources);
    act(() => {
      placements.removeInstance(layout.resourceInstances![0]!.id);
      placements.removeInstance(source.id);
    });
    expect(JSON.stringify(resources)).toBe(before);
    expect(
      useCanvasInteractionStore.getState().canvasLayouts[args.layoutKey]!.resourceInstances
    ).toHaveLength(2);
    act(() => {
      root.unmount();
    });
    root = createRoot(container);
    renderPlacements(args);
    expect(placements.nodes.map((n) => n.id)).toContain(modelInstance.id);
    act(() => {
      expect(
        placements.applyNodeChanges([
          { id: model.id, type: 'remove' },
          { id: modelInstance.id, type: 'remove' },
        ])
      ).toEqual([]);
    });
    expect(placements.nodes.map((n) => n.id)).toContain(model.id);
    expect(placements.nodes.map((n) => n.id)).not.toContain(modelInstance.id);
  });
  it.each([
    ['missing', true, CANVAS_CATALOG_NODE_DRAG_MIME_TYPE],
    [model.id, false, CANVAS_CATALOG_NODE_DRAG_MIME_TYPE],
    [model.id, true, 'text/plain'],
  ])('rejects unavailable admission: %s, %s, %s', (id, allowed, mime) => {
    renderPlacements({ layoutKey: 'scope::canvas::root', resources, canPlaceReferences: allowed });
    const event = drop(id, mime);
    act(() => {
      placements.onDrop(event);
    });
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
    expect(event.dataTransfer.dropEffect).toBe('none');
  });
  it('uses the latest scope and freshness and never places a resource from a previous project', () => {
    const first = { layoutKey: 'scope::canvas::root', resources, canPlaceReferences: true };
    renderPlacements(first);
    renderPlacements({ ...first, layoutKey: 'second' });
    act(() => {
      placements.onDrop(drop(model.id));
    });
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
    renderPlacements({ ...first, canPlaceReferences: false });
    act(() => {
      placements.onDrop(drop(model.id));
    });
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
});
