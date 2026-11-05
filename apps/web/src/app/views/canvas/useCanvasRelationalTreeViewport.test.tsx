// @vitest-environment jsdom
/** Owned concern: prove local mouse navigation without relational editing side effects. */
import { act } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';
import {
  RelationalLayoutSession,
  useRelationalLayout,
} from './relational-layout/RelationalLayoutSession';
import type { CanvasRelationalTreeLayout } from './canvasRelationalTreeGeometry';
import { canvasViewportScopeProps } from './canvasViewportInteraction';

function ViewportHarness({
  semanticRevision = 'initial',
  bounds,
}: Readonly<{
  semanticRevision?: string;
  bounds?: Pick<CanvasRelationalTreeLayout, 'origin' | 'width' | 'height'>;
}>): JSX.Element {
  const layout = useRelationalLayout();
  if (bounds != null) layout.contentSize.current = bounds;
  const viewport = useCanvasRelationalTreeViewport();
  return (
    <>
      <output>{viewport.zoom}</output>
      <button data-testid="fit" type="button" onClick={viewport.fit}>
        Fit
      </button>
      <div
        {...canvasViewportScopeProps}
        data-testid="viewport"
        data-semantic-revision={semanticRevision}
        ref={viewport.viewportRef}
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onFocusCapture={viewport.onFocusCapture}
      >
        <div data-testid="content" ref={viewport.contentRef} style={{ zoom: viewport.zoom }}>
          <button type="button">JOIN</button>
          <input aria-label="Value" />
        </div>
        {createPortal(
          <div role="menuitem" tabIndex={0}>
            Open operation
          </div>,
          document.body
        )}
      </div>
    </>
  );
}

