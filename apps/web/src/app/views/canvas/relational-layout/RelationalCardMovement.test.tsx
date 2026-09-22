// @vitest-environment jsdom
/** Owned concern: moving cards changes presentation, never semantic selection or order. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeLayout } from '../CanvasRelationalTreeLayout';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import type { CardPosition } from '../canvasRelationalTreeGeometry';
import { RelationalLayoutSession } from './RelationalLayoutSession';

const read = (id: string): CanvasRelationalTreeNode => ({
  locator: id,
  relationId: id,
  operator: 'read',
  substraitKind: 'read',
  displayName: id,
  sourceRef: null,
  output: { fields: [] },
  expressionRefs: [],
  decorations: [],
  children: [],
});
const tree: CanvasRelationalTreeNode = {
  ...read('join'),
  operator: 'join',
  operation: 'left_join',
  children: [
    { role: 'left', ordinal: 0, node: read('employee') },
    { role: 'right', ordinal: 1, node: read('manager') },
  ],
};

describe('Relational card movement', () => {
  let container: HTMLDivElement;
  let root: Root;
  const select = vi.fn();
  const expand = vi.fn();
  const manual = vi.fn();
  const render = (viewKey = 'inspection'): void =>
    act(() =>
      root.render(
        <RelationalLayoutSession>
          <CanvasRelationalTreeLayout
            key={viewKey}
            root={tree}
            outputName="Model"
            selectedLocator="join"
            copy={resolveCanvasViewCopy('en')}
            zoom={0.5}
            onSelect={select}
            onExpand={expand}
            onManualLayout={manual}
          />
        </RelationalLayoutSession>
      )
    );
  const card = (): HTMLButtonElement =>
    container.querySelector<HTMLButtonElement>('[data-relation-id="employee"]')!;
  const position = (): CardPosition => ({
    x: parseFloat(card().parentElement!.style.left),
    y: parseFloat(card().parentElement!.style.top),
  });
  const pointer = (type: string, x: number, y: number): void => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    act(() => {
      card().dispatchEvent(event);
    });
  };
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    render();
    Object.assign(card(), {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('moves at the displayed zoom, updates ports, preserves tree and suppresses the drag click', () => {
    const before = position();
    const document = JSON.stringify(tree);
    const paths = (): Array<string | null> =>
      [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));
    const edges = paths();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 130, 120);
    pointer('pointerup', 130, 120);
    act(() => {
      card().click();
    });
    expect(position()).toEqual({ x: before.x + 60, y: before.y + 40 });
    expect(paths()).not.toEqual(edges);
    expect(JSON.stringify(tree)).toBe(document);
    expect(select).not.toHaveBeenCalled();
    expect(expand).not.toHaveBeenCalled();
    expect(manual).toHaveBeenCalled();
    render('editing');
    expect(position()).toEqual({ x: before.x + 60, y: before.y + 40 });
  });

  it('restores the position on pointer cancellation', () => {
    const before = position();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 120, 120);
    pointer('pointercancel', 120, 120);
    expect(position()).toEqual(before);
  });

  it('restores the origin on Escape and still allows keyboard activation', () => {
    const before = position();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 120, 120);
    act(() => {
      card().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });
    expect(position()).toEqual(before);
    act(() => {
      card().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      card().click();
    });
    expect(select).toHaveBeenCalledExactlyOnceWith('employee');
  });

  it('cancels lost capture and never moves a card outside the drawable area', () => {
    const before = position();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', -1000, -1000);
    expect(position()).toEqual({ x: 0, y: 0 });
    pointer('lostpointercapture', -1000, -1000);
    expect(position()).toEqual(before);
  });

  it('keeps a simple click and supports keyboard movement without semantic edits', () => {
    pointer('pointerdown', 100, 100);
    pointer('pointerup', 101, 101);
    act(() => {
      card().click();
    });
    expect(select).toHaveBeenCalledExactlyOnceWith('employee');
    select.mockClear();
    const before = position();
    act(() => {
      card().dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, altKey: true, key: 'ArrowRight' })
      );
    });
    expect(position()).toEqual({ x: before.x + 10, y: before.y });
    expect(select).not.toHaveBeenCalled();
  });
});
