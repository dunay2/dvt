// @vitest-environment jsdom

/** Owned concern: prove fixed NodeWorkbench inspector gating outside CanvasShell tests. */
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
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;

const SOURCE_NODE = {
  id: 'source.orders',
  name: 'orders source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
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
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
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
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the existing inspector as a fixed sibling without node-relative geometry', () => {
    renderOverlay(root);
    const inspector = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-overlay"]'
    )!;
    expect(inspector.tagName).toBe('ASIDE');
    expect(inspector.className).toContain('border-l');
    expect(inspector.className).not.toContain('absolute');
    expect(inspector.style.left).toBe('');
    expect(inspector.style.top).toBe('');
    expect(workbenchState.props).toMatchObject({
      node: NODE,
      nodes: [NODE],
      activeRunId: 'run-42',
      preferredTabId: 'columns',
      preferredTabRequestId: 7,
      primarySectionIds: dvtCanvasSurfaceStrategy.nodeWorkbench.sections,
    });
    expect(workbenchState.props?.dragHandleProps).toBeUndefined();
  });

  it('preserves card focus on opening and authoring focus on parent rerenders', () => {
    const card = document.createElement('button');
    document.body.appendChild(card);
    card.focus();
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    renderOverlay(root);
    expect(document.activeElement).toBe(card);
    expect(frame).not.toHaveBeenCalled();
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="node-authoring-input"]'
    )!;
    input.focus();
    renderOverlay(root);
    expect(document.activeElement).toBe(input);
    expect(frame).not.toHaveBeenCalled();
    card.remove();
  });

  it('does not reopen or reposition the panel when the selected source changes', () => {
    renderOverlay(root);
    const inspector = container.querySelector('[data-slot="canvas-node-workbench-overlay"]');
    renderOverlay(root, {
      panels: {
        activeRunId: null,
        inspectorAuthoring: { canEditNode: false, onApplyNodeDraft: vi.fn() },
        inspectorGraphEdges: [],
        inspectorGraphNodes: [SOURCE_NODE],
        inspectorNode: SOURCE_NODE,
        inspectorPreferredTabId: 'columns',
        inspectorPreferredTabRequestId: 8,
        inspectorWorkbenchContributions: [],
        registeredPlugins: new Set(),
      },
    });
    expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).toBe(inspector);
    expect(workbenchState.props?.node).toBe(SOURCE_NODE);
    expect(workbenchState.props?.authoring).toMatchObject({ canEditNode: false });
  });

  it('closes on Escape from its panel, not from another surface or an already handled gesture', () => {
    const onHide = vi.fn();
    renderOverlay(root, { onHide });
    act(() => fireEvent.keyDown(document.body, { key: 'Escape' }));
    expect(onHide).not.toHaveBeenCalled();
    const input = container.querySelector('input')!;
    const handled = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    act(() => input.dispatchEvent(handled));
    expect(onHide).not.toHaveBeenCalled();
    act(() => fireEvent.keyDown(input, { key: 'Escape' }));
    expect(onHide).toHaveBeenCalledOnce();
  });

  it.each([false, true])('restores card focus unless a newer interaction owns it (%s)', (newer) => {
    const card = document.createElement('div');
    card.className = 'react-flow__node';
    card.dataset.id = NODE.id;
    card.tabIndex = 0;
    const control = document.createElement('button');
    document.body.append(card, control);
    renderOverlay(root);
    const input = container.querySelector<HTMLInputElement>('input')!;
    input.focus();
    let closeFrame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      closeFrame = callback;
      return 1;
    });
    act(() => {
      (workbenchState.props!.onClose as () => void)();
      if (newer) control.focus();
      closeFrame!(0);
    });
    expect(document.activeElement).toBe(newer ? control : card);
    card.remove();
    control.remove();
  });

  it.each(['focus', 'hidden', 'strategy', 'node'])(
    'does not mount an inactive inspector (%s)',
    (reason) => {
      renderOverlay(root, {
        layout: {
          focusMode: reason === 'focus',
          inspectorPanelVisible: reason !== 'hidden',
          surfaceStrategy: reason === 'strategy' ? null : dvtCanvasSurfaceStrategy,
        },
        ...(reason === 'node'
          ? {
              panels: {
                activeRunId: null,
                inspectorAuthoring: { canEditNode: false, onApplyNodeDraft: vi.fn() },
                inspectorGraphEdges: [],
                inspectorGraphNodes: [],
                inspectorNode: null,
                inspectorPreferredTabId: null,
                inspectorPreferredTabRequestId: 0,
                inspectorWorkbenchContributions: [],
                registeredPlugins: new Set<string>(),
              },
            }
          : {}),
      });
      expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).toBeNull();
      expect(workbenchState.props).toBeNull();
    }
  );
});
