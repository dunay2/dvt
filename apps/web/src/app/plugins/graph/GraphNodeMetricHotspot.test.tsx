// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeMetricHotspot } from './GraphNodeMetricHotspot';

describe('GraphNodeMetricHotspot', () => {
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
    container.remove();
  });

  it('adapts the shared hotspot to the canvas embedded-control boundary', () => {
    act(() => {
      root.render(<GraphNodeMetricHotspot detail="125,000 rows." value="125k" />);
    });

    const trigger = container.querySelector('[data-slot="graph-node-metric-hotspot"]');
    expect(trigger?.getAttribute('data-canvas-node-control')).toBe('');
  });

  it('protects an actionable metric from React Flow drag and pan', () => {
    const onActivate = vi.fn();
    act(() => {
      root.render(
        <GraphNodeMetricHotspot
          detail="El código está en models/sources.yml."
          onActivate={onActivate}
          value="Archivo"
        />
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-metric-hotspot"]'
    );
    expect(trigger?.tagName).toBe('BUTTON');
    expect(trigger?.classList.contains('nodrag')).toBe(true);
    expect(trigger?.classList.contains('nopan')).toBe(true);

    act(() => {
      fireEvent.click(trigger!);
    });
    expect(onActivate).toHaveBeenCalledOnce();
  });
});
