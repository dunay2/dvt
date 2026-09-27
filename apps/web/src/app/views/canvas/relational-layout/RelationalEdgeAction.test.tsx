// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelationalEdgeAction } from './RelationalEdgeAction';

describe('RelationalEdgeAction', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body
      .querySelectorAll('[data-slot="context-menu-content"]')
      .forEach((item) => item.remove());
    container.remove();
  });

  it('selects on left click and removes from Delete or the contextual action', async () => {
    const onSelect = vi.fn();
    const onDisconnect = vi.fn();
    act(() => {
      root.render(
        <svg>
          <RelationalEdgeAction
            path="M 0 0 H 100"
            slot="test-edge"
            removeLabel="Remove connection"
            onSelect={onSelect}
            onDisconnect={onDisconnect}
          />
        </svg>
      );
    });
    const edge = container.querySelector<SVGPathElement>('[data-slot="test-edge"]')!;
    expect(edge.classList.contains('focus:outline-none')).toBe(true);

    act(() => fireEvent.click(edge));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).not.toHaveBeenCalled();
    act(() => fireEvent.keyDown(edge, { key: 'Delete' }));
    expect(onDisconnect).toHaveBeenCalledTimes(1);

    await act(async () => fireEvent.contextMenu(edge));
    expect(onSelect).toHaveBeenCalledTimes(2);
    const remove = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-remove-connection"]'
    );
    expect(remove).not.toBeNull();
    await act(async () => fireEvent.click(remove!));
    expect(onDisconnect).toHaveBeenCalledTimes(2);
  });
});
