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
});
