// @vitest-environment jsdom
/** Owned concern: primary canvas panning requires the visible hand mode. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRelationalViewportPan } from './useRelationalViewportPan';

function Surface(): JSX.Element {
  const { panning, panMode, togglePanMode, ...handlers } = useRelationalViewportPan();
  return (
    <>
      <button onClick={togglePanMode} aria-pressed={panMode}>
        Hand
      </button>
      <div data-testid="surface" data-panning={panning} {...handlers}>
        <button data-slot="canvas-relational-tree-node">Card</button>
        <input />
      </div>
    </>
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
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Surface />));
    surface = container.querySelector('[data-testid="surface"]')!;
    Object.assign(surface, {
      scrollLeft: 100,
      scrollTop: 100,
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  it('leaves the background inert in selection mode', () => {
    expect(pointer('pointerdown', 100).defaultPrevented).toBe(false);
    pointer('pointermove', 50);
    expect(surface.scrollLeft).toBe(100);
    expect(surface.setPointerCapture).not.toHaveBeenCalled();
  });
  it('pans over cards in hand mode, but leaves form controls alone', () => {
    act(() => container.querySelector('button')!.click());
    expect(pointer('pointerdown', 100, 0, surface.querySelector('input')!).defaultPrevented).toBe(
      false
    );
    pointer('pointerdown', 100, 0, surface.querySelector('button')!);
    pointer('pointermove', 50);
    expect(surface.scrollLeft).toBe(150);
    expect(surface.dataset.panning).toBe('true');
    pointer('pointerup', 50);
    expect(surface.dataset.panning).toBe('false');
  });
  it.each(['pointercancel', 'lostpointercapture'])(
    'retains middle pan and releases on %s',
    (ending) => {
      pointer('pointerdown', 100, 1);
      pointer('pointermove', 50, 1);
      expect(surface.scrollLeft).toBe(150);
      pointer(ending, 50, 1);
      expect(surface.dataset.panning).toBe('false');
      pointer('pointermove', 0, 1);
      expect(surface.scrollLeft).toBe(150);
    }
  );
});
