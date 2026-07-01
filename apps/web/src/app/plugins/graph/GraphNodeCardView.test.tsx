// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeCardView } from './GraphNodeCardView';

const BASE_PROPS = {
  cardModel: {
    title: 'Orders model',
    technicalName: 'orders_model',
    kindLabel: 'Model',
    subtitle: 'analytics',
    path: 'models/marts/orders.sql',
    status: { label: 'Draft', tone: 'warning' as const },
    metrics: [],
    operationalMetrics: [],
    operationalDetail: null,
    accentTone: 'model' as const,
  },
  typeLabel: 'Model',
  tags: [],
  columns: [],
  showColumns: false,
  selected: false,
  hovered: false,
  dimmed: false,
};

describe('GraphNodeCardView', () => {
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

  it('renders a node-local play action in the card header when available', () => {
    const onPlay = vi.fn();

    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          playAction={{ label: 'Select for execution', onPress: onPlay, disabled: false }}
        />
      );
    });

    const button = container.querySelector('button[aria-label="Select for execution"]');
    expect(button).not.toBeNull();
    act(() => {
      fireEvent.click(button!);
    });

    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('keeps the card play action green but visually secondary until hover or focus', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          playAction={{ label: 'Select for execution', onPress: vi.fn(), disabled: false }}
        />
      );
    });

    const card = container.querySelector('[data-slot="graph-node-card"]');
    const button = container.querySelector('[data-slot="graph-node-card-play"]');

    expect(card?.className).toContain('group');
    expect(button?.className).toContain('text-green');
    expect(button?.className).toContain('opacity-0');
    expect(button?.className).toContain('group-hover:opacity-100');
    expect(button?.className).toContain('focus-visible:opacity-100');
  });

  it('renders semantic status, path, tags, and operational rail from the read model', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            title: 'Postgres · public',
            technicalName: 'src_public_orders',
            kindLabel: 'Source',
            subtitle: 'warehouse.public.orders',
            path: 'models/sources/src_public.yml',
            status: { label: 'Ready', tone: 'success' },
            metrics: [{ id: 'columns', label: 'Columns', value: '3' }],
            operationalMetrics: [
              { id: 'freshness', label: 'Freshness', value: '12 min' },
              { id: 'throughput', label: 'Throughput', value: '42 MB/min' },
              { id: 'size', label: 'Size', value: '18.2 GB' },
            ],
            operationalDetail: {
              title: 'Postgres · public health',
              ariaLabel: 'Open Postgres · public health metrics',
              rows: [
                { id: 'freshness', label: 'Freshness', value: '12 min' },
                { id: 'throughput', label: 'Throughput', value: '42 MB/min' },
                { id: 'size', label: 'Size', value: '18.2 GB' },
              ],
            },
            accentTone: 'source',
          }}
          tags={['postgres', 'public']}
        />
      );
    });

    expect(container.textContent).toContain('Postgres · public');
    expect(container.textContent).not.toContain('src_public_orders');
    expect(
      container.querySelector('[data-slot="graph-node-card-title"]')?.getAttribute('title')
    ).toBe('src_public_orders');
    expect(container.textContent).toContain('Ready');
    expect(container.textContent).toContain('models/sources/src_public.yml');
    expect(container.textContent).toContain('postgres');
    expect(
      container.querySelector('[data-slot="graph-node-tag-list"]')?.getAttribute('data-tone')
    ).toBe('source');
    expect(container.textContent).toContain('Freshness');
    expect(container.textContent).toContain('42 MB/min');
  });

  it('uses the textual status chip as the only card status indicator', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            status: { label: 'Warning', tone: 'warning' },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="graph-node-status-chip"]')?.textContent).toBe(
      'Warning'
    );
    expect(container.querySelectorAll('[data-slot="graph-node-status-chip"]')).toHaveLength(1);
    expect(container.textContent?.match(/Warning/g)).toHaveLength(1);
  });

  it('opens operational details from the rail without bubbling to the node card', () => {
    const onOpenOperationalDetails = vi.fn();
    const onCardClick = vi.fn();
    const anchorRect = new DOMRect(20, 30, 120, 40);

    act(() => {
      root.render(
        <div onClick={onCardClick}>
          <GraphNodeCardView
            {...BASE_PROPS}
            cardModel={{
              ...BASE_PROPS.cardModel,
              operationalMetrics: [
                { id: 'freshness', label: 'Freshness', value: '12 min' },
                { id: 'size', label: 'Size', value: '18.2 GB' },
              ],
              operationalDetail: {
                title: 'Orders model health',
                ariaLabel: 'Open Orders model health metrics',
                rows: [
                  { id: 'freshness', label: 'Freshness', value: '12 min' },
                  { id: 'size', label: 'Size', value: '18.2 GB' },
                ],
              },
            }}
            onOpenOperationalDetails={onOpenOperationalDetails}
          />
        </div>
      );
    });

    const rail = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-operational-rail"]'
    );
    expect(rail).not.toBeNull();
    expect(rail?.getAttribute('aria-label')).toBe('Open Orders model health metrics');
    vi.spyOn(rail!, 'getBoundingClientRect').mockReturnValue(anchorRect);

    act(() => {
      fireEvent.click(rail!);
    });

    expect(onOpenOperationalDetails).toHaveBeenCalledWith(
      {
        title: 'Orders model health',
        ariaLabel: 'Open Orders model health metrics',
        rows: [
          { id: 'freshness', label: 'Freshness', value: '12 min' },
          { id: 'size', label: 'Size', value: '18.2 GB' },
        ],
      },
      anchorRect
    );
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
