// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

const EIGHT_COLUMNS = Array.from({ length: 8 }, (_, index) => ({
  name: `column_${index + 1}`,
  type: 'text',
}));

describe('GraphNodeColumnSection disclosure copy', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function openColumns(): HTMLButtonElement {
    act(() => {
      root.render(<GraphNodeColumnSection columns={EIGHT_COLUMNS} />);
    });
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-toggle"]'
    );
    act(() => fireEvent.click(toggle!));
    return container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-column-remainder-toggle"]'
    )!;
  }

  it('uses the governed Spanish compact and accessible copy', () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const remainderToggle = openColumns();

    expect(remainderToggle.querySelector('span[aria-hidden="true"]')?.textContent).toBe('+3 más');
    expect(remainderToggle.querySelector('.sr-only')?.textContent).toBe(
      'Ver columnas restantes (3)'
    );

    act(() => fireEvent.click(remainderToggle));
    expect(remainderToggle.querySelector('span[aria-hidden="true"]')?.textContent).toBe(
      'Ver menos'
    );
    expect(remainderToggle.querySelector('.sr-only')?.textContent).toBe(
      'Mostrar solo las 5 primeras'
    );
  });

  it('uses the governed English compact and accessible copy', () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    const remainderToggle = openColumns();

    expect(remainderToggle.querySelector('span[aria-hidden="true"]')?.textContent).toBe('+3 more');
    expect(remainderToggle.querySelector('.sr-only')?.textContent).toBe(
      'Show remaining columns (3)'
    );

    act(() => fireEvent.click(remainderToggle));
    expect(remainderToggle.querySelector('span[aria-hidden="true"]')?.textContent).toBe(
      'Show less'
    );
    expect(remainderToggle.querySelector('.sr-only')?.textContent).toBe('Show first 5 columns');
  });
});
