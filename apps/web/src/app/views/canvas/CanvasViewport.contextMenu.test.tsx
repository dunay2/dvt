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

    const addCatalogButton = findButton('Add...');
    expect(addCatalogButton).toBeDefined();

    await act(async () => {
      addCatalogButton?.click();
    });

    const createButton = findButton('Add source');
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
    expect(getMenuText()).toContain('Add...');
    expect(getMenuText()).not.toContain('Add source');
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
    expect(getMenuText()).toContain('Add...');
    expect(getMenuText()).not.toContain('Add source');
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

  it('keeps the Add catalog flow clickable after the browser context-menu echo sequence', async () => {
    const onOpenSourceImport = vi.fn();
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    await renderViewport({
      authoringNodeKinds: [sourceKind],
      canOpenSourceImport: true,
      onOpenSourceImport,
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
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 720,
          clientY: 220,
        })
      );
    });

    const paneClick = xyflowState.lastReactFlowProps?.onPaneClick as
      | ((event: React.MouseEvent<Element>) => void)
      | undefined;
    await act(async () => {
      paneClick?.({
        button: 0,
        clientX: 720,
        clientY: 220,
      } as unknown as React.MouseEvent<Element>);
    });

    const addCatalogButton = findButton('Add...');
    expect(addCatalogButton).toBeDefined();

    await act(async () => {
      addCatalogButton?.click();
    });

    const addSourceButton = findButton('Add source');
    expect(addSourceButton).toBeDefined();

    await act(async () => {
      addSourceButton?.click();
    });

    expect(onOpenSourceImport).toHaveBeenCalledWith({ x: 580, y: 280 });
  });

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim().startsWith(label) === true
    );
  }
});
