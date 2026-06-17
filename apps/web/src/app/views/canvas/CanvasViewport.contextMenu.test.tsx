// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import {
  createCanvasViewportHarness,
  getCanvasViewportXyflowState,
  type CanvasViewportProps,
} from './CanvasViewport.testHarness';

const xyflowState = getCanvasViewportXyflowState();

describe('CanvasViewport context menus', () => {
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
    vi.useRealTimers();
  });

  async function openPaneContextMenu(): Promise<void> {
    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneContextMenu?.({
        preventDefault: vi.fn(),
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });
  }

  function getMenuText(): string {
    return container.querySelector('[data-slot="canvas-context-menu"]')?.textContent ?? '';
  }

  function findMenuButton(label: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === label
    );
  }

  async function clickMenuItem(label: string): Promise<void> {
    const button = findMenuButton(label);
    expect(button, label).toBeDefined();
    await act(async () => {
      button?.click();
    });
  }

  it('keeps the canvas menu open through a delayed pane-click echo from the same right-click', async () => {
    vi.useFakeTimers();
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    await openPaneContextMenu();
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();

    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    vi.advanceTimersByTime(1_000);

    await act(async () => {
      paneClick?.({
        button: 0,
        clientX: 480,
        clientY: 320,
      } as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('closes the canvas menu when the user left-clicks a different pane point', async () => {
    vi.useFakeTimers();
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });

    await openPaneContextMenu();

    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    vi.advanceTimersByTime(1_000);

    await act(async () => {
      paneClick?.({
        button: 0,
        clientX: 640,
        clientY: 360,
      } as React.MouseEvent<Element>);
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
  });

  it('opens a governed create-node menu from the background context gesture', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = await renderViewport({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    const paneContextMenu = xyflowState.lastReactFlowProps?.onPaneContextMenu as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    const preventDefault = vi.fn();

    await act(async () => {
      paneContextMenu?.({
        preventDefault,
        clientX: 480,
        clientY: 320,
      } as unknown as React.MouseEvent<Element>);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 480, y: 320 });

    const createButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add source')
    );
    expect(createButton).toBeDefined();

    await act(async () => {
      createButton?.click();
    });

    expect(props.onCreateAuthoringNode).toHaveBeenCalledWith(sourceKind, { x: 580, y: 280 });
  });

  it('opens a governed create-node menu from the viewport context surface', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    await renderViewport({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    const contextSurface = container.querySelector('[data-slot="canvas-viewport-context-surface"]');
    expect(contextSurface).toBeDefined();

    await act(async () => {
      contextSurface?.dispatchEvent(
        new MouseEvent('contextmenu', {
          clientX: 480,
          clientY: 320,
          button: 2,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 480, y: 320 });
    expect(getMenuText()).toContain('Add source');
  });

  it('opens the governed context menu even when React Flow already prevented the native menu', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    await renderViewport({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    const contextSurface = container.querySelector('[data-slot="canvas-viewport-context-surface"]');
    const event = new MouseEvent('contextmenu', {
      clientX: 480,
      clientY: 320,
      button: 2,
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();

    await act(async () => {
      contextSurface?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 480, y: 320 });
    expect(getMenuText()).toContain('Add source');
  });

  it('opens source import from the editable background context gesture when the rail is available', async () => {
    const sourceKind = buildTestNodeKind('dbt:source', 'Source');
    const props = await renderViewport({
      authoringNodeKinds: [sourceKind],
      canOpenSourceImport: true,
      onOpenSourceImport: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
    });

    await openPaneContextMenu();

    const sourceImportButton = findMenuButton('Add source');
    expect(sourceImportButton).toBeDefined();
    expect(container.querySelector('[data-slot="canvas-context-menu-add-group"]')).not.toBeNull();
    expect(getMenuText()).not.toContain('Crear nodo');
    expect(
      Array.from(container.querySelectorAll('button')).filter(
        (button) => button.textContent === 'Add source'
      )
    ).toHaveLength(1);

    await act(async () => {
      sourceImportButton?.click();
    });

    expect(props.onOpenSourceImport).toHaveBeenCalledWith({ x: 580, y: 280 });
    expect(props.onCreateAuthoringNode).not.toHaveBeenCalled();
  });

  it('keeps the background context menu open through a right-button document pointer event', async () => {
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      onCreateAuthoringNode: vi.fn(),
    });

    await openPaneContextMenu();
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
  });

  it('disambiguates source import from local source node creation in the background context menu', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = await renderViewport({
      authoringNodeKinds: [sourceKind],
      canOpenSourceImport: true,
      onOpenSourceImport: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
    });

    await openPaneContextMenu();

    const buttons = Array.from(container.querySelectorAll('button')).map((button) =>
      button.textContent?.trim()
    );
    expect(buttons).toContain('Add source');
    expect(buttons).toContain('Create source node');
    expect(buttons.filter((text) => text === 'Add source')).toHaveLength(1);

    await clickMenuItem('Create source node');

    expect(props.onCreateAuthoringNode).toHaveBeenCalledWith(sourceKind, { x: 580, y: 280 });
    expect(props.onOpenSourceImport).not.toHaveBeenCalled();
  });

  it('does not offer source import from the background when the source rail is unavailable', async () => {
    await renderViewport({
      canOpenSourceImport: false,
      onOpenSourceImport: vi.fn(),
    });

    await openPaneContextMenu();

    expect(
      Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'Add source'
      )
    ).toBe(false);
  });

  it('opens execution preview from the background context when graph editing is unavailable', async () => {
    const props = await renderViewport({
      canEditEdges: false,
      canPreviewExecutionPlan: true,
      onPreviewExecutionPlan: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
    });

    await openPaneContextMenu();
    await clickMenuItem('Preview execution plan');

    expect(props.onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
    expect(props.onCreateAuthoringNode).not.toHaveBeenCalled();
  });

  it('opens backed project and settings actions from the background context menu', async () => {
    const props = await renderViewport({
      canPreviewExecutionPlan: true,
      onPreviewExecutionPlan: vi.fn(),
      canOpenProjectExplorer: true,
      onOpenProjectExplorer: vi.fn(),
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: vi.fn(),
    });

    await openPaneContextMenu();
    await clickMenuItem('Explore project');
    expect(props.onOpenProjectExplorer).toHaveBeenCalledTimes(1);

    await openPaneContextMenu();
    await clickMenuItem('Canvas settings');
    expect(props.onOpenCanvasSettings).toHaveBeenCalledTimes(1);

    expect(props.onPreviewExecutionPlan).not.toHaveBeenCalled();
  });

  it('opens a governed remove-edge menu from the edge context gesture', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const preventDefault = vi.fn();
    const edge = props.edges[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault,
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);

    const removeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Eliminar conexión')
    );
    expect(removeButton).toBeDefined();

    await act(async () => {
      removeButton?.click();
    });

    expect(props.onEdgesChange).toHaveBeenCalledWith([
      {
        id: 'edge-source-model',
        type: 'remove',
      },
    ]);
  });

  it('dismisses the edge context menu when the user clicks the graph background', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const edge = props.edges[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault: vi.fn(),
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );
    });

    expect(getMenuText()).toContain('Eliminar conexión');

    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;

    await act(async () => {
      paneClick?.({ button: 0 } as React.MouseEvent<Element>);
    });

    expect(getMenuText()).not.toContain('Eliminar conexión');
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });

  it('dismisses the edge context menu when the user clicks outside the viewport', async () => {
    const props = await renderViewport({
      edges: [
        {
          id: 'edge-source-model',
          source: 'source',
          target: 'model',
        },
      ],
      onEdgesChange: vi.fn(),
    });

    const edgeContextMenu = xyflowState.lastReactFlowProps?.onEdgeContextMenu as
      | ((event: React.MouseEvent<Element>, edge: NonNullable<typeof props.edges>[number]) => void)
      | undefined;
    const edge = props.edges[0];
    if (edge == null) {
      throw new Error('EXPECTED_TEST_EDGE');
    }

    await act(async () => {
      edgeContextMenu?.(
        {
          preventDefault: vi.fn(),
          clientX: 600,
          clientY: 360,
        } as unknown as React.MouseEvent<Element>,
        edge
      );
    });

    expect(getMenuText()).toContain('Eliminar conexión');

    await act(async () => {
      document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });

    expect(getMenuText()).not.toContain('Eliminar conexión');
    expect(props.onEdgesChange).not.toHaveBeenCalled();
  });
});
