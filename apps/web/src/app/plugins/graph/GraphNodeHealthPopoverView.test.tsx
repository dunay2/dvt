// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeHealthPopoverView } from './GraphNodeHealthPopoverView';

describe('GraphNodeHealthPopoverView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders node health detail rows and closes on Escape', () => {
    const onClose = vi.fn();

    act(() => {
      root.render(
        <GraphNodeHealthPopoverView
          detail={{
            title: 'Postgres · public health',
            ariaLabel: 'Open Postgres · public health metrics',
            rows: [
              { id: 'freshness', label: 'Freshness', value: '12 min' },
              { id: 'size', label: 'Dataset size', value: '18.2 GB' },
            ],
          }}
          position={{ x: 120, y: 220 }}
          onClose={onClose}
        />
      );
    });

    const popover = container.querySelector<HTMLElement>('[data-slot="graph-node-health-popover"]');
    expect(popover).not.toBeNull();
    expect(popover?.style.getPropertyValue('--graph-node-health-popover-x')).toBe('120px');
    expect(popover?.style.getPropertyValue('--graph-node-health-popover-y')).toBe('220px');
    expect(container.textContent).toContain('Postgres · public health');
    expect(container.textContent).toContain('Freshness');
    expect(container.textContent).toContain('18.2 GB');

    act(() => {
      fireEvent.keyDown(popover!, { key: 'Escape' });
    });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
