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

  it('creates a direct alias from the default visual operation', () => {
    const onSubmit = vi.fn();
    act(() => {
      root.render(
        <GraphNodeCalculatedColumnForm
          nodeId="orders"
          columns={[
            { id: 'output:order_id', name: 'order_id', type: 'integer' },
            { id: 'output:customer', name: 'customer', type: 'text' },
          ]}
          onSubmit={onSubmit}
        />
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="graph-node-calculated-column-trigger"]'
        )!
      );
    });
    const form = document
      .querySelector<HTMLElement>('[data-slot="graph-node-calculated-column-form"]')
      ?.querySelector('form');
    const kind = form?.elements.namedItem('kind') as HTMLSelectElement;
    const input = form?.elements.namedItem('inputFieldId') as HTMLSelectElement;
    const alias = form?.elements.namedItem('alias') as HTMLInputElement;
    expect(kind.value).toBe('field-ref');
    act(() => {
      fireEvent.change(input, { target: { value: 'output:customer' } });
      fireEvent.input(alias, { target: { value: 'customer_alias' } });
      fireEvent.submit(form!);
    });

    expect(onSubmit).toHaveBeenCalledWith({
      nodeId: 'orders',
      kind: 'field-ref',
      alias: 'customer_alias',
      inputFieldId: 'output:customer',
    });
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
                items: [
                  {
                    capabilityId: 'trim-capability',
                    name: 'trim',
                    minimumArgumentCount: 1,
                    maximumArgumentCount: 1,
                  },
                  {
                    capabilityId: 'concat-capability',
                    name: 'concat',
                    minimumArgumentCount: 2,
                    maximumArgumentCount: 2,
                  },
                  {
                    capabilityId: 'coalesce-capability',
                    name: 'coalesce',
                    minimumArgumentCount: 2,
                  },
                ],
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
    expect([...functionSelect.options].map((option) => option.textContent)).toEqual(['TRIM']);
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

  it('keeps policy-invalid output data visible and blocks submission', () => {
    const onSubmit = vi.fn();
    act(() => {
      root.render(
        <GraphNodeCalculatedColumnForm
          nodeId="orders"
          columns={[{ id: 'output:customer', name: 'customer', type: 'text' }]}
          onSubmit={onSubmit}
        />
      );
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="graph-node-calculated-column-trigger"]'
        )!
      );
    });
    const surface = document.querySelector<HTMLElement>(
      '[data-slot="graph-node-calculated-column-form"]'
    )!;
    const form = surface.querySelector('form')!;
    const alias = form.elements.namedItem('alias') as HTMLInputElement;
    act(() => {
      fireEvent.input(alias, { target: { value: '   ' } });
    });
    expect(alias.value).toBe('   ');
    expect(alias.getAttribute('aria-invalid')).toBe('true');
    expect(surface.querySelector('[role="alert"]')?.textContent).toContain(
      'without outer whitespace'
    );
    expect(surface.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    act(() => {
      fireEvent.input(alias, { target: { value: 'x'.repeat(63).concat(' ') } });
      fireEvent.submit(form);
    });

    expect(alias.value).toBe('x'.repeat(63).concat(' '));
    expect(alias.getAttribute('aria-invalid')).toBe('true');
    const alert = surface.querySelector<HTMLElement>('[role="alert"]');
    expect(alias.getAttribute('aria-describedby')).toBe(alert?.id);
    expect(alert?.textContent).toContain('63 UTF-8 bytes');
    expect(surface.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-slot="graph-node-calculated-column-form"]')
    ).not.toBeNull();
  });
});
