// @vitest-environment jsdom
/** Owned concern: local disclosure and scale must not share a geometry authority. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeLayout } from '../CanvasRelationalTreeLayout';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import {
  projectExpressionStage,
  withScalarOutput,
} from '../canvasRelationalExpressionStage.test-support';
import { RelationalLayoutSession } from './RelationalLayoutSession';
import { RelationalNavigationControls } from './RelationalNavigationControls';
import { layoutCanvasRelationalTree, type CardPosition } from '../canvasRelationalTreeGeometry';

describe('Relational card disclosure', () => {
  let container: HTMLDivElement;
  let root: Root;
  const fixture = projectExpressionStage(withScalarOutput());
  const inspect = vi.fn();
  const render = (
    zoom: number,
    view = 'inspection',
    positions?: ReadonlyMap<string, CardPosition>
  ): void =>
    act(() =>
      root.render(
        <RelationalLayoutSession initialPositions={positions}>
          <RelationalNavigationControls panMode={false} onTogglePan={vi.fn()} />
          <CanvasRelationalTreeLayout
            key={view}
            root={fixture.projection.root}
            outputName="Model"
            selectedLocator={fixture.projection.root.locator}
            copy={resolveCanvasViewCopy('en')}
            onSelect={vi.fn()}
            onExpand={inspect}
            semanticContext={{ transformNode: fixture.node }}
            zoom={zoom}
          />
        </RelationalLayoutSession>
      )
    );
  const geometry = (): (string | null)[][] =>
    [
      ...container.querySelectorAll('li, [data-slot="canvas-relational-tree-output"], svg path'),
    ].map((element) => [element.getAttribute('style'), element.getAttribute('d')]);
  const disclosures = (): NodeListOf<HTMLButtonElement> =>
    container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]');
  const details = (): NodeListOf<Element> =>
    container.querySelectorAll('[data-slot="canvas-relational-card-detail"]');
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    render(1);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('reveals semantic detail when zoom reaches the readable threshold', () => {
    const before = geometry();
    render(1.19);
    expect(details()).toHaveLength(0);
    expect(geometry()).toEqual(before);
    render(1.2);
    expect(details().length).toBeGreaterThan(0);
    expect(geometry()).not.toEqual(before);
    expect(disclosures()).toHaveLength(0);
    render(1);
    expect(details()).toHaveLength(0);
    expect(geometry()).toEqual(before);
  });

  it('preserves card identity and manual coordinates while reserving expanded space', () => {
    const compact = layoutCanvasRelationalTree(fixture.projection.root);
    const positions = new Map(
      compact.nodes.map((placed) => [placed.node.relationId!, { x: placed.x, y: placed.y }])
    );
    render(1, 'inspection', positions);
    const before = geometry();
    const cards = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-node"]'),
    ];
    cards[0]!.focus();
    render(1.2, 'inspection', positions);
    expect([...container.querySelectorAll('[data-slot="canvas-relational-tree-node"]')]).toEqual(
      cards
    );
    expect(document.activeElement).toBe(cards[0]);
    const bounds = cards
      .map((button) => button.closest('li')!)
      .map((card) => ({
        x: Number.parseFloat(card.style.left),
        y: Number.parseFloat(card.style.top),
        width: Number.parseFloat(card.style.width),
        height: Number.parseFloat(card.style.height),
      }));
    expect(bounds[0]!.x).toBeGreaterThanOrEqual(bounds[1]!.x + bounds[1]!.width);
    render(1, 'inspection', positions);
    expect(geometry()).toEqual(before);
    render(1.2, 'inspection', positions);
    const expandedLeft = Number.parseFloat(cards[0]!.closest('li')!.style.left);
    act(() =>
      cards[0]!.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          key: 'ArrowRight',
          altKey: true,
        })
      )
    );
    expect(Number.parseFloat(cards[0]!.closest('li')!.style.left)).toBe(expandedLeft + 10);
    render(1, 'inspection', positions);
    expect(Number.parseFloat(cards[0]!.closest('li')!.style.left)).toBe(compact.nodes[0]!.x + 10);
  });

  it('toggles each card explicitly and shares disclosure between inspection and editing', () => {
    const semanticDocument = JSON.stringify(fixture.node);
    expect(disclosures()).toHaveLength(2);
    act(() => disclosures()[0]!.click());
    expect(details()).toHaveLength(1);
    const before = geometry();
    render(1, 'editing');
    expect(details()).toHaveLength(1);
    expect(geometry()).toEqual(before);
    act(() => disclosures()[1]!.click());
    expect(details()).toHaveLength(2);
    act(() => disclosures()[0]!.click());
    expect(details()).toHaveLength(1);
    expect(inspect).not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.node)).toBe(semanticDocument);
  });
  it('retains manual positions across zoom and only resets them on Arrange', () => {
    act(() => disclosures()[0]!.click());
    const card = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-node"]'
    )!;
    const position = (): string => card.closest('li')!.style.left;
    const before = position();
    act(() => {
      card.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight', altKey: true })
      );
    });
    const moved = position();
    expect(moved).not.toBe(before);
    render(1.1);
    expect(position()).toBe(moved);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-arrange"]')!
        .click()
    );
    expect(position()).toBe(before);
    expect(details()).toHaveLength(1);
  });
});
