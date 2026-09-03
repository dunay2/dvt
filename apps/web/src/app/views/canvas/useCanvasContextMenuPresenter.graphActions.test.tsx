// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  useCanvasContextMenuPresenter,
  type CanvasContextMenuPresenter,
} from './useCanvasContextMenuPresenter';
import { buildCanvasDependencyEdgeData } from './canvasDependencyEdgeModel';

function PresenterHarness({
  onCreateAuthoringNode,
  onEdgesChange,
  onSetEdgeExecutionGate,
  onPresenter,
}: Readonly<{
  onCreateAuthoringNode: ReturnType<typeof vi.fn>;
  onEdgesChange: ReturnType<typeof vi.fn>;
  onSetEdgeExecutionGate: ReturnType<typeof vi.fn>;
  onPresenter: (presenter: CanvasContextMenuPresenter) => void;
}>): null {
  const presenter = useCanvasContextMenuPresenter({
    canEditEdges: true,
    canOpenSourceImport: false,
    canOpenCanvasSettings: false,
    authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    screenToFlowPosition: ({ x, y }) => ({ x: x + 100, y: y - 40 }),
    onCreateAuthoringNode,
    onEdgesChange,
    onSetEdgeExecutionGate,
  });

  onPresenter(presenter);
  return null;
}

describe('useCanvasContextMenuPresenter graph actions', () => {
  let container: HTMLDivElement;
  let onCreateAuthoringNode: ReturnType<typeof vi.fn>;
  let onEdgesChange: ReturnType<typeof vi.fn>;
  let onSetEdgeExecutionGate: ReturnType<typeof vi.fn>;
  let presenter: CanvasContextMenuPresenter | null;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onCreateAuthoringNode = vi.fn();
    onEdgesChange = vi.fn();
    onSetEdgeExecutionGate = vi.fn(() => true);
    presenter = null;
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPresenter(): Promise<void> {
    await act(async () => {
      root.render(
        <PresenterHarness
          onCreateAuthoringNode={onCreateAuthoringNode}
          onEdgesChange={onEdgesChange}
          onSetEdgeExecutionGate={onSetEdgeExecutionGate}
          onPresenter={(next) => (presenter = next)}
        />
      );
    });
  }

  it('creates authoring nodes from the add-node catalog at the captured flow position', async () => {
    await renderPresenter();
    await act(async () => {
      presenter?.handleViewportContextMenu({
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        target: document.createElement('div'),
        clientX: 320,
        clientY: 260,
      } as unknown as React.MouseEvent<HTMLDivElement>);
    });

    await act(async () => {
      presenter?.handleCanvasAction({ action: 'open-add-node-catalog', label: 'Add...' });
    });

    const action = presenter?.model?.catalogActions.find(
      (candidate) => candidate.action === 'create-node'
    );
    expect(action).toBeDefined();
    await act(async () => {
      if (action != null) {
        presenter?.handleCreateNodeAction(action);
      }
    });

    expect(onCreateAuthoringNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'dvt:source' }),
      { x: 420, y: 220 }
    );
    expect(presenter?.model ?? null).toBeNull();
  });

  it('routes edge removal through the edge change rail', async () => {
    await renderPresenter();
    await act(async () => {
      presenter?.handleEdgeContextMenu(
        {
          preventDefault: vi.fn(),
          clientX: 440,
          clientY: 300,
        } as unknown as React.MouseEvent<Element>,
        { id: 'edge-orders' } as Parameters<CanvasContextMenuPresenter['handleEdgeContextMenu']>[1]
      );
    });

    const action = presenter?.model?.edgeActions[0];
    expect(action).toBeDefined();
    await act(async () => {
      if (action != null) {
        presenter?.handleEdgeAction(action);
      }
    });

    expect(onEdgesChange).toHaveBeenCalledWith([{ id: 'edge-orders', type: 'remove' }]);
    expect(presenter?.model ?? null).toBeNull();
  });

  it('routes the opposite execution gate through the existing semantic edge command', async () => {
    await renderPresenter();
    await act(async () => {
      presenter?.handleEdgeContextMenu(
        {
          preventDefault: vi.fn(),
          clientX: 440,
          clientY: 300,
        } as unknown as React.MouseEvent<Element>,
        {
          id: 'edge-orders',
          source: 'orders',
          target: 'transform',
          type: 'dependency',
          data: buildCanvasDependencyEdgeData({ sourceId: 'orders', targetId: 'transform' }),
        } as Parameters<CanvasContextMenuPresenter['handleEdgeContextMenu']>[1]
      );
    });

    const action = presenter?.model?.edgeActions.find(
      (candidate) => candidate.action === 'set-execution-gate'
    );
    expect(action).toBeDefined();
    await act(async () => {
      if (action != null) {
        presenter?.handleEdgeAction(action);
      }
    });

    expect(onSetEdgeExecutionGate).toHaveBeenCalledWith({
      sourceId: 'orders',
      targetId: 'transform',
      gate: 'closed',
    });
    expect(onEdgesChange).not.toHaveBeenCalled();
  });
});
