// @vitest-environment jsdom

import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  buildCanvasAddNodeCatalogMenuModel,
  buildCanvasContextMenuModel,
} from './canvasInteractionCommandSurface';
import { CanvasContextMenuView } from './CanvasContextMenuView';

describe('CanvasContextMenuView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('does not render a menu when no context model is active', async () => {
    await act(async () => {
      root.render(
        <CanvasContextMenuView
          model={null}
          menuRef={createRef<HTMLDivElement>()}
          onCanvasAction={vi.fn()}
          onCreateNodeAction={vi.fn()}
          onEdgeAction={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
  });

  it('renders the background root menu without inline node-scoped actions', async () => {
    const onCanvasAction = vi.fn();
    const onCreateNodeAction = vi.fn();
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 580, y: 280 },
      },
      canMutateGraph: true,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [sourceKind],
    });

    await act(async () => {
      root.render(
        <CanvasContextMenuView
          model={model}
          menuRef={createRef<HTMLDivElement>()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
    expect(menuButtonLabels('canvas-context-menu-add-group')).toEqual(['Add...']);
    expect(menuButtonLabels('canvas-context-menu-canvas-group')).toEqual(['Canvas settings']);
    expect(container.textContent).not.toContain('Add source');
    expect(container.textContent).not.toContain('Validate graph');
    expect(container.textContent).not.toContain('Preview execution plan');
    expect(container.textContent).not.toContain('Edit SQL');
    expect(container.textContent).not.toContain('Properties');
    expect(container.textContent).not.toContain('Inputs');
    expect(container.textContent).not.toContain('Tests');
    expect(container.textContent).not.toContain('Run from here');
    expect(container.textContent).not.toContain('Duplicate');
    expect(container.textContent).not.toContain('Delete');

    await clickMenuItem('Add...');
    expect(onCanvasAction).toHaveBeenCalledWith({
      action: 'open-add-node-catalog',
      label: 'Add...',
    });

    expect(onCreateNodeAction).not.toHaveBeenCalled();
  });

  it('renders catalog node actions only for the add-node catalog surface', async () => {
    const onCanvasAction = vi.fn();
    const onCreateNodeAction = vi.fn();
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const rootModel = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 580, y: 280 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [sourceKind],
    });
    const catalogModel = buildCanvasAddNodeCatalogMenuModel({
      sourceModel: rootModel,
      authoringNodeKinds: [sourceKind],
    });

    await act(async () => {
      root.render(
        <CanvasContextMenuView
          model={catalogModel}
          menuRef={createRef<HTMLDivElement>()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Add component');
    expect(container.textContent).toContain('Add source');
    expect(container.textContent).toContain('Sources');
    expect(container.textContent).toContain('Attach a governed warehouse or dbt source');

    await clickMenuItem('Add source');

    expect(onCreateNodeAction).toHaveBeenCalledWith({
      action: 'create-node',
      label: 'Add source',
      registration: sourceKind,
    });
    expect(onCanvasAction).not.toHaveBeenCalled();
  });

  it('routes edge actions through the edge callback only', async () => {
    const onCanvasAction = vi.fn();
    const onCreateNodeAction = vi.fn();
    const onEdgeAction = vi.fn();
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'edge',
        edgeId: 'edge-source-model',
        screenPosition: { x: 600, y: 360 },
      },
      canMutateGraph: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    await act(async () => {
      root.render(
        <CanvasContextMenuView
          model={model}
          menuRef={createRef<HTMLDivElement>()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={onEdgeAction}
        />
      );
    });

    await clickMenuItem('Eliminar conexión');

    expect(onEdgeAction).toHaveBeenCalledWith({
      action: 'remove-edge',
      label: 'Eliminar conexión',
    });
    expect(onCanvasAction).not.toHaveBeenCalled();
    expect(onCreateNodeAction).not.toHaveBeenCalled();
  });

  async function clickMenuItem(label: string): Promise<void> {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label)
    );
    expect(button, label).toBeDefined();

    await act(async () => {
      button?.click();
    });
  }

  function menuButtonLabels(dataSlot: string): string[] {
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>(`[data-slot="${dataSlot}"] button`)
    ).map((button) => button.textContent?.trim() ?? '');
  }
});
