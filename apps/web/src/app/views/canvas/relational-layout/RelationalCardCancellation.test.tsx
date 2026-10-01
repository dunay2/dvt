// @vitest-environment jsdom
/** Owned concern: provisional card movement never becomes confirmed layout on cancellation. */
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeLayout } from '../CanvasRelationalTreeLayout';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import type { CardPosition } from '../canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import { RelationalLayoutSession, useRelationalLayout } from './RelationalLayoutSession';

const source: CanvasRelationalTreeNode = {
  locator: 'source',
  relationId: 'source',
  operator: 'read',
  substraitKind: 'read',
  displayName: 'Source',
  sourceRef: null,
  output: { fields: [] },
  expressionRefs: [],
  decorations: [],
  children: [],
};
const filtered: CanvasRelationalTreeNode = {
  ...source,
  locator: 'filter',
  relationId: 'filter',
  operator: 'filter',
  substraitKind: 'filter',
  children: [{ role: 'input', ordinal: 0, node: source }],
};

describe('Relational card cancellation boundary', () => {
  let container: HTMLDivElement;
  let root: Root;
  const publish = vi.fn();
  const initial = new Map<string, CardPosition>();
  let layoutState: ReturnType<typeof useRelationalLayout>;
  function ObserveLayout(): null {
    layoutState = useRelationalLayout();
    return null;
  }
  function Controlled({
    tree,
    viewKey,
  }: Readonly<{ tree: CanvasRelationalTreeNode; viewKey: string }>): JSX.Element {
    const [positions, setPositions] = useState<ReadonlyMap<string, CardPosition>>(initial);
    return (
      <RelationalLayoutSession
        initialPositions={positions}
        onPositionsChange={(next) => {
          publish(next);
          setPositions(next);
        }}
      >
        <ObserveLayout />
        <CanvasRelationalTreeLayout
          key={viewKey}
          root={tree}
          outputName="Model"
          selectedLocator="source"
          copy={resolveCanvasViewCopy('en')}
          onSelect={vi.fn()}
          zoom={0.5}
          onManualLayout={() => {
            layoutState.autoFit.current = false;
          }}
        />
      </RelationalLayoutSession>
    );
  }
  const render = (tree = source, viewKey = 'inspection'): void => {
    act(() => root.render(<Controlled tree={tree} viewKey={viewKey} />));
  };
  const held = (): HTMLElement => container.querySelector('[data-relational-card-id="source"]')!;
  const output = (): HTMLElement =>
    container.querySelector('[data-slot="canvas-relational-tree-output"]')!;
  const coordinates = (element: HTMLElement): number[] => [
    parseFloat(element.style.left),
    parseFloat(element.style.top),
  ];
  const pointer = (type: string, x = 140, pointerId = 1): void => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: 100, button: 0 });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    act(() => {
      held().dispatchEvent(event);
    });
  };
  const start = (): void => {
    Object.assign(held(), {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    });
    pointer('pointerdown', 100);
    pointer('pointermove', 120);
    pointer('pointermove', 140);
  };
  const cancel = (reason: string): void => {
    if (reason === 'Escape')
      act(() => {
        held().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      });
    else pointer(reason);
  };
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    publish.mockClear();
    initial.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each(['Escape', 'pointercancel', 'lostpointercapture'])(
    '%s does not anchor automatic cards before later graph reflow',
    (reason) => {
      render();
      const before = coordinates(held().parentElement!);
      const terminal = coordinates(output());
      start();
      expect(coordinates(held().parentElement!)).not.toEqual(before);
      expect(coordinates(output())).toEqual(terminal);
      expect(publish).not.toHaveBeenCalled();
      cancel(reason);
      expect(layoutState.positions).toEqual(initial);
      expect(layoutState.autoFit.current).toBe(true);
      expect(coordinates(held().parentElement!)).toEqual(before);
      expect(publish).not.toHaveBeenCalled();
      render(filtered, 'editing');
      expect(coordinates(output())[0]).toBeGreaterThan(terminal[0]!);
      expect(publish).not.toHaveBeenCalled();
    }
  );

  it.each(['Escape', 'pointercancel', 'lostpointercapture'])(
    '%s preserves exactly the existing manual map',
    (reason) => {
      initial.set('source', { x: 80, y: 160 });
      initial.set('temporarily-hidden-card', { x: 600, y: 300 });
      render();
      const terminal = coordinates(output());
      start();
      cancel(reason);
      expect(layoutState.positions).toEqual(initial);
      expect(publish).not.toHaveBeenCalled();
      expect(coordinates(held().parentElement!)).toEqual([80, 160]);
      render(filtered);
      expect(coordinates(output())[0]).toBeGreaterThan(terminal[0]!);
      expect(coordinates(held().parentElement!)).toEqual([80, 160]);
    }
  );

  it('publishes exactly once on release and ignores the subsequent lost-capture event', () => {
    render();
    start();
    expect(publish).not.toHaveBeenCalled();
    const position = coordinates(held().parentElement!);
    pointer('pointerup');
    expect(publish).toHaveBeenCalledTimes(1);
    pointer('lostpointercapture');
    expect(publish).toHaveBeenCalledTimes(1);
    render(source, 'editing');
    expect(coordinates(held().parentElement!)).toEqual(position);
  });

  it('cancels an abandoned view without retaining its provisional positions', () => {
    render();
    const before = coordinates(held().parentElement!);
    start();
    render(source, 'editing');
    expect(publish).not.toHaveBeenCalled();
    expect(coordinates(held().parentElement!)).toEqual(before);
  });

  it('does not let another pointer finish the drag', () => {
    render();
    start();
    pointer('pointercancel', 140, 2);
    expect(held().dataset.dragging).toBe('true');
    pointer('pointerup');
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('restores the scroll extent after an outward drag and preserves an earlier settled drag', () => {
    render();
    start();
    pointer('pointerup');
    const settled = layoutState.positions;
    const geometry = (): string | null =>
      container.querySelector('[data-slot="canvas-relational-tree-layout"]')!.getAttribute('style');
    const before = geometry();
    start();
    pointer('pointermove', 1800);
    pointer('pointermove', 1900);
    expect(geometry()).not.toBe(before);
    cancel('Escape');
    expect(layoutState.positions).toBe(settled);
    expect(layoutState.autoFit.current).toBe(false);
    expect(geometry()).toBe(before);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
