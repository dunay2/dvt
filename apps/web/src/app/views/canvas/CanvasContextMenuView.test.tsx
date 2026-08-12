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
          onClose={vi.fn()}
          onCatalogClose={vi.fn()}
          onCanvasAction={vi.fn()}
          onCreateNodeAction={vi.fn()}
          onEdgeAction={vi.fn()}
        >
          <div>Canvas trigger</div>
        </CanvasContextMenuView>
      );
    });

    expect(document.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
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
          onClose={vi.fn()}
          onCatalogClose={vi.fn()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={vi.fn()}
        >
          <div>Canvas trigger</div>
        </CanvasContextMenuView>
      );
    });
    await openCommandMenu();
    expect(document.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
    expect(menuButtonLabels('canvas-context-menu-add-group')).toEqual(['Add...']);
    expect(menuButtonLabels('canvas-context-menu-canvas-group')).toEqual(['Canvas settings']);
    expect(
      document.querySelector(
        '[data-slot="canvas-context-menu-item"][data-menu-item-kind="canvas"][data-menu-action="open-add-node-catalog"]'
      )?.textContent
    ).toContain('Add...');
    expect(document.body.textContent).not.toContain('Add source');
    expect(document.body.textContent).not.toContain('Validate graph');
    expect(document.body.textContent).not.toContain('Preview execution plan');
    expect(document.body.textContent).not.toContain('Edit SQL');
    expect(document.body.textContent).not.toContain('Properties');
    expect(document.body.textContent).not.toContain('Inputs');
    expect(document.body.textContent).not.toContain('Tests');
    expect(document.body.textContent).not.toContain('Run from here');
    expect(document.body.textContent).not.toContain('Duplicate');
    expect(document.body.textContent).not.toContain('Delete');

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
          onClose={vi.fn()}
          onCatalogClose={vi.fn()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={vi.fn()}
        >
          <div>Canvas trigger</div>
        </CanvasContextMenuView>
      );
    });

    expect(document.body.textContent).toContain('Add component');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.body.textContent).toContain('Add source');
    expect(document.body.textContent).toContain('Sources');
    expect(document.body.textContent).toContain('Attach a governed warehouse or dbt source');

    await clickCatalogAction('Add source');

    expect(onCreateNodeAction).toHaveBeenCalledWith({
      action: 'create-node',
      label: 'Add source',
      registration: sourceKind,
    });
    expect(onCanvasAction).not.toHaveBeenCalled();
  });

  it('routes source import catalog selection through the source import action', async () => {
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
      canOpenSourceImport: true,
    });

    await act(async () => {
      root.render(
        <CanvasContextMenuView
          model={catalogModel}
          menuRef={createRef<HTMLDivElement>()}
          onClose={vi.fn()}
          onCatalogClose={vi.fn()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={vi.fn()}
        >
          <div>Canvas trigger</div>
        </CanvasContextMenuView>
      );
    });

    expect(document.body.textContent).toContain('Add source');
    expect(document.body.textContent).toContain('Sources');
    expect(
      document.querySelector(
        '[data-slot="canvas-context-menu-add-catalog-item"][data-menu-action="open-source-import"]'
      )?.textContent
    ).toContain('Add source');

    await clickCatalogAction('Add source');

    expect(onCanvasAction).toHaveBeenCalledWith({
      action: 'open-source-import',
      label: 'Add source',
    });
    expect(onCreateNodeAction).not.toHaveBeenCalled();
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
          onClose={vi.fn()}
          onCatalogClose={vi.fn()}
          onCanvasAction={onCanvasAction}
          onCreateNodeAction={onCreateNodeAction}
          onEdgeAction={onEdgeAction}
        >
          <div>Canvas trigger</div>
        </CanvasContextMenuView>
      );
    });
    await openCommandMenu();
    await clickMenuItem('Remove connection');

    expect(onEdgeAction).toHaveBeenCalledWith({
      action: 'remove-edge',
      label: 'Remove connection',
    });
    expect(onCanvasAction).not.toHaveBeenCalled();
    expect(onCreateNodeAction).not.toHaveBeenCalled();
  });

  async function clickMenuItem(label: string): Promise<void> {
    const button = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (candidate) => candidate.textContent?.includes(label)
    );
    expect(button, label).toBeDefined();

    await act(async () => {
      button?.click();
    });
  }

  async function clickCatalogAction(label: string): Promise<void> {
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[data-slot="canvas-context-menu-add-catalog-item"]'
      )
    ).find((candidate) => candidate.textContent?.includes(label));
    expect(button, label).toBeDefined();

    await act(async () => {
      button?.click();
    });
  }

  async function openCommandMenu(): Promise<void> {
    const trigger = container.querySelector<HTMLElement>(
      '[data-slot="canvas-context-menu-trigger"]'
    );
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          buttons: 2,
          clientX: 240,
          clientY: 160,
        })
      );
    });
  }

  function menuButtonLabels(dataSlot: string): string[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(`[data-slot="${dataSlot}"] [role="menuitem"]`)
    ).map((button) => button.textContent?.trim() ?? '');
  }
});
