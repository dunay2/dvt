// @vitest-environment jsdom
/**
 * Prove native Model entry across immediate inspector layout changes.
 * @baseline ADR-0069: scoped gesture admission delegates existing callbacks.
 * @decision Replay the observed target sequence and preserve excluded origins.
 * @consequence Retargeting cannot lose entry or activate an unrelated inspector field.
 */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCanvasNativeNodeEntry } from './useCanvasNativeNodeEntry';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
type Options = {
  canvasId?: string;
  present?: boolean;
  hidden?: boolean;
  source?: boolean;
  consumeClick?: boolean;
};
function Host({
  open,
  fieldClick,
  canvasId = 'canvas',
  present = true,
  hidden = false,
  source = false,
  consumeClick = false,
}: Options & { open: (id: string) => void; fieldClick: () => void }): JSX.Element {
  const [shown, setShown] = useState(false);
  const capture = useCanvasNativeNodeEntry(canvasId, open);
  return (
    <div data-testid="boundary" {...capture}>
      {present ? (
        <div hidden={hidden} className="react-flow__node" data-id="model">
          <div
            data-slot="canvas-node-shell"
            data-canvas-node-activation={source ? 'inspect' : 'open'}
          >
            <span
              data-testid="card"
              onClick={(event) => {
                if (consumeClick) {
                  event.preventDefault();
                  event.stopPropagation();
                }
                setShown(true);
              }}
              onDoubleClick={() => open('model')}
            >
              Model
            </span>
            <button data-canvas-node-control="" onClick={() => setShown(true)}>
              Control
            </button>
          </div>
        </div>
      ) : null}
      {shown ? (
        <aside data-slot="canvas-node-workbench-overlay">
          <label onClick={fieldClick}>
            Field
            <input />
          </label>
        </aside>
      ) : null}
    </div>
  );
}
function render(open: (id: string) => void, fieldClick: () => void, options: Options = {}): void {
  act(() => root.render(<Host open={open} fieldClick={fieldClick} {...options} />));
}
function begin(): Element {
  const card = container.querySelector('[data-testid="card"]')!;
  act(() => {
    fireEvent.mouseDown(card, { detail: 1 });
    fireEvent.click(card, { detail: 1 });
  });
  return card;
}
function finish(target: Element): void {
  act(() => {
    fireEvent.mouseDown(target, { detail: 2 });
    fireEvent.click(target, { detail: 2 });
    fireEvent.doubleClick(target, { detail: 2 });
  });
}

it('uses native detail=2 to open the first card once and suppress accidental inspector field activation', () => {
  const open = vi.fn(),
    fieldClick = vi.fn();
  render(open, fieldClick);
  begin();
  expect(container.querySelector('aside')).not.toBeNull();
  expect(open).not.toHaveBeenCalled();
  finish(container.querySelector('label')!);
  expect(open).toHaveBeenCalledExactlyOnceWith('model');
  expect(fieldClick).not.toHaveBeenCalled();
});

it('leaves an ordinary same-card native double click to its existing node handler', () => {
  const open = vi.fn();
  render(open, vi.fn());
  const card = begin();
  finish(card);
  expect(open).toHaveBeenCalledExactlyOnceWith('model');
});

it('retains the card second press when layout retargets the later click and double click', () => {
  const open = vi.fn(),
    fieldClick = vi.fn();
  render(open, fieldClick);
  const card = begin();
  act(() => {
    fireEvent.mouseDown(card, { detail: 2 });
    fireEvent.click(container.querySelector('[data-testid="boundary"]')!, { detail: 2 });
    fireEvent.doubleClick(container.querySelector('label')!, { detail: 2 });
  });
  expect(open).toHaveBeenCalledExactlyOnceWith('model');
  expect(fieldClick).not.toHaveBeenCalled();
});

it('respects a native double click cancelled by an outer boundary', () => {
  const open = vi.fn();
  render(open, vi.fn());
  begin();
  document.addEventListener('dblclick', (event) => event.preventDefault(), {
    capture: true,
    once: true,
  });
  finish(container.querySelector('label')!);
  expect(open).not.toHaveBeenCalled();
});

it.each([
  'canvas-change',
  'removed',
  'hidden',
  'keyboard',
  'context-menu',
  'drag',
  'consumed-click',
  'new-inspector-intent',
  'embedded-control',
  'unrelated-second-press',
  'second-control',
  'source',
] as const)('never redirects an excluded %s owner', async (reason) => {
  const open = vi.fn(),
    fieldClick = vi.fn();
  render(open, fieldClick, {
    source: reason === 'source',
    consumeClick: reason === 'consumed-click',
  });
  if (reason === 'embedded-control')
    act(() => {
      const control = container.querySelector('button')!;
      fireEvent.mouseDown(control, { detail: 1 });
      fireEvent.click(control, { detail: 1 });
    });
  else begin();
  const boundary = container.querySelector('[data-testid="boundary"]')!;
  if (reason === 'unrelated-second-press')
    await act(() => fireEvent.mouseDown(boundary, { detail: 2 }));
  if (reason === 'second-control')
    await act(() => fireEvent.mouseDown(container.querySelector('button')!, { detail: 2 }));
  if (reason === 'canvas-change') render(open, fieldClick, { canvasId: 'other' });
  if (reason === 'removed') render(open, fieldClick, { present: false });
  if (reason === 'hidden') render(open, fieldClick, { hidden: true });
  if (reason === 'keyboard') await act(() => fireEvent.keyDown(boundary, { key: 'Escape' }));
  if (reason === 'context-menu') await act(() => fireEvent.contextMenu(boundary));
  if (reason === 'drag') await act(() => fireEvent.dragStart(boundary));
  if (reason === 'new-inspector-intent')
    await act(() => fireEvent.mouseDown(container.querySelector('label')!, { detail: 1 }));
  finish(container.querySelector('label')!);
  expect(open).not.toHaveBeenCalled();
});
