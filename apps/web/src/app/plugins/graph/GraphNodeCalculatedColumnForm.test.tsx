// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeCalculatedColumnForm } from './GraphNodeCalculatedColumnForm';

describe('GraphNodeCalculatedColumnForm', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document
      .querySelectorAll('[data-slot="popover-content"]')
      .forEach((element) => element.remove());
    container.remove();
  });

  it('creates a function output from a keyboard-accessible gap action', () => {
    const onSubmit = vi.fn();
    act(() => {
      root.render(
        <GraphNodeCalculatedColumnForm
          nodeId="orders"
          columns={[
            {
              id: 'output:customer',
              name: 'customer',
              type: 'text',
              functionMenu: {
                category: 'text',
                items: [{ capabilityId: 'trim-capability', name: 'trim' }],
              },
            },
          ]}
          onSubmit={onSubmit}
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-calculated-column-trigger"]'
    );
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    act(() => {
      fireEvent.click(trigger!);
    });

    const surface = document.querySelector<HTMLElement>(
      '[data-slot="graph-node-calculated-column-form"]'
    );
    const form = surface?.querySelector('form');
    const kind = form?.elements.namedItem('kind') as HTMLSelectElement;
    const alias = form?.elements.namedItem('alias') as HTMLInputElement;
    act(() => {
      fireEvent.change(kind, { target: { value: 'scalar-function' } });
      fireEvent.input(alias, { target: { value: 'customer_clean' } });
    });
    const functionSelect = form?.elements.namedItem('capabilityId') as HTMLSelectElement;
    act(() => {
      fireEvent.change(functionSelect, { target: { value: 'trim-capability' } });
      fireEvent.submit(form!);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      nodeId: 'orders',
      kind: 'scalar-function',
      alias: 'customer_clean',
      inputFieldId: 'output:customer',
      capabilityId: 'trim-capability',
    });
    expect(document.querySelector('[data-slot="graph-node-calculated-column-form"]')).toBeNull();
  });
});
