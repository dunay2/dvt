// @vitest-environment jsdom
/** Owned concern: keep pointer menu requests discardable and permission-scoped. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/dom';
import {
  CanvasRelationalOperationMenuProvider,
  useCanvasRelationalOperationMenu,
} from './CanvasRelationalOperationMenuContext';
import {
  RelationalLayoutSession,
  useRelationalLayout,
} from '../relational-layout/RelationalLayoutSession';
import { RelationalViewportSurface } from '../relational-layout/RelationalViewportSurface';
import { useCanvasRelationalTreeViewport } from '../useCanvasRelationalTreeViewport';
import { CanvasRelationalTreeOperationShelf } from '../CanvasRelationalTreeOperationShelf';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import { setupOperationMenuDom } from './operationMenu.test-support';

describe('Relational operation menu request', () => {
  setupOperationMenuDom();
  let root: Root;
  let host: HTMLDivElement;
  let controller: ReturnType<typeof useCanvasRelationalOperationMenu>;
  let layout: ReturnType<typeof useRelationalLayout>;
  const stage = vi.fn<() => string | null>(() => 'new-operation');
  function Consumer(): null {
    controller = useCanvasRelationalOperationMenu();
    return null;
  }
  function Graph(): JSX.Element {
    layout = useRelationalLayout();
    const viewport = useCanvasRelationalTreeViewport();
    return (
      <>
        <Consumer />
        <CanvasRelationalTreeOperationShelf
          copy={resolveCanvasViewCopy('en')}
          editable
          onStageOperation={stage}
        />
        <RelationalViewportSurface
          viewport={viewport}
          onDragOver={() => undefined}
          onDrop={() => undefined}
        >
          <div ref={viewport.contentRef} data-slot="test-model-content" />
        </RelationalViewportSurface>
      </>
    );
  }
  const renderGraph = (enabled = true): void => {
    act(() =>
      root.render(
        <RelationalLayoutSession>
          <CanvasRelationalOperationMenuProvider enabled={enabled} label="Model canvas">
            <Graph />
          </CanvasRelationalOperationMenuProvider>
        </RelationalLayoutSession>
      )
    );
  };
  const render = (enabled = true, owner = 'one'): void => {
    act(() =>
      root.render(
        <CanvasRelationalOperationMenuProvider key={owner} enabled={enabled} label="Model canvas">
          <Consumer />
        </CanvasRelationalOperationMenuProvider>
      )
    );
  };
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    stage.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });
  it('retains distinct screen and local coordinates without staging or persistence', () => {
    // Pan and zoom must not change the insertion point while the menu has focus.
    render();
    const opener = document.createElement('div');
    const request = {
      screenPosition: { x: 420, y: 240 },
      canvasPosition: { x: 95, y: 60 },
      opener,
    };
    act(() => controller!.openAt(request));
    expect(controller!.open).toBe(true);
    expect(controller!.request).toEqual(request);
    act(() => controller!.setOpen(false));
    expect(controller!.open).toBe(false);
    act(() => controller!.setOpen(true));
    expect(controller!.request).toBeNull();
  });
  it('rejects background requests when read-only or a pending form blocks staging', () => {
    render(false);
    act(() =>
      controller!.openAt({
        screenPosition: { x: 1, y: 2 },
        canvasPosition: { x: 3, y: 4 },
        opener: host,
      })
    );
    expect(controller!.open).toBe(false);
    expect(controller!.request).toBeNull();
  });
  it('discards requests when the Model owner is replaced', () => {
    render();
    act(() =>
      controller!.openAt({
        screenPosition: { x: 1, y: 2 },
        canvasPosition: { x: 3, y: 4 },
        opener: host,
      })
    );
    render(true, 'other');
    expect(controller!.open).toBe(false);
    expect(controller!.request).toBeNull();
  });
  it('invalidates an open request and stale callbacks across permission or pending-form ABA', () => {
    render();
    const staleOpen = controller!.openAt;
    const request = {
      screenPosition: { x: 1, y: 2 },
      canvasPosition: { x: 3, y: 4 },
      opener: host,
    };
    act(() => staleOpen(request));
    render(false);
    expect(controller!.open).toBe(false);
    expect(controller!.request).toBeNull();
    render(true);
    act(() => staleOpen(request));
    expect(controller!.open).toBe(false);
    expect(controller!.request).toBeNull();
    act(() => controller!.openAt(request));
    expect(controller!.open).toBe(true);
  });
  it('projects a panned, zoomed pointer once and places only the accepted staged identity', async () => {
    renderGraph();
    const viewport = host.querySelector<HTMLElement>('[data-canvas-viewport]')!;
    const content = host.querySelector<HTMLElement>('[data-slot="test-model-content"]')!;
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(new DOMRect(120, 80, 600, 400));
    act(() => {
      layout.autoFit.current = false;
      layout.setZoom(0.5);
    });
    await act(async () =>
      viewport.dispatchEvent(
        new MouseEvent('dblclick', {
          detail: 2,
          clientX: 340,
          clientY: 220,
          bubbles: true,
          cancelable: true,
        })
      )
    );
    expect(controller!.request).toMatchObject({
      screenPosition: { x: 340, y: 220 },
      canvasPosition: { x: 440, y: 280 },
    });
    expect(document.querySelectorAll('[cmdk-input]')).toHaveLength(1);
    expect(stage).not.toHaveBeenCalled();
    expect(layout.positions.size).toBe(0);
    await act(async () =>
      document.querySelector<HTMLElement>('[data-operation="aggregate"]')!.click()
    );
    expect(stage).toHaveBeenCalledExactlyOnceWith('aggregate');
    expect(layout.positions.get('new-operation')).toEqual({ x: 440, y: 280 });
    expect(controller!.open).toBe(false);
  });
  it('opens by keyboard at the viewport center and returns real focus on Escape', async () => {
    renderGraph();
    const viewport = host.querySelector<HTMLElement>('[data-canvas-viewport]')!;
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 80, 600, 400));
    await act(async () => {
      viewport.focus();
      viewport.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    expect(controller!.request?.screenPosition).toEqual({ x: 340, y: 280 });
    const input = document.querySelector<HTMLInputElement>('[cmdk-input]')!;
    expect(document.activeElement).toBe(input);
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(controller!.open).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(viewport));
    expect(stage).not.toHaveBeenCalled();
  });
  it('keeps the toolbar readable but its choices disabled while a pending form blocks staging', async () => {
    renderGraph(false);
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-slot="canvas-operation-menu-trigger"]')!.click()
    );
    const item = document.querySelector<HTMLElement>('[data-operation="aggregate"]')!;
    expect(item.getAttribute('aria-disabled')).toBe('true');
    await act(async () => item.click());
    expect(stage).not.toHaveBeenCalled();
  });
  it('does not publish a layout position if the existing stage command rejects', async () => {
    renderGraph();
    stage.mockReturnValueOnce(null);
    const viewport = host.querySelector<HTMLElement>('[data-canvas-viewport]')!;
    await act(async () =>
      viewport.dispatchEvent(
        new MouseEvent('dblclick', {
          detail: 2,
          clientX: 340,
          clientY: 220,
          bubbles: true,
          cancelable: true,
        })
      )
    );
    await act(async () =>
      document.querySelector<HTMLElement>('[data-operation="aggregate"]')!.click()
    );
    expect(stage).toHaveBeenCalledOnce();
    expect(layout.positions.size).toBe(0);
    expect(controller!.open).toBe(false);
  });
});
