// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection compact type tooltip', () => {
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

  it.each([
    { language: 'es' as const, output: true, type: 'string' },
    { language: 'es' as const, output: false, type: 'integer' },
    { language: 'en' as const, output: true, type: 'integer' },
    { language: 'en' as const, output: false, type: 'string' },
  ])('shows only $type in $language when output=$output', async ({ language, output, type }) => {
    useApplicationLanguageStore.setState({ language });
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            {
              name: 'order_id',
              type,
              output,
              reference: 'dvt_fld_internal-identifier',
              sourceNodeName: 'orders',
              sourceFieldName: 'raw_order_id',
              operations: ['trim'],
              nullable: false,
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
    expect(tooltip?.textContent).toBe(type);
    expect(
      document.body.querySelector('[data-slot="tooltip-content"]')?.classList.contains('w-72')
    ).toBe(false);
  });
});
