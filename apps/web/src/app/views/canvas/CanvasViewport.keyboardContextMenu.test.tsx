// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
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

describe('CanvasViewport keyboard context menu', () => {
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
  });

  function contextSurface(): HTMLDivElement {
    return container.querySelector<HTMLDivElement>(
      '[data-slot="canvas-viewport-context-surface"]'
    )!;
  }

  function menuItems(): HTMLButtonElement[] {
    return Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '[data-slot="canvas-context-menu"] [role="menuitem"]'
      )
    );
  }

  async function openFromKeyboard(key: 'ContextMenu' | 'F10' = 'F10'): Promise<void> {
    const surface = contextSurface();
    Object.defineProperty(surface, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 100,
        top: 80,
        width: 800,
        height: 600,
        right: 900,
        bottom: 680,
        x: 100,
        y: 80,
        toJSON: () => undefined,
      }),
    });

    surface.focus();
    await act(async () => {
      fireEvent.keyDown(surface, { key, shiftKey: key === 'F10' });
    });
  }

  it.each(['ContextMenu', 'F10'] as const)(
    'opens the governed menu with %s and focuses its first item',
    async (key) => {
      await renderViewport({
        authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      });

      const surface = contextSurface();
      expect(surface.tabIndex).toBe(0);
      expect(surface.getAttribute('aria-label')).toBe('Canvas graph background');

      await openFromKeyboard(key);

      expect(xyflowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 500, y: 380 });
      expect(menuItems()).not.toHaveLength(0);
      expect(document.activeElement).toBe(menuItems()[0]);
      expect(container.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
        'Canvas actions'
      );
    }
  );

  it('wraps arrow navigation and activates the focused item with Enter or Space', async () => {
    const onOpenCanvasSettings = vi.fn();
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      canOpenCanvasSettings: true,
      onOpenCanvasSettings,
    });
    await openFromKeyboard();

    const items = menuItems();
    const firstItem = items[0]!;
    const lastItem = items.at(-1)!;

    fireEvent.keyDown(firstItem, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(lastItem);
    fireEvent.keyDown(lastItem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(firstItem);
    fireEvent.keyDown(firstItem, { key: 'End' });
    expect(document.activeElement).toBe(lastItem);
    fireEvent.keyDown(lastItem, { key: 'Home' });
    expect(document.activeElement).toBe(firstItem);

    fireEvent.keyDown(firstItem, { key: 'End' });
    await act(async () => {
      expect(fireEvent.keyDown(lastItem, { key: 'Enter' })).toBe(false);
    });
    expect(onOpenCanvasSettings).toHaveBeenCalledTimes(1);

    await openFromKeyboard();
    const reopenedLastItem = menuItems().at(-1)!;
    reopenedLastItem.focus();
    await act(async () => {
      expect(fireEvent.keyDown(reopenedLastItem, { key: ' ' })).toBe(false);
    });
    expect(onOpenCanvasSettings).toHaveBeenCalledTimes(2);
  });

  it('focuses the first catalog item when Add changes the menu model', async () => {
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      canOpenSourceImport: true,
      onOpenSourceImport: vi.fn(),
    });
    await openFromKeyboard();

    await act(async () => {
      menuItems()[0]?.click();
    });

    expect(menuItems()[0]?.textContent).toContain('Add source');
    expect(document.activeElement).toBe(menuItems()[0]);
  });

  it('leaves descendant node context-menu keys to the node interaction surface', async () => {
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });
    const node = document.createElement('button');
    node.className = 'react-flow__node';
    contextSurface().appendChild(node);
    node.focus();

    const eventWasNotCancelled = fireEvent.keyDown(node, { key: 'F10', shiftKey: true });

    expect(eventWasNotCancelled).toBe(true);
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(document.activeElement).toBe(node);
  });

  it('restores the focused Canvas opener after Escape and outside-pointer close', async () => {
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });
    const surface = contextSurface();

    await openFromKeyboard();
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(document.activeElement).toBe(surface);

    await openFromKeyboard();
    await act(async () => {
      document.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 20,
          clientY: 20,
        })
      );
    });
    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(document.activeElement).toBe(surface);
  });

  it('does not restore the Canvas opener over a dialog-owned focus target', async () => {
    const dialogFocusTarget = document.createElement('button');
    document.body.appendChild(dialogFocusTarget);
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: () => dialogFocusTarget.focus(),
    });
    await openFromKeyboard();

    await act(async () => {
      menuItems()
        .find((item) => item.textContent?.includes('Canvas settings'))
        ?.click();
    });

    expect(container.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(document.activeElement).toBe(dialogFocusTarget);
    dialogFocusTarget.remove();
  });
});
