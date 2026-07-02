// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('GraphNodeColumnSection', () => {
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
