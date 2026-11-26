// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasRelationalTreeCardMenu } from './CanvasRelationalTreeCardMenu';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { RelationalLayoutSession } from './relational-layout/RelationalLayoutSession';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { repeatedOccurrenceDraft } from './relational-source-occurrence/occurrence.test.fixtures';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import { CanvasRelationalTreeNodeButton } from './CanvasRelationalTreeNodeButton';

const node: CanvasRelationalTreeNode = {
  locator: 'rel:digest:sort',
  operator: 'sort',
  substraitKind: 'sort',
  operation: 'sort',
  relationId: 'relation:sort',
  displayName: 'amount DESC NULLS LAST',
  sourceRef: null,
  output: { fields: [] },
  expressionRefs: [{ slot: 'sort-key', ordinal: 0 }],
  decorations: [],
  children: [],
};

describe('CanvasRelationalTreeCardMenu', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.querySelectorAll('[data-radix-menu-content]').forEach((item) => item.remove());
    container.remove();
  });

  it.each(['en', 'es'])(
    'keeps the alias as the tree name and describes its physical source in %s',
    (language) => {
      const document = repeatedOccurrenceDraft();
      document.sidecar.relations.find((binding) => binding.sourceRef != null)!.displayName =
        'places_alias';
      const indexed = indexSubstraitRelations(document);
      if (!indexed.ok) throw indexed.error;
      const read = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: 'alias' })
        .children[0]!.node;
      act(() =>
        root.render(
          <CanvasRelationalTreeNodeButton
            placed={{
              node: read,
              parentLocator: null,
              role: 'primary',
              ordinal: 0,
              siblingCount: 2,
              level: 1,
              x: 0,
              y: 0,
              width: 240,
              height: 76,
            }}
            selected={false}
            copy={resolveCanvasViewCopy(language)}
            detailed={false}
            movable={false}
            onSelect={vi.fn()}
          />
        )
      );
      const card = container.querySelector<HTMLButtonElement>('[role="treeitem"]')!;
      expect(card.getAttribute('aria-label')).toBe(
        `${language === 'es' ? 'Entrada principal' : 'Primary input'}: places_alias`
      );
      const description = container.querySelector('[data-slot="canvas-relational-source-detail"]')!;
      expect(description.textContent).toBe(
        `${language === 'es' ? 'Fuente conectada' : 'Connected source'}: public.places`
      );
      expect(card.getAttribute('aria-describedby')).toBe(description.id);
      act(() => card.focus());
      expect(window.document.activeElement).toBe(card);
    }
  );

  it('opens the application menu and dispatches edit and removal for a unary card', async () => {
    const onExpand = vi.fn();
    const onRemove = vi.fn();
    act(() => {
      root.render(
        <CanvasRelationalTreeCardMenu node={node} onExpand={onExpand} onRemove={onRemove}>
          <button type="button">ORDER BY</button>
        </CanvasRelationalTreeCardMenu>
      );
    });

    await act(async () => fireEvent.contextMenu(container.querySelector('button')!));
    const edit = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-edit-operation"]'
    );
    expect(edit).not.toBeNull();
    await act(async () => fireEvent.click(edit!));
    expect(onExpand).toHaveBeenCalledWith(node.locator);

    await act(async () => fireEvent.contextMenu(container.querySelector('button')!));
    const remove = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-remove-source"]'
    );
    expect(remove).not.toBeNull();
    await act(async () => fireEvent.click(remove!));
    expect(onRemove).toHaveBeenCalledWith(node.relationId);
  });

  it('keeps portalled menu actions usable after a cancelled card drag', async () => {
    const onExpand = vi.fn();
    act(() =>
      root.render(
        <RelationalLayoutSession>
          <CanvasRelationalTreeLayout
            root={node}
            outputName="Model"
            selectedLocator={node.locator}
            copy={resolveCanvasViewCopy('en')}
            onSelect={vi.fn()}
            onExpand={onExpand}
          />
        </RelationalLayoutSession>
      )
    );
    const card = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-node"]'
    )!;
    Object.assign(card, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      hasPointerCapture: () => true,
    });
    for (const type of ['pointerdown', 'pointermove', 'pointercancel']) {
      const event = new MouseEvent(type, {
        bubbles: true,
        button: 0,
        clientX: type === 'pointerdown' ? 100 : 140,
        clientY: 100,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      act(() => {
        card.dispatchEvent(event);
      });
    }
    await act(async () => fireEvent.contextMenu(card));
    const edit = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-edit-operation"]'
    )!;
    await act(async () => fireEvent.click(edit));
    expect(onExpand).toHaveBeenCalledExactlyOnceWith(node.locator);
  });

  it('offers one delete-card action for a binary operation, never an implicit splice', async () => {
    const onRemove = vi.fn();
    act(() => {
      root.render(
        <CanvasRelationalTreeCardMenu
          node={{
            ...node,
            locator: 'pending-operation:join',
            relationId: 'pending-operation:join',
            operator: 'join',
            operation: 'inner_join',
            expressionRefs: [],
          }}
          onRemove={onRemove}
        >
          <button type="button">INNER JOIN</button>
        </CanvasRelationalTreeCardMenu>
      );
    });

    await act(async () => fireEvent.contextMenu(container.querySelector('button')!));
    expect(document.body.querySelector('[data-slot="canvas-relational-remove-left"]')).toBeNull();
    expect(document.body.querySelector('[data-slot="canvas-relational-remove-right"]')).toBeNull();
    const remove = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-remove-source"]'
    );
    expect(remove?.textContent).toContain('Delete card');
    await act(async () => fireEvent.click(remove!));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith('pending-operation:join');
  });
});
