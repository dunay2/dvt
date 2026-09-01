// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeMetricRow } from './GraphNodeMetricRow';

describe('GraphNodeMetricRow', () => {
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

  it('omits itself when no metrics are supplied', () => {
    act(() => {
      root.render(<GraphNodeMetricRow metrics={[]} />);
    });

    expect(container.querySelector('[data-slot="graph-node-metric-row"]')).toBeNull();
  });

  it('renders supplied metric labels and values without inventing missing metrics', () => {
    act(() => {
      root.render(
        <GraphNodeMetricRow
          metrics={[
            { id: 'columns', label: 'Columns', value: '3' },
            { id: 'rows', label: 'Rows', value: '124M' },
          ]}
        />
      );
    });

    expect(container.querySelector('[data-slot="graph-node-metric-row"]')).not.toBeNull();
    expect(container.textContent).toBe('Columns3Rows124M');
    expect(container.textContent).not.toContain('Size');
  });

  it('uses stable metric ids as rendered row keys by preserving duplicate labels', () => {
    act(() => {
      root.render(
        <GraphNodeMetricRow
          metrics={[
            { id: 'input-rows', label: 'Rows', value: '10' },
            { id: 'output-rows', label: 'Rows', value: '8' },
          ]}
        />
      );
    });

    expect(container.textContent).toBe('Rows10Rows8');
  });

  it.each([
    ['view', 'eye'],
    ['incremental', 'refresh'],
    ['table', 'table'],
    ['ephemeral', 'workflow'],
    ['materialized_view', 'database'],
  ] as const)('renders the %s materialization with its %s icon', (value, icon) => {
    act(() => {
      root.render(
        <GraphNodeMetricRow metrics={[{ id: 'materialization', label: 'Mat.', value, icon }]} />
      );
    });

    expect(
      container.querySelector('[data-slot="graph-node-summary-icon"]')?.getAttribute('data-icon')
    ).toBe(icon);
    expect(container.textContent).toBe(`Mat.${value}`);
  });

  it('renders a header metric row without the body spacing contract', () => {
    act(() => {
      root.render(
        <GraphNodeMetricRow
          metrics={[{ id: 'materialization', label: 'Mat.', value: 'view', icon: 'eye' }]}
          placement="header"
        />
      );
    });

    const row = container.querySelector('[data-slot="graph-node-metric-row"]');
    expect(row?.getAttribute('data-placement')).toBe('header');
    expect(row?.className).not.toContain('mt-3');
  });

  it('marks measured and estimated values as accessible tone-aware hotspots', () => {
    act(() => {
      root.render(
        <GraphNodeMetricRow
          metrics={[
            {
              id: 'bytes',
              label: 'Size',
              value: '3.9 MB',
              tone: 'success',
              detail: '4,096,000 B (3.9 MB). Measured from provider metadata.',
            },
            {
              id: 'estimated-bytes',
              label: 'Est. size',
              value: '8.5 KB',
              tone: 'warning',
              detail: '8,704 B (8.5 KB). Estimated from schema width.',
            },
          ]}
        />
      );
    });

    const values = Array.from(
      container.querySelectorAll('[data-slot="graph-node-metric-hotspot"]')
    );
    expect(container.querySelectorAll('[title]')).toHaveLength(0);
    expect(values.map((value) => value.getAttribute('aria-label'))).toEqual([
      '4,096,000 B (3.9 MB). Measured from provider metadata.',
      '8,704 B (8.5 KB). Estimated from schema width.',
    ]);
    expect(container.querySelector('[data-tone="success"]')).not.toBeNull();
    expect(container.querySelector('[data-tone="warning"]')).not.toBeNull();
  });

  it('makes only the file-backed code metric open Code', () => {
    const onOpenCode = vi.fn();
    act(() => {
      root.render(
        <GraphNodeMetricRow
          metrics={[
            {
              id: 'code',
              label: 'Código',
              value: 'Archivo',
              detail: 'El código está en models/sources.yml.',
            },
            { id: 'columns', label: 'Columnas', value: '8' },
          ]}
          onOpenCode={onOpenCode}
        />
      );
    });

    const hotspots = container.querySelectorAll('[data-slot="graph-node-metric-hotspot"]');
    expect(hotspots[0]?.tagName).toBe('BUTTON');
    expect(hotspots[1]?.tagName).toBe('SPAN');

    act(() => {
      fireEvent.click(hotspots[0]!);
      fireEvent.click(hotspots[1]!);
    });

    expect(onOpenCode).toHaveBeenCalledOnce();
  });
});
