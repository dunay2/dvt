// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
