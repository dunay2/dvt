// @vitest-environment jsdom
/** Owned concern: prove local mouse navigation without relational editing side effects. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';

function ViewportHarness(): JSX.Element {
  const viewport = useCanvasRelationalTreeViewport('test-tree');
  return (
    <>
      <output>{viewport.zoom}</output>
      <div
        data-testid="viewport"
        ref={viewport.viewportRef}
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
      >
        <div data-testid="content" ref={viewport.contentRef} style={{ zoom: viewport.zoom }}>
          <button type="button">JOIN</button>
          <input aria-label="Value" />
        </div>
      </div>
    </>
  );
}

describe('relational-tree mouse navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let viewport: HTMLDivElement;
  let content: HTMLDivElement;
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
    act(() => target.dispatchEvent(event));
    return event;
  };
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1)
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<ViewportHarness />));
    viewport = container.querySelector('[data-testid="viewport"]')!;
    content = container.querySelector('[data-testid="content"]')!;
    vi.spyOn(content, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 20 - viewport.scrollLeft, top: 20 - viewport.scrollTop }) as DOMRect
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('zooms in and out with the wheel and cancels native scrolling', () => {
    expect(wheel(-120).defaultPrevented).toBe(true);
    expect(zoom()).toBeGreaterThan(1);
    wheel(120);
    expect(zoom()).toBeCloseTo(1, 1);
  });
  it('keeps the point under the cursor anchored when changing scale', () => {
    viewport.scrollLeft = 100;
    viewport.scrollTop = 50;
    wheel(-120);
    expect(zoom()).toBeGreaterThan(1);
    expect(viewport.scrollLeft).toBeCloseTo(100 + 280 * (zoom() - 1));
    expect(viewport.scrollTop).toBeCloseTo(50 + 150 * (zoom() - 1));
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
  it('pans with the middle button over a card without capturing right-click', () => {
    viewport.setPointerCapture = vi.fn();
    viewport.releasePointerCapture = vi.fn();
    viewport.scrollLeft = 200;
    viewport.scrollTop = 100;
    const event = (name: string, button: number, x: number, y: number): MouseEvent =>
      new MouseEvent(name, { button, clientX: x, clientY: y, bubbles: true, cancelable: true });
    const start = event('pointerdown', 1, 100, 100);
    act(() => content.querySelector('button')!.dispatchEvent(start));
    expect(start.defaultPrevented).toBe(true);
    act(() => viewport.dispatchEvent(event('pointermove', 1, 70, 60)));
    expect(viewport.scrollLeft).toBe(230);
    expect(viewport.scrollTop).toBe(140);
    act(() => viewport.dispatchEvent(event('pointerup', 1, 70, 60)));
    expect(viewport.releasePointerCapture).toHaveBeenCalledOnce();
    act(() => viewport.dispatchEvent(event('pointerdown', 2, 100, 100)));
    expect(viewport.setPointerCapture).toHaveBeenCalledOnce();
  });
});
