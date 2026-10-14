// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import { act } from 'react';
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

  async function openFromPointer(target: Element): Promise<MouseEvent> {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 320,
      clientY: 260,
    });
    await act(async () => {
      target.dispatchEvent(event);
    });
    return event;
  }

  it.each(['viewport', 'overlay'] as const)(
    'opens and cancels native context from the full %s boundary, including after close',
    async (targetKind) => {
      const onNodesChange = vi.fn();
      const onEdgesChange = vi.fn();
      await renderViewport({
        authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
        onNodesChange,
        onEdgesChange,
      });
      const viewport = container.querySelector<HTMLElement>('[data-testid="canvas-viewport"]')!;
      const target = targetKind === 'viewport' ? viewport : document.createElement('div');
      if (target !== viewport) viewport.append(target);
      expect(menuItems()).toHaveLength(0);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const event = await openFromPointer(target);
        expect(event.defaultPrevented).toBe(true);
        expect(menuItems()).not.toHaveLength(0);
        expect(document.querySelectorAll('[data-slot="canvas-context-menu"]')).toHaveLength(1);
        await act(async () => {
          fireEvent.keyDown(document, { key: 'Escape' });
        });
        expect(menuItems()).toHaveLength(0);
      }
      expect(xyflowState.screenToFlowPosition).toHaveBeenCalledTimes(2);
      expect(onNodesChange).not.toHaveBeenCalled();
      expect(onEdgesChange).not.toHaveBeenCalled();
    }
  );

  it('cancels the native menu on the real filter control without opening background actions', async () => {
    await renderViewport({ authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')] });
    const filter = container.querySelector<HTMLButtonElement>('button[aria-label="Filter graph"]')!;
    expect(filter).not.toBeNull();
    const event = await openFromPointer(filter);
    expect(event.defaultPrevented).toBe(true);
    expect(menuItems()).toHaveLength(0);
    expect(xyflowState.screenToFlowPosition).not.toHaveBeenCalled();
  });

  it.each([
    ['input', 'input', null, null],
    ['textarea', 'textarea', null, null],
    ['editable', 'div', 'contenteditable', 'true'],
    ['search', 'section', 'data-slot', 'canvas-graph-search-control'],
    ['filter', 'section', 'data-slot', 'canvas-graph-filter-control'],
    ['health', 'aside', 'data-slot', 'graph-node-health-popover'],
    ['menu', 'div', 'role', 'menu'],
    ['dialog', 'div', 'role', 'dialog'],
  ] as const)(
    'does not treat a %s overlay as graph background',
    async (_, tag, attribute, value) => {
      await renderViewport({ authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')] });
      const target = document.createElement(tag);
      if (attribute != null) target.setAttribute(attribute, value!);
      container.querySelector('[data-testid="canvas-viewport"]')!.append(target);
      const event = await openFromPointer(target);
      expect(event.defaultPrevented).toBe(true);
      expect(menuItems()).toHaveLength(0);
      expect(xyflowState.screenToFlowPosition).not.toHaveBeenCalled();
    }
  );

  it('opens inspect-only background actions without mutation in read-only posture', async () => {
    const onNodesChange = vi.fn();
    const onEdgesChange = vi.fn();
    await renderViewport({
      canEditEdges: false,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
      onNodesChange,
      onEdgesChange,
    });
    const event = await openFromPointer(
      container.querySelector('[data-testid="canvas-viewport"]')!
    );
    expect(event.defaultPrevented).toBe(true);
    expect(menuItems().map((item) => item.textContent)).toEqual(['Canvas properties']);
    expect(onNodesChange).not.toHaveBeenCalled();
    expect(onEdgesChange).not.toHaveBeenCalled();
  });

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
