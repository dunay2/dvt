// @vitest-environment jsdom

import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { buildCanvasContextMenuModel } from './canvasInteractionCommandSurface';
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

  it('renders add and canvas command groups without node-scoped actions', async () => {
    const onCanvasAction = vi.fn();
    const onCreateNodeAction = vi.fn();
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 480, y: 320 },
        flowPosition: { x: 580, y: 280 },
      },
      canMutateGraph: true,
      canOpenCanvasSettings: true,
      canOpenProjectExplorer: true,
      canOpenSourceImport: true,
      canPreviewExecutionPlan: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
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
    expect(menuButtonLabels('canvas-context-menu-add-group')).toEqual([
      'Add source',
      'Create source node',
    ]);
    expect(menuButtonLabels('canvas-context-menu-canvas-group')).toEqual([
      'Explore project',
      'Preview execution plan',
      'Canvas settings',
    ]);
    expect(container.textContent).not.toContain('Edit SQL');
    expect(container.textContent).not.toContain('Properties');
    expect(container.textContent).not.toContain('Inputs');
    expect(container.textContent).not.toContain('Tests');
    expect(container.textContent).not.toContain('Run from here');
    expect(container.textContent).not.toContain('Duplicate');
    expect(container.textContent).not.toContain('Delete');

    await clickMenuItem('Add source');
    expect(onCanvasAction).toHaveBeenCalledWith({
      action: 'open-source-import',
      label: 'Add source',
    });

    await clickMenuItem('Create source node');
    expect(onCreateNodeAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create-node', label: 'Create source node' })
    );
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
    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === label
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
