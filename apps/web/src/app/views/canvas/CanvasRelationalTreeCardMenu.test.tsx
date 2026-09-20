// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasRelationalTreeCardMenu } from './CanvasRelationalTreeCardMenu';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

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
});
