// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
