// @vitest-environment jsdom

import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xyflow/react', () => import('./canvasViewportXyflowTestAdapter'));
vi.mock(
  '../../plugins/nodeTypeRegistry',
  () => import('./canvasViewportNodeTypeRegistryTestAdapter')
);

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
    const contextSurface = container.querySelector('[data-slot="canvas-viewport-context-surface"]');

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
  }

  function getMenuText(): string {
    return document.querySelector('[data-slot="canvas-context-menu"]')?.textContent ?? '';
  }

  it('opens a governed create-node menu from the background context gesture', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');
    const props = await renderViewport({
      authoringNodeKinds: [sourceKind],
      onCreateAuthoringNode: vi.fn(),
    });

    await openPaneContextMenu();

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

  it('keeps Add component out of the fixed Canvas chrome', async () => {
    await renderViewport();

    expect(container.querySelector('[data-slot="canvas-add-component-command"]')).toBeNull();
  });

  it('lets native card right-clicks reach the node-owned menu without synthetic events', async () => {
    await renderViewport();

    const contextSurface = container.querySelector('[data-slot="canvas-viewport-context-surface"]');
    const node = document.createElement('div');
    node.className = 'react-flow__node';
    const nodeShell = document.createElement('div');
    nodeShell.dataset.slot = 'canvas-node-shell';
    const nodeBody = document.createElement('div');
    const reachedNodeBody = vi.fn();
    nodeBody.addEventListener('contextmenu', reachedNodeBody);
    nodeShell.appendChild(nodeBody);
    node.appendChild(nodeShell);
    contextSurface?.appendChild(node);

    const nativeRightClick = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
    });
    await act(async () => {
      nodeBody.dispatchEvent(nativeRightClick);
    });
    expect(reachedNodeBody).toHaveBeenCalledOnce();
    expect(getMenuText()).toBe('');
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

  function findButton(label: string): HTMLElement | undefined {
    return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"], button')).find(
      (element) => element.textContent?.trim().startsWith(label) === true
    );
  }
});
