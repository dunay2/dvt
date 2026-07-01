// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeOperationalRail } from './GraphNodeOperationalRail';

describe('GraphNodeOperationalRail', () => {
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

  it('omits itself when no operational metrics are supplied', () => {
    act(() => {
      root.render(<GraphNodeOperationalRail metrics={[]} />);
    });

    expect(container.querySelector('[data-slot="graph-node-operational-rail"]')).toBeNull();
  });

  it('renders static metrics without an interactive button when no opener exists', () => {
    act(() => {
      root.render(
        <GraphNodeOperationalRail
          metrics={[{ id: 'size', label: 'Size', value: '18.2 GB', icon: 'database' }]}
        />
      );
    });

    expect(container.querySelector('button[data-slot="graph-node-operational-rail"]')).toBeNull();
    expect(container.querySelector('[data-slot="graph-node-operational-rail"]')?.textContent).toBe(
      'Size18.2 GB'
    );
    expect(
      container
        .querySelector('[data-slot="graph-node-operational-icon"]')
        ?.getAttribute('data-icon')
    ).toBe('database');
    expect(
      container
        .querySelector('[data-slot="graph-node-operational-icon"]')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
  });

  it('renders metric tones as stable presentation state', () => {
    act(() => {
      root.render(
        <GraphNodeOperationalRail
          metrics={[
            {
              id: 'schema-drift',
              label: 'Schema drift',
              value: 'Drift detected',
              icon: 'drift',
              tone: 'warning',
            },
          ]}
        />
      );
    });

    const metric = container.querySelector('[data-slot="graph-node-operational-metric"]');
    const value = container.querySelector('[data-slot="graph-node-operational-value"]');

    expect(metric?.getAttribute('data-tone')).toBe('warning');
    expect(value?.className).toContain('text-amber');
  });

  it('uses the supplied accessible label for interactive rails', () => {
    const onOpen = vi.fn();

    act(() => {
      root.render(
        <GraphNodeOperationalRail
          metrics={[{ id: 'freshness', label: 'Freshness', value: '12 min' }]}
          ariaLabel="Open source health metrics"
          onOpen={onOpen}
        />
      );
    });

    expect(
      container
        .querySelector('button[data-slot="graph-node-operational-rail"]')
        ?.getAttribute('aria-label')
    ).toBe('Open source health metrics');
  });

  it('opens with the rail anchor on click without bubbling to the card', () => {
    const onOpen = vi.fn();
    const onCardClick = vi.fn();
    const anchorRect = new DOMRect(12, 24, 120, 32);

    act(() => {
      root.render(
        <div onClick={onCardClick}>
          <GraphNodeOperationalRail
            metrics={[{ id: 'freshness', label: 'Freshness', value: '12 min' }]}
            ariaLabel="Open source health metrics"
            onOpen={onOpen}
          />
        </div>
      );
    });

    const rail = container.querySelector<HTMLButtonElement>(
      'button[data-slot="graph-node-operational-rail"]'
    );
    expect(rail).not.toBeNull();
    vi.spyOn(rail!, 'getBoundingClientRect').mockReturnValue(anchorRect);

    act(() => {
      fireEvent.click(rail!);
    });

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenLastCalledWith(anchorRect);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('does not open twice for one native keyboard button activation', () => {
    const onOpen = vi.fn();
    const anchorRect = new DOMRect(12, 24, 120, 32);

    act(() => {
      root.render(
        <GraphNodeOperationalRail
          metrics={[{ id: 'freshness', label: 'Freshness', value: '12 min' }]}
          ariaLabel="Open source health metrics"
          onOpen={onOpen}
        />
      );
    });

    const rail = container.querySelector<HTMLButtonElement>(
      'button[data-slot="graph-node-operational-rail"]'
    );
    expect(rail).not.toBeNull();
    vi.spyOn(rail!, 'getBoundingClientRect').mockReturnValue(anchorRect);

    act(() => {
      fireEvent.keyDown(rail!, { key: 'Enter' });
      fireEvent.click(rail!);
    });

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(anchorRect);
  });
});
