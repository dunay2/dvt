// @vitest-environment jsdom

/** Owned concern: prove contextual NodeWorkbench overlay gating outside CanvasShell tests. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasNodeWorkbenchOverlay } from './CanvasNodeWorkbenchOverlay';

const workbenchState = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
}));

vi.mock('./CanvasNodeWorkbenchPanel', () => ({
  CanvasNodeWorkbenchPanel: (props: Record<string, unknown>) => {
    workbenchState.props = props;
    const dragHandleProps = props.dragHandleProps as Record<string, unknown> | undefined;
    return (
      <div data-testid="canvas-node-workbench-panel">
        <button role="tab" aria-selected="true">
          General
        </button>
        <input data-testid="node-authoring-input" />
        <div data-testid="canvas-node-workbench-drag-handle" {...dragHandleProps} />
      </div>
    );
  },
}));

const NODE = {
  id: 'node.orders',
  name: 'orders',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;

function renderOverlay(
  root: Root,
  overrides?: Partial<React.ComponentProps<typeof CanvasNodeWorkbenchOverlay>>
): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchOverlay
        layout={{
          focusMode: false,
          inspectorPanelVisible: true,
          surfaceStrategy: dvtCanvasSurfaceStrategy,
        }}
        panels={{
          activeRunId: 'run-42',
          inspectorAuthoring: {
            nodeDraftAuthoring: { apply: vi.fn() },
          },
          inspectorGraphEdges: [],
          inspectorGraphNodes: [NODE],
          inspectorNode: NODE,
          inspectorPreferredTabId: 'columns',
          inspectorPreferredTabRequestId: 7,
          inspectorWorkbenchContributions: [],
          registeredPlugins: new Set(['dbt']),
        }}
        onHide={vi.fn()}
        {...overrides}
      />
    );
  });
}

describe('CanvasNodeWorkbenchOverlay', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    workbenchState.props = null;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the node workbench only for a selected node in contextual overlay posture', () => {
    renderOverlay(root);

    expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="canvas-node-workbench-panel"]')).not.toBeNull();
    expect(workbenchState.props).toMatchObject({
      node: NODE,
      nodes: [NODE],
      activeRunId: 'run-42',
      preferredTabId: 'columns',
      preferredTabRequestId: 7,
      primarySectionIds: dvtCanvasSurfaceStrategy.nodeWorkbench.sections,
    });
  });

  it('moves from the header when the browser declines synthetic pointer capture', () => {
    renderOverlay(root);

    const overlay = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-overlay"]'
    );
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-testid="canvas-node-workbench-drag-handle"]'
    );

    expect(overlay).not.toBeNull();
    expect(dragHandle).not.toBeNull();
    dragHandle!.setPointerCapture = vi.fn(() => {
      throw new DOMException('No active pointer', 'NotFoundError');
    });

    const initialLeft = Number.parseFloat(overlay!.style.left);
    const initialTop = Number.parseFloat(overlay!.style.top);

    expect(Number.isFinite(initialLeft)).toBe(true);
    expect(Number.isFinite(initialTop)).toBe(true);

    act(() => {
      fireEvent.pointerDown(dragHandle!, {
        pointerId: 1,
        button: 0,
        clientX: 100,
        clientY: 80,
      });
      fireEvent.pointerMove(overlay!, {
        pointerId: 1,
        clientX: 52,
        clientY: 112,
      });
      fireEvent.pointerUp(overlay!, { pointerId: 1 });
    });

    expect(Number.parseFloat(overlay!.style.left)).toBe(initialLeft - 48);
    expect(Number.parseFloat(overlay!.style.top)).toBe(initialTop + 32);
    expect(dragHandle!.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('keeps pointer movement within the visible work surface', () => {
    renderOverlay(root);

    const overlay = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-overlay"]'
    )!;
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-testid="canvas-node-workbench-drag-handle"]'
    )!;

    act(() => {
      fireEvent.pointerDown(dragHandle, {
        pointerId: 2,
        button: 0,
        clientX: 100,
        clientY: 80,
      });
      fireEvent.pointerMove(overlay, {
        pointerId: 2,
        clientX: 5_000,
        clientY: 5_000,
      });
      fireEvent.pointerUp(overlay, { pointerId: 2 });
    });

    expect(Number.parseFloat(overlay.style.left)).toBeLessThanOrEqual(window.innerWidth - 448 - 16);
    expect(Number.parseFloat(overlay.style.top)).toBeLessThanOrEqual(window.innerHeight - 640 - 16);
  });

  it('exposes an accessible keyboard drag handle', () => {
    renderOverlay(root);

    const overlay = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-overlay"]'
    )!;
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-testid="canvas-node-workbench-drag-handle"]'
    )!;
    const initialLeft = Number.parseFloat(overlay.style.left);

    expect(dragHandle.tabIndex).toBe(0);
    expect(dragHandle.getAttribute('role')).toBe('button');
    expect(dragHandle.getAttribute('aria-label')).toBeTruthy();

    act(() => {
      fireEvent.keyDown(dragHandle, { key: 'ArrowLeft' });
    });

    expect(Number.parseFloat(overlay.style.left)).toBe(initialLeft - 8);
  });

  it('restores focus to the inspected graph node after closing the workbench', async () => {
    const onHide = vi.fn();
    const graphNode = document.createElement('div');
    graphNode.className = 'react-flow__node';
    graphNode.dataset.id = NODE.id;
    graphNode.tabIndex = 0;
    document.body.appendChild(graphNode);
    renderOverlay(root, { onHide });

    act(() => {
      (workbenchState.props?.onClose as (() => void) | undefined)?.();
    });
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(onHide).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(graphNode);
    graphNode.remove();
  });

  it('does not steal authoring focus when parent callbacks rerender', async () => {
    renderOverlay(root, { onHide: vi.fn() });
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });
    const authoringInput = container.querySelector<HTMLInputElement>(
      '[data-testid="node-authoring-input"]'
    )!;
    authoringInput.focus();

    renderOverlay(root, { onHide: vi.fn() });
    await act(async () => {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    });

    expect(document.activeElement).toBe(authoringInput);
  });

  it('does not mount node workbench chrome when the surface strategy is unavailable', () => {
    renderOverlay(root, {
      layout: {
        focusMode: false,
        inspectorPanelVisible: true,
        surfaceStrategy: null,
      },
    });

    expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).toBeNull();
    expect(workbenchState.props).toBeNull();
  });

  it('does not render when focus mode, hidden inspector, or missing node makes the workbench inactive', () => {
    const inactiveStates: Array<Partial<React.ComponentProps<typeof CanvasNodeWorkbenchOverlay>>> =
      [
        {
          layout: {
            focusMode: true,
            inspectorPanelVisible: true,
            surfaceStrategy: dvtCanvasSurfaceStrategy,
          },
        },
        {
          layout: {
            focusMode: false,
            inspectorPanelVisible: false,
            surfaceStrategy: dvtCanvasSurfaceStrategy,
          },
        },
        {
          panels: {
            activeRunId: 'run-42',
            inspectorAuthoring: {
              nodeDraftAuthoring: { apply: vi.fn() },
            },
            inspectorGraphEdges: [],
            inspectorGraphNodes: [NODE],
            inspectorNode: null,
            inspectorPreferredTabId: null,
            inspectorPreferredTabRequestId: 0,
            inspectorWorkbenchContributions: [],
            registeredPlugins: new Set(['dbt']),
          },
        },
      ];

    for (const inactiveState of inactiveStates) {
      renderOverlay(root, inactiveState);

      expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).toBeNull();
      expect(workbenchState.props).toBeNull();
    }
  });
});
