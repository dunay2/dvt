// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection column comments', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
    useApplicationLanguageStore.setState({ language: 'es' });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('[data-slot="tooltip-content"]')
      .forEach((element) => element.remove());
    if (previousResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      globalThis.ResizeObserver = previousResizeObserver;
    }
  });

  it('reveals the persisted comment when the column receives focus', async () => {
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            {
              name: 'order_id',
              type: 'integer',
              description: 'Identificador estable del pedido',
            },
          ]}
        />
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="graph-node-column-toggle"]')!
      );
    });

    await act(async () => {
      container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!.focus();
      await Promise.resolve();
    });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain('Comentario');
    expect(tooltip?.textContent).toContain('Identificador estable del pedido');
  });
});
