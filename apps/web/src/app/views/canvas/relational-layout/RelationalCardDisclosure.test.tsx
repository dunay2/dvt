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

describe('Relational card disclosure', () => {
  let container: HTMLDivElement;
  let root: Root;
  const fixture = projectExpressionStage(withScalarOutput());
  const inspect = vi.fn();
  const render = (zoom: number, view = 'inspection'): void =>
    act(() =>
      root.render(
        <RelationalLayoutSession>
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

  it('preserves world geometry across zoom levels without opening any detail', () => {
    const before = geometry();
    for (const zoom of [1.3, 0.5, 2, 1]) {
      render(zoom);
      expect(geometry()).toEqual(before);
      expect(details()).toHaveLength(0);
    }
  });

  it('toggles each card explicitly and shares disclosure between inspection and editing', () => {
    const semanticDocument = JSON.stringify(fixture.node);
    expect(disclosures()).toHaveLength(2);
    act(() => disclosures()[0]!.click());
    expect(details()).toHaveLength(1);
    const before = geometry();
    render(1.6, 'editing');
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
    render(1.7);
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
