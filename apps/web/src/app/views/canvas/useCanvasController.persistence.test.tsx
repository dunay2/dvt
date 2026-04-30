import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildRemoteDraftRecord,
  createHarnessWithDraft,
} from './useCanvasController.draftLifecycle.test.support';
import { setupCanvasControllerHarness } from './useCanvasController.test.harness';
import { useCanvasLayoutPersistence } from './useCanvasLayoutPersistence';

type LayoutPersistenceArgs = Parameters<typeof useCanvasLayoutPersistence>[0];

function LayoutPersistenceProbe({ args }: Readonly<{ args: LayoutPersistenceArgs }>): null {
  useCanvasLayoutPersistence(args);
  return null;
}

async function renderLayoutPersistenceProbe(args: LayoutPersistenceArgs): Promise<{
  cleanup: () => void;
  rerender: (nextArgs: LayoutPersistenceArgs) => Promise<void>;
}> {
  const container = document.createElement('div');
  const root: Root = createRoot(container);
  document.body.appendChild(container);

  await act(async () => {
    root.render(<LayoutPersistenceProbe args={args} />);
  });

  return {
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
    rerender: async (nextArgs) => {
      await act(async () => {
        root.render(<LayoutPersistenceProbe args={nextArgs} />);
      });
    },
  };
}

describe('useCanvasController persistence guards', () => {
  let harness: ReturnType<typeof setupCanvasControllerHarness>;

  beforeEach(async () => {
    harness = setupCanvasControllerHarness();
    await harness.renderProbe();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('does not persist node positions while graph query is pending', async () => {
    harness.mocks.useQuery.mockReturnValue({
      data: harness.state.graphData,
      isPending: true,
      isError: false,
    });
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleNodeDragStop?.(
        {} as never,
        {} as never,
        [
          { id: 'node_1', position: { x: 10, y: 20 } },
          { id: 'node_2', position: { x: 40, y: 80 } },
        ] as never
      );
    });

    expect(harness.state.store.setCanvasNodePositions).not.toHaveBeenCalled();
  });

  it('does not persist viewport while graph query is pending', async () => {
    harness.mocks.useQuery.mockReturnValue({
      data: harness.state.graphData,
      isPending: true,
      isError: false,
    });
    await harness.renderProbe();

    await act(async () => {
      harness.getLatestResult()?.handleViewportChange({ x: 1, y: 2, zoom: 1.2 });
    });

    expect(harness.state.store.setCanvasViewport).not.toHaveBeenCalled();
  });

  it('persists the dragged node position from the drag-stop event payload', async () => {
    await act(async () => {
      harness.getLatestResult()?.handleNodeDragStop?.(
        {} as never,
        { id: 'node_1', position: { x: 225, y: 210 } } as never,
        [
          { id: 'node_1', position: { x: 0, y: 0 } },
          { id: 'node_2', position: { x: 100, y: 0 } },
        ] as never
      );
    });

    expect(harness.state.store.setCanvasNodePositions).toHaveBeenCalledWith(
      'tenant-a::project-a::dev',
      {
        node_1: { x: 225, y: 210 },
        node_2: { x: 100, y: 0 },
      }
    );
  });

  it('persists settled live drag positions from the viewport model', async () => {
    const setCanvasNodePositions = vi.fn();
    const args: LayoutPersistenceArgs = {
      hasHydrated: true,
      isGraphQueryPending: false,
      workspaceLayoutKey: 'tenant-a::project-a::dev',
      nodes: [
        { id: 'node_1', position: { x: 225, y: 210 }, dragging: true, data: {} },
        { id: 'node_2', position: { x: 100, y: 0 }, data: {} },
      ],
      persistedViewport: null,
      persistedNodePositions: {},
      setCanvasViewport: vi.fn(),
      setCanvasNodePositions,
    };
    const mounted = await renderLayoutPersistenceProbe(args);

    await mounted.rerender({
      ...args,
      nodes: [
        { id: 'node_1', position: { x: 225, y: 210 }, data: {} },
        { id: 'node_2', position: { x: 100, y: 0 }, data: {} },
      ],
    });

    expect(setCanvasNodePositions).toHaveBeenCalledWith('tenant-a::project-a::dev', {
      node_1: { x: 225, y: 210 },
      node_2: { x: 100, y: 0 },
    });
    mounted.cleanup();
  });

  it('does not rewrite persisted node positions for an unsettled live drag frame', async () => {
    const setCanvasNodePositions = vi.fn();
    const mounted = await renderLayoutPersistenceProbe({
      hasHydrated: true,
      isGraphQueryPending: false,
      workspaceLayoutKey: 'tenant-a::project-a::dev',
      nodes: [
        { id: 'node_1', position: { x: 225, y: 210 }, dragging: true, data: {} },
        { id: 'node_2', position: { x: 100, y: 0 }, data: {} },
      ],
      persistedViewport: null,
      persistedNodePositions: {},
      setCanvasViewport: vi.fn(),
      setCanvasNodePositions,
    });

    expect(setCanvasNodePositions).not.toHaveBeenCalled();
    mounted.cleanup();
  });

  it('prefers persisted node positions deterministically when syncing protected draft nodes', async () => {
    harness.cleanup();
    harness = await createHarnessWithDraft(
      buildRemoteDraftRecord({
        nodeIds: ['node_1'],
        nodePositions: {
          node_1: { x: 0, y: 0 },
        },
        edges: [],
      })
    );
    harness.state.store.canvasLayouts = {
      'tenant-a::project-a::dev': {
        viewport: { x: 0, y: 0, zoom: 1 },
        nodePositions: {
          node_1: { x: 320, y: 240 },
        },
      },
    };
    await harness.renderProbe();

    const node = harness
      .getLatestResult()
      ?.nodesWithImpact.find((candidate) => candidate.id === 'node_1');
    expect(node?.position).toEqual({ x: 320, y: 240 });
  });
});
