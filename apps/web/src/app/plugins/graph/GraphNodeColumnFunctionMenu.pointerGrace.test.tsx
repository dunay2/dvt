// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnFunctionMenu pointer grace', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    useApplicationLanguageStore.setState({ language: 'es' });
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:customer',
              name: 'customer',
              type: 'text',
              functionMenu: {
                category: 'text',
                items: [{ capabilityId: 'capability:trim', name: 'trim' }],
              },
            },
          ]}
          onColumnFunctionApply={vi.fn()}
        />
      );
    });
    act(() =>
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      )
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('times out the pointer menu but leaves the keyboard menu stable', async () => {
    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    act(() =>
      piece.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
      )
    );
    expect(menu()).not.toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(menu()).toBeNull();

    act(() => {
      fireEvent.keyDown(
        container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!,
        { key: 'F10', shiftKey: true }
      );
    });
    await act(async () => vi.advanceTimersByTimeAsync(2_000));

    expect(menu()).not.toBeNull();
  });

  function menu(): Element | null {
    return document.querySelector('[data-slot="graph-node-column-function-menu"]');
  }
});
