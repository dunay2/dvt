// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Database } from 'lucide-react';
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
    sourceIdentity: null,
    accentTone: 'model' as const,
    nodeActionsLabel: 'Open node menu',
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
  let previousResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    previousResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
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
    document
      .querySelectorAll('[data-slot="tooltip-content"]')
      .forEach((element) => element.remove());
    if (previousResizeObserver === undefined) {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    } else {
      globalThis.ResizeObserver = previousResizeObserver;
    }
  });

  it('renders a node-local play action in the card header when available', () => {
    const onPlay = vi.fn();

    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          playAction={{
            label: 'Select for execution',
            visualState: 'select',
            onPress: onPlay,
            disabled: false,
          }}
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

  it('keeps the card play action green and immediately discoverable', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          playAction={{
            label: 'Select for execution',
            visualState: 'select',
            onPress: vi.fn(),
            disabled: false,
          }}
        />
      );
    });

    const card = container.querySelector('[data-slot="graph-node-card"]');
    const button = container.querySelector('[data-slot="graph-node-card-play"]');

    expect(card?.className).toContain('group');
    expect(button?.className).toContain('text-green');
    expect(button?.className).toContain('cursor-pointer');
    expect(button?.className).not.toContain('opacity-0');
  });

  it('changes the selected-for-execution action from play to pause', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          playAction={{
            label: 'Deselect for execution',
            visualState: 'deselect',
            onPress: vi.fn(),
          }}
        />
      );
    });

    expect(
      container.querySelector('[data-slot="graph-node-card-play"]')?.getAttribute('data-state')
    ).toBe('deselect');
    expect(container.querySelector('[data-slot="graph-node-card-pause-icon"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="graph-node-card-play-icon"]')).toBeNull();
  });

  it('opens governed node actions from the card action button without selecting the card', () => {
    const onCardClick = vi.fn();
    const onContextMenu = vi.fn((event: React.MouseEvent<HTMLDivElement>) =>
      event.preventDefault()
    );

    act(() => {
      root.render(
        <div onClick={onCardClick} onContextMenu={onContextMenu}>
          <GraphNodeCardView {...BASE_PROPS} />
        </div>
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-card-actions"]'
    );

    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe('Open node menu');
    expect(button?.className).toContain('cursor-pointer');

    act(() => {
      fireEvent.click(button!);
    });

    expect(onContextMenu).toHaveBeenCalledOnce();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('uses a stable professional card width from graph visual tokens', () => {
    act(() => {
      root.render(<GraphNodeCardView {...BASE_PROPS} />);
    });

    const card = container.querySelector('[data-slot="graph-node-card"]');

    expect(card?.className).toContain('w-[24rem]');
    expect(card?.className).toContain('min-w-[24rem]');
    expect(card?.className).not.toContain('min-w-[220px]');
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
            sourceIdentity: null,
            accentTone: 'source',
            nodeActionsLabel: 'Open node menu',
          }}
          tags={[
            { value: 'postgres', label: 'postgres' },
            { value: 'public', label: 'public' },
          ]}
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

  it('reveals the structured source identity from the table title on keyboard focus', async () => {
    await act(async () => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            title: 'orders',
            sourceIdentity: {
              ariaLabel: 'Ver identidad de origen de orders',
              rows: [
                { id: 'database', label: 'Base de datos', value: 'analytics' },
                { id: 'connection', label: 'Conexión', value: 'PostgreSQL local' },
                { id: 'schema', label: 'Esquema', value: 'erp' },
                { id: 'user', label: 'Usuario', value: 'warehouse_reader' },
              ],
            },
          }}
        />
      );
    });

    const trigger = container.querySelector<HTMLElement>(
      '[data-slot="graph-node-source-identity-trigger"]'
    );
    expect(trigger?.getAttribute('tabindex')).toBe('0');
    expect(trigger?.getAttribute('aria-label')).toBe('Ver identidad de origen de orders');
    expect(trigger?.getAttribute('title')).toBeNull();

    await act(async () => {
      trigger?.focus();
      await Promise.resolve();
    });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toContain('Base de datosanalytics');
    expect(tooltip?.textContent).toContain('ConexiónPostgreSQL local');
    expect(tooltip?.textContent).toContain('Esquemaerp');
    expect(tooltip?.textContent).toContain('Usuariowarehouse_reader');
  });

  it('keeps long source identity values fully readable instead of truncating them', async () => {
    const longConnectionName =
      'PostgreSQL de operaciones financieras para Europa occidental y auditoría';
    await act(async () => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            title: 'orders',
            sourceIdentity: {
              ariaLabel: 'Ver identidad de origen de orders',
              rows: [
                { id: 'database', label: 'Base de datos', value: 'analytics' },
                { id: 'connection', label: 'Conexión', value: longConnectionName },
                { id: 'schema', label: 'Esquema', value: 'erp' },
                { id: 'user', label: 'Usuario', value: 'warehouse_reader' },
              ],
            },
          }}
        />
      );
    });

    const trigger = container.querySelector<HTMLElement>(
      '[data-slot="graph-node-source-identity-trigger"]'
    );
    await act(async () => {
      trigger?.focus();
      await Promise.resolve();
    });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    const connectionValue = [...(tooltip?.querySelectorAll('dd') ?? [])].find(
      (value) => value.textContent === longConnectionName
    );
    expect(connectionValue?.className).toContain('break-all');
    expect(connectionValue?.className).not.toContain('truncate');
  });

  it('renders icon tone from the card model without inline colors', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            accentTone: 'source',
          }}
          icon={Database}
        />
      );
    });

    const icon = container.querySelector('[data-slot="graph-node-card-icon"]');

    expect(icon?.getAttribute('data-tone')).toBe('source');
    expect(icon?.getAttribute('style')).toBeNull();
    expect(icon?.getAttribute('class')).toContain('text-purple');
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
      rail
    );
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('keeps the operational rail non-interactive when the detail model has no rows', () => {
    const onOpenOperationalDetails = vi.fn();
    const onCardClick = vi.fn();

    act(() => {
      root.render(
        <div onClick={onCardClick}>
          <GraphNodeCardView
            {...BASE_PROPS}
            cardModel={{
              ...BASE_PROPS.cardModel,
              operationalMetrics: [{ id: 'rows', label: 'Rows', value: '3' }],
              operationalDetail: {
                title: 'Source health',
                ariaLabel: 'Open source health metrics',
                rows: [],
              },
            }}
            onOpenOperationalDetails={onOpenOperationalDetails}
          />
        </div>
      );
    });

    const rail = container.querySelector('[data-slot="graph-node-operational-rail"]');

    expect(rail).not.toBeNull();
    expect(rail?.tagName).toBe('DIV');
    expect(rail?.textContent).toBe('Rows3');

    act(() => {
      fireEvent.click(rail!);
    });

    expect(onOpenOperationalDetails).not.toHaveBeenCalled();
    expect(onCardClick).toHaveBeenCalledOnce();
  });
});
