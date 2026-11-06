// @vitest-environment jsdom
/** Owned concern: background pan shares the Canvas policy without capturing local controls. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRelationalViewportPan } from './useRelationalViewportPan';

const panBy = vi.fn();
function Surface({ insideCard = false }: Readonly<{ insideCard?: boolean }>): JSX.Element {
  const viewport = useRelationalViewportPan(panBy);
  return (
    <div data-slot={insideCard ? 'canvas-relational-card' : undefined}>
      <div
        data-testid="surface"
        data-panning={viewport.panning}
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerCancel}
        onLostPointerCapture={viewport.onLostPointerCapture}
        onClickCapture={viewport.onClickCapture}
      >
        <button data-slot="canvas-relational-tree-node">Card</button>
        <div data-relational-card-id="output">
          <span>Output</span>
        </div>
        <input />
        <svg>
          <path role="button" tabIndex={0} aria-label="Disconnect" />
        </svg>
      </div>
    </div>
  );
}
describe('Relational viewport pan', () => {
  let container: HTMLDivElement;
  let root: Root;
  let surface: HTMLDivElement;
  const pointer = (type: string, x: number, button = 0, target: Element = surface): MouseEvent => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: x,
      button,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  };
  beforeEach(() => {
    panBy.mockClear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Surface />));
    surface = container.querySelector('[data-testid="surface"]')!;
    Object.assign(surface, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  it('pans empty background directly with the left button in both axes', () => {
    expect(pointer('pointerdown', 100).defaultPrevented).toBe(true);
    pointer('pointermove', 50);
    expect(panBy).toHaveBeenLastCalledWith(-50, -50);
    pointer('pointermove', 70);
    expect(panBy).toHaveBeenLastCalledWith(20, 20);
    expect(surface.dataset.panning).toBe('true');
    pointer('pointerup', 50);
    expect(surface.dataset.panning).toBe('false');
    expect(surface.releasePointerCapture).toHaveBeenCalledOnce();
  });
  it('does not bubble an admitted pan into an enclosing card or viewport', () => {
    const enclosingDrag = vi.fn();
    document.addEventListener('pointerdown', enclosingDrag);
    try {
      pointer('pointerdown', 100);
      pointer('pointermove', 80);
      pointer('pointerup', 80);
      expect(panBy).toHaveBeenCalledWith(-20, -20);
      expect(enclosingDrag).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('pointerdown', enclosingDrag);
    }
  });
  it('pans its own background when the viewport is nested inside a card', () => {
    act(() => root.render(<Surface insideCard />));
    expect(pointer('pointerdown', 100).defaultPrevented).toBe(true);
    pointer('pointermove', 60);
    pointer('pointerup', 60);
    expect(panBy).toHaveBeenCalledWith(-40, -40);
  });
  it.each(['button', 'input', 'path', '[data-relational-card-id] span'])(
    'leaves %s under its own interaction owner',
    (selector) => {
      expect(
        pointer('pointerdown', 100, 0, surface.querySelector(selector)!).defaultPrevented
      ).toBe(false);
      pointer('pointermove', 50);
      expect(panBy).not.toHaveBeenCalled();
      expect(surface.setPointerCapture).not.toHaveBeenCalled();
    }
  );
  it.each([1, 2])('does not introduce a pan mode for mouse button %s', (button) => {
    expect(pointer('pointerdown', 100, button).defaultPrevented).toBe(false);
    pointer('pointermove', 50, button);
    expect(panBy).not.toHaveBeenCalled();
    expect(surface.setPointerCapture).not.toHaveBeenCalled();
  });
  it.each(['pointercancel', 'lostpointercapture'])('releases left pan on %s', (ending) => {
    pointer('pointerdown', 100);
    pointer('pointermove', 50);
    expect(panBy).toHaveBeenCalledOnce();
    pointer(ending, 50);
    expect(surface.dataset.panning).toBe('false');
    pointer('pointermove', 0);
    expect(panBy).toHaveBeenCalledOnce();
  });
  it('keeps plain clicks and suppresses only the click following a drag', () => {
    const click = (): MouseEvent => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
      act(() => {
        surface.dispatchEvent(event);
      });
      return event;
    };
    pointer('pointerdown', 100);
    pointer('pointerup', 100);
    expect(click().defaultPrevented).toBe(false);
    pointer('pointerdown', 100);
    pointer('pointermove', 50);
    pointer('pointerup', 50);
    expect(click().defaultPrevented).toBe(true);
    expect(click().defaultPrevented).toBe(false);
  });
  it('does not swallow the next control activation if a drag produced no click', () => {
    pointer('pointerdown', 100);
    pointer('pointermove', 50);
    pointer('pointerup', 50);
    const input = surface.querySelector('input')!;
    input.addEventListener('pointerdown', (event) => event.stopPropagation());
    pointer('pointerdown', 50, 0, input);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
    act(() => {
      input.dispatchEvent(click);
    });
    expect(click.defaultPrevented).toBe(false);
  });
  it('preserves a keyboard activation after a drag produced no pointer click', () => {
    pointer('pointerdown', 100);
    pointer('pointermove', 50);
    pointer('pointerup', 50);
    const button = surface.querySelector('button')!;
    const activate = vi.fn();
    button.addEventListener('click', activate);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 });
    act(() => {
      button.dispatchEvent(click);
    });
    expect(click.defaultPrevented).toBe(false);
    expect(activate).toHaveBeenCalledOnce();
  });
});
