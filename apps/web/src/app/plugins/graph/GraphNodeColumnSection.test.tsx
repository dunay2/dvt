// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection', () => {
  const EIGHT_COLUMNS = [
    { name: 'column_1', type: 'text' },
    { name: 'column_2', type: 'text' },
    { name: 'column_3', type: 'text' },
    { name: 'column_4', type: 'text' },
    { name: 'column_5', type: 'text' },
    { name: 'column_6', type: 'text' },
    { name: 'column_7', type: 'text' },
    { name: 'column_8', type: 'text' },
  ] as const;
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'es' });
  });

  it('shows five columns before explicitly revealing and hiding the remainder', () => {
    act(() => {
      root.render(<GraphNodeColumnSection columns={EIGHT_COLUMNS} />);
    });

    const sectionToggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    act(() => {
      fireEvent.click(sectionToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(5);
    expect(container.textContent).toContain('column_5');
    expect(container.textContent).not.toContain('column_6');

    const remainderToggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-remainder-toggle"]'
    );
    expect(remainderToggle?.textContent).toContain('Ver columnas restantes (3)');
    expect(remainderToggle?.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      fireEvent.click(remainderToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(8);
    expect(container.textContent).toContain('column_8');
    expect(remainderToggle?.textContent).toContain('Mostrar solo las 5 primeras');
    expect(remainderToggle?.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      fireEvent.click(remainderToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(5);
    expect(container.textContent).not.toContain('column_6');
  });

  it('localizes the column disclosure and omits a redundant remainder action', () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    act(() => {
      root.render(<GraphNodeColumnSection columns={EIGHT_COLUMNS.slice(0, 5)} />);
    });

    const sectionToggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    expect(sectionToggle?.textContent).toContain('Columns (5)');

    act(() => {
      fireEvent.click(sectionToggle!);
    });

    expect(container.querySelectorAll('[data-slot="graph-node-column-row"]')).toHaveLength(5);
    expect(container.querySelector('[data-slot="graph-node-column-remainder-toggle"]')).toBeNull();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('renders a collapsed governed column disclosure with Spanish product copy', () => {
    act(() => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            { name: 'order_id', type: 'integer' },
            { name: 'customer', type: 'text' },
          ]}
        />
      );
    });

    const section = container.querySelector('[data-slot="graph-node-column-section"]');
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );

    expect(section).not.toBeNull();
    expect(toggle?.textContent).toContain('Columnas (2)');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.textContent).not.toContain('order_id');
  });

  it('expands recorded columns without inventing metadata', () => {
    act(() => {
      root.render(
        <GraphNodeColumnSection
          columns={[
            { name: 'order_id', type: 'integer' },
            { name: 'customer', type: 'text' },
          ]}
        />
      );
    });

    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    expect(toggle).not.toBeNull();

    act(() => {
      fireEvent.click(toggle!);
    });

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('integer');
    expect(container.textContent).toContain('customer');
    expect(container.textContent).toContain('text');
    expect(container.textContent).not.toContain('unknown');
  });
});
