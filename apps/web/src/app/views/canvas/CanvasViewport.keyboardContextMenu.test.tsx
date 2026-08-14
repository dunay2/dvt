// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
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

  function menuItems(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="canvas-context-menu"] [role="menuitem"]')
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
      expect(document.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
        'Canvas actions'
      );
    }
  );

  it('navigates with the shared menu keys and activates items with Enter or Space', async () => {
    const onOpenCanvasSettings = vi.fn();
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      canOpenCanvasSettings: true,
      onOpenCanvasSettings,
    });
    await openFromKeyboard();

    const items = menuItems();
    const firstItem = items[0]!;
    const secondItem = items[1]!;
    const lastItem = items.at(-1)!;

    await act(async () => {
      fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    });
    await waitFor(() => expect(document.activeElement).toBe(secondItem));
    await act(async () => {
      fireEvent.keyDown(secondItem, { key: 'ArrowUp' });
    });
    await waitFor(() => expect(document.activeElement).toBe(firstItem));
    await act(async () => {
      fireEvent.keyDown(firstItem, { key: 'End' });
    });
    await waitFor(() => expect(document.activeElement).toBe(lastItem));
    await act(async () => {
      fireEvent.keyDown(lastItem, { key: 'Home' });
    });
    await waitFor(() => expect(document.activeElement).toBe(firstItem));

    await act(async () => {
      fireEvent.keyDown(firstItem, { key: 'End' });
    });
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

  it('opens the catalog as a dialog and focuses its search field', async () => {
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      canOpenSourceImport: true,
      onOpenSourceImport: vi.fn(),
    });
    await openFromKeyboard();

    await act(async () => {
      menuItems()[0]?.click();
    });

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const search = dialog?.querySelector<HTMLInputElement>('input[type="search"]');

    expect(dialog?.textContent).toContain('Add component');
    expect(dialog?.querySelector('[role="menu"]')).toBeNull();
    expect(dialog?.querySelector('[role="menuitem"]')).toBeNull();
    expect(search).not.toBeNull();
    expect(document.activeElement).toBe(search);
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
    expect(document.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
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
    expect(document.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
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
    expect(document.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(document.activeElement).toBe(surface);
  });

  it('does not restore the Canvas opener over a dialog-owned focus target', async () => {
    const dialogFocusTarget = document.createElement('button');
    document.body.appendChild(dialogFocusTarget);
    const focusDialog = vi.spyOn(dialogFocusTarget, 'focus');
    await renderViewport({
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      canOpenCanvasSettings: true,
      onOpenCanvasSettings: () => dialogFocusTarget.focus(),
    });
    await openFromKeyboard();

    await act(async () => {
      menuItems()
        .find((item) => item.textContent?.includes('Canvas properties'))
        ?.click();
    });

    expect(document.querySelector('[data-slot="canvas-context-menu"]')).toBeNull();
    expect(focusDialog).toHaveBeenCalledOnce();
    expect(document.activeElement).not.toBe(contextSurface());
    dialogFocusTarget.remove();
  });
});