describe('relational-tree mouse navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let viewport: HTMLDivElement;
  let content: HTMLDivElement;
  let resize: () => void;
  let frames: FrameRequestCallback[];
  const zoom = (): number => Number(container.querySelector('output')!.textContent);
  const wheel = (
    deltaY: number,
    options: WheelEventInit = {},
    target: Element = viewport
  ): WheelEvent => {
    const event = new WheelEvent('wheel', {
      deltaY,
      clientX: 200,
      clientY: 120,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  };
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    frames = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = () => callback([], this as unknown as ResizeObserver);
        }
        observe(): void {}
        disconnect(): void {}
      }
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <RelationalLayoutSession>
          <ViewportHarness />
        </RelationalLayoutSession>
      )
    );
    viewport = container.querySelector('[data-testid="viewport"]')!;
    content = container.querySelector('[data-testid="content"]')!;
    vi.spyOn(content, 'getBoundingClientRect').mockImplementation(() => {
      const [x, y] = content.style.translate.split(' ').map(Number.parseFloat);
      return { left: 20 + (x || 0) * zoom(), top: 20 + (y || 0) * zoom() } as DOMRect;
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fits negative world bounds through the same camera without native scrolling', () => {
    const bounds = { origin: { x: -400, y: -200 }, width: 1000, height: 600 };
    act(() =>
      root.render(
        <RelationalLayoutSession>
          <ViewportHarness bounds={bounds} />
        </RelationalLayoutSession>
      )
    );
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 400 },
    });
    Object.defineProperties(content, {
      offsetWidth: { value: 1000 },
      offsetHeight: { value: 600 },
    });
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="fit"]')!.click());
    act(() => {
      while (frames.length > 0) frames.shift()!(0);
    });
    const [tx, ty] = content.style.translate.split(' ').map(Number.parseFloat);
    const left = (bounds.origin.x + tx!) * zoom();
    const top = (bounds.origin.y + ty!) * zoom();
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + bounds.width * zoom()).toBeLessThanOrEqual(800);
    expect(top + bounds.height * zoom()).toBeLessThanOrEqual(400);
    expect([viewport.scrollLeft, viewport.scrollTop]).toEqual([0, 0]);
  });

  it('zooms in and out with the wheel and cancels native scrolling', () => {
    expect(wheel(-120).defaultPrevented).toBe(true);
    expect(zoom()).toBeGreaterThan(1);
    wheel(120);
    expect(zoom()).toBeCloseTo(1, 1);
  });
  it('keeps the point under the cursor anchored when changing scale', () => {
    wheel(-120);
    expect(zoom()).toBeGreaterThan(1);
    const bounds = content.getBoundingClientRect();
    expect(bounds.left + 180 * zoom()).toBeCloseTo(200);
    expect(bounds.top + 100 * zoom()).toBeCloseTo(120);
  });
  it('does not overwrite a wheel gesture with a queued initial fit', () => {
    wheel(-120);
    const manual = zoom();
    act(() => {
      frames[0]!(0);
    });
    expect(zoom()).toBe(manual);
  });
  it('normalizes line/page deltas, permits wheel over a card and respects limits', () => {
    wheel(-3, { deltaMode: 1 }, content.querySelector('button')!);
    expect(zoom()).toBeGreaterThan(1);
    wheel(-10000, { deltaMode: 2 });
    expect(zoom()).toBe(2);
    wheel(10000);
    expect(zoom()).toBe(0.35);
  });
  it('ignores form controls, horizontal-only wheel and events outside the viewport', () => {
    expect(wheel(-120, {}, content.querySelector('input')!).defaultPrevented).toBe(false);
    expect(wheel(0, { deltaX: 120 }).defaultPrevented).toBe(false);
    expect(wheel(-120, {}, container).defaultPrevented).toBe(false);
    expect(zoom()).toBe(1);
  });
  it('removes its native wheel listener when the viewport unmounts', () => {
    act(() => root.render(null));
    expect(wheel(-120).defaultPrevented).toBe(false);
  });
  it('leaves nested or already handled wheel input under its own owner', () => {
    const nested = document.createElement('div');
    nested.setAttribute('data-canvas-viewport', '');
    content.append(nested);
    expect(wheel(-120, {}, nested).defaultPrevented).toBe(false);
    const event = new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => {
      viewport.dispatchEvent(event);
    });
    expect(zoom()).toBe(1);
  });
  it('reveals keyboard focus through the camera while leaving native scroll at zero', () => {
    const button = content.querySelector('button')!;
    vi.spyOn(button, 'matches').mockReturnValue(true);
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
    } as DOMRect);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 250,
      top: 150,
      right: 300,
      bottom: 175,
      width: 50,
      height: 25,
    } as DOMRect);
    act(() => {
      button.focus();
    });
    act(() => {
      while (frames.length > 0) frames.shift()!(0);
    });
    expect(content.style.translate).toBe('-100px -75px');
    expect([viewport.scrollLeft, viewport.scrollTop]).toEqual([0, 0]);
  });
  it('keeps camera position when a portalled menu receives keyboard focus', () => {
    const menu = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    vi.spyOn(menu, 'matches').mockReturnValue(true);
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
    } as DOMRect);
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({
      left: 250,
      top: 150,
      right: 300,
      bottom: 175,
      width: 50,
      height: 25,
    } as DOMRect);
    const before = content.style.translate;
    act(() => {
      menu.focus();
    });
    act(() => {
      while (frames.length > 0) frames.shift()!(0);
    });
    expect(document.activeElement).toBe(menu);
    expect(content.style.translate).toBe(before);
  });
  it('restores the same camera and zoom when inspection remounts inside its layout session', () => {
    wheel(-120);
    const beforeCamera = content.style.translate;
    const beforeZoom = zoom();
    act(() => root.render(<RelationalLayoutSession>{null}</RelationalLayoutSession>));
    act(() =>
      root.render(
        <RelationalLayoutSession>
          <ViewportHarness />
        </RelationalLayoutSession>
      )
    );
    expect(zoom()).toBe(beforeZoom);
    expect(container.querySelector<HTMLElement>('[data-testid="content"]')!.style.translate).toBe(
      beforeCamera
    );
  });
  it('preserves manual zoom on panel resizing and restores complete framing on Fit', () => {
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 400 },
    });
    Object.defineProperties(content, {
      offsetWidth: { value: 8000 },
      offsetHeight: { value: 4000 },
    });
    const fit = container.querySelector<HTMLButtonElement>('[data-testid="fit"]')!;
    act(() => {
      fit.click();
    });
    expect(zoom()).toBeCloseTo(0.084);
    wheel(-120);
    const enlarged = zoom();
    expect(enlarged).toBeGreaterThan(0.084);
    expect(enlarged).toBeLessThan(0.35);
    act(() => {
      resize();
    });
    expect(zoom()).toBe(enlarged);
    wheel(120);
    expect(zoom()).toBeCloseTo(0.084);
    wheel(-120);
    act(() => {
      fit.click();
    });
    expect(zoom()).toBeCloseTo(0.084);
  });
  it('keeps camera and zoom when only semantic identity changes', () => {
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 400 },
    });
    Object.defineProperties(content, {
      offsetWidth: { value: 1600 },
      offsetHeight: { value: 800 },
    });
    act(() => {
      while (frames.length > 0) frames.shift()!(0);
    });
    wheel(-120);
    const beforeCamera = content.style.translate;
    const beforeZoom = zoom();

    act(() =>
      root.render(
        <RelationalLayoutSession>
          <ViewportHarness semanticRevision="new-semantic-digest" />
        </RelationalLayoutSession>
      )
    );
    act(() => {
      while (frames.length > 0) frames.shift()!(0);
    });

    expect(zoom()).toBe(beforeZoom);
    expect(content.style.translate).toBe(beforeCamera);
  });
  it('moves fitting content in both axes without relying on native scroll or capturing alternate buttons', () => {
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();
    viewport.hasPointerCapture = () => true;
    // A fitting viewport cannot scroll: this reproduces the reported 72% case.
    Object.defineProperties(viewport, {
      scrollLeft: { get: () => 0, set: () => {} },
      scrollTop: { get: () => 0, set: () => {} },
    });
    const event = (name: string, button: number, x: number, y: number): MouseEvent =>
      new MouseEvent(name, { button, clientX: x, clientY: y, bubbles: true, cancelable: true });
    const start = event('pointerdown', 0, 100, 100);
    act(() => {
      viewport.dispatchEvent(start);
    });
    expect(start.defaultPrevented).toBe(true);
    act(() => {
      viewport.dispatchEvent(event('pointermove', 0, 70, 60));
    });
    expect(content.style.translate).toBe('-30px -40px');
    act(() => {
      viewport.dispatchEvent(event('pointermove', 0, 120, 130));
    });
    expect(content.style.translate).toBe('20px 30px');
    expect([viewport.scrollLeft, viewport.scrollTop]).toEqual([0, 0]);
    act(() => {
      viewport.dispatchEvent(event('pointerup', 0, 70, 60));
    });
    expect(viewport.releasePointerCapture).toHaveBeenCalledOnce();
    act(() => {
      viewport.dispatchEvent(event('pointerdown', 1, 100, 100));
      viewport.dispatchEvent(event('pointerdown', 2, 100, 100));
    });
    expect(viewport.setPointerCapture).toHaveBeenCalledOnce();
  });
  it('does not cancel or capture pointer activation from a portalled application menu', () => {
    viewport.setPointerCapture = vi.fn();
    const event = new MouseEvent('pointerdown', { button: 0, bubbles: true, cancelable: true });
    act(() => {
      document.querySelector('[role="menuitem"]')!.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
    expect(viewport.setPointerCapture).not.toHaveBeenCalled();
  });
});
