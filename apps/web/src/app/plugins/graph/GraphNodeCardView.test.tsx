// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Database } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { dvtGraphNodeCardStrategy } from '../dvt/dvtGraphNodeCardStrategy';
import { GraphNodeCardView } from './GraphNodeCardView';
import { GraphNodeRenderer } from './GraphNodeRenderer';

const BASE_PROPS = {
  cardModel: {
    title: 'Model 1',
    technicalName: 'model_1',
    kindLabel: null,
    subtitle: 'analytics',
    path: 'models/marts/orders.sql',
    health: { label: 'Draft', tone: 'neutral' as const },
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

  it('keeps execution selection out of the card header while preserving node actions', () => {
    act(() => {
      root.render(<GraphNodeCardView {...BASE_PROPS} />);
    });

    expect(container.querySelector('[data-slot="graph-node-card-play"]')).toBeNull();
    expect(container.querySelector('[data-slot="graph-node-card-actions"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="graph-node-status-chip"]')).toBeNull();
  });

  it('omits the redundant kind row from model cards', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{ ...BASE_PROPS.cardModel, subtitle: null, path: null }}
        />
      );
    });

    expect(container.textContent).toBe('Model 1');
    expect(container.querySelector('[data-slot="graph-node-card-kind"]')).toBeNull();
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

  it('renders subtitle, tags, and operational rail without repeating the backing path', () => {
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
            health: { label: 'Ready', tone: 'healthy' },
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
    expect(container.textContent).toContain('Source');
    expect(container.querySelector('[data-slot="graph-node-card-kind"]')?.textContent).toBe(
      'Source'
    );
    expect(container.textContent).not.toContain('src_public_orders');
    expect(
      container.querySelector('[data-slot="graph-node-card-title"]')?.getAttribute('title')
    ).toBe('src_public_orders');
    expect(container.textContent).toContain('warehouse.public.orders');
    expect(container.textContent).not.toContain('models/sources/src_public.yml');
    expect(container.textContent).toContain('postgres');
    expect(
      container.querySelector('[data-slot="graph-node-tag-list"]')?.getAttribute('data-tone')
    ).toBe('source');
    expect(container.textContent).toContain('Freshness');
    expect(container.textContent).toContain('42 MB/min');
  });

  it('preserves a relation-only subtitle when no file-backed Code metric represents it', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            subtitle: 'RAW.ERP.ORDERS',
            path: 'RAW.ERP.ORDERS',
            metrics: [{ id: 'columns', label: 'Columns', value: '3' }],
          }}
        />
      );
    });

    expect(container.textContent).toContain('RAW.ERP.ORDERS');
  });

  it('suppresses a repeated file subtitle when the Code metric already owns the path', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            subtitle: 'models/marts/orders.sql',
            path: 'models/marts/orders.sql',
            metrics: [
              {
                id: 'code',
                label: 'Code',
                value: 'File',
                detail: 'Code lives in models/marts/orders.sql.',
              },
            ],
          }}
        />
      );
    });

    expect(container.textContent).not.toContain('models/marts/orders.sql');
  });

  it('opens Code from the file metric without bubbling to the node card', () => {
    const onOpenCode = vi.fn();
    const onCardClick = vi.fn();
    act(() => {
      root.render(
        <div onClick={onCardClick}>
          <GraphNodeCardView
            {...BASE_PROPS}
            cardModel={{
              ...BASE_PROPS.cardModel,
              metrics: [
                {
                  id: 'code',
                  label: 'Código',
                  value: 'Archivo',
                  detail: 'El código está en models/sources/src_public.yml.',
                },
              ],
            }}
            onOpenCode={onOpenCode}
          />
        </div>
      );
    });

    const fileAction = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-metric-hotspot"]'
    );
    expect(fileAction?.tagName).toBe('BUTTON');

    act(() => {
      fireEvent.click(fileAction!);
    });

    expect(onOpenCode).toHaveBeenCalledOnce();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('forwards the canonical node id through the generic graph renderer file action', () => {
    const onInspectNode = vi.fn();
    const node: CanonicalNode = {
      id: 'source.auth_audit_events',
      name: 'auth_audit_events',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'success',
      tags: [],
      path: 'models/sources/src_dvt.yml',
      metadata: {},
    };

    act(() => {
      root.render(
        <GraphNodeRenderer
          node={node}
          selected={false}
          hovered={false}
          overlayDecoration={null}
          badges={[]}
          graphNodeCardStrategies={[dvtGraphNodeCardStrategy]}
          data={{
            onInspectNode,
            presentationTruth: {
              columns: { visibleCount: 0, visibleProvenance: 'none' },
              code: {
                kind: 'workspace-file',
                path: 'models/sources/src_dvt.yml',
                language: 'yaml',
              },
            },
          }}
        />
      );
    });

    const fileAction = container.querySelector<HTMLButtonElement>(
      '[data-slot="graph-node-metric-hotspot"]'
    );
    act(() => {
      fireEvent.click(fileAction!);
    });

    expect(onInspectNode).toHaveBeenCalledWith('source.auth_audit_events', 'code');
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
    expect(trigger?.hasAttribute('data-canvas-node-control')).toBe(false);
    expect(trigger?.className).not.toContain('nodrag');
    expect(trigger?.className).not.toContain('nopan');

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

  it.each([
    ['healthy', 'Ready', 'border-green-500', 'border-solid'],
    ['failed', 'Failed', 'border-red-500', 'border-dashed'],
    ['neutral', 'Draft', 'border-slate-700', 'border-solid'],
  ] as const)(
    'uses a %s health border without a visible status chip',
    (tone, label, borderClass, borderStyleClass) => {
      act(() => {
        root.render(
          <GraphNodeCardView
            {...BASE_PROPS}
            cardModel={{
              ...BASE_PROPS.cardModel,
              health: { label, tone },
            }}
          />
        );
      });

      const card = container.querySelector('[data-slot="graph-node-card"]');
      expect(card?.className).toContain(borderClass);
      expect(card?.className).toContain(borderStyleClass);
      expect(card?.className).toContain('focus-within:ring-2');
      expect(container.querySelector('[data-slot="graph-node-status-chip"]')).toBeNull();
    }
  );

  it('keeps selection visible alongside the semantic health border', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          selected
          cardModel={{
            ...BASE_PROPS.cardModel,
            health: { label: 'Ready', tone: 'healthy' },
          }}
        />
      );
    });

    const card = container.querySelector('[data-slot="graph-node-card"]');
    expect(card?.className).toContain('border-green-500');
    expect(card?.className).toContain('ring-2');
  });

  it('keeps overlay decoration on a separate layer from the semantic health border', () => {
    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          overlayStyle={{ borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
          cardModel={{
            ...BASE_PROPS.cardModel,
            health: { label: 'Ready', tone: 'healthy' },
          }}
        />
      );
    });

    const card = container.querySelector<HTMLElement>('[data-slot="graph-node-card"]');
    const overlay = container.querySelector<HTMLElement>('[data-slot="graph-node-overlay-border"]');

    expect(card?.className).toContain('border-green-500');
    expect(card?.style.borderColor).toBe('');
    expect(card?.style.backgroundColor).toBe('rgba(245, 158, 11, 0.08)');
    expect(overlay?.style.borderColor).toBe('rgb(245, 158, 11)');
    expect(overlay?.getAttribute('aria-hidden')).toBe('true');
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

  it('exposes a completed sink result when data inspection is the only rail action', () => {
    const onOpenDataSample = vi.fn();

    act(() => {
      root.render(
        <GraphNodeCardView
          {...BASE_PROPS}
          cardModel={{
            ...BASE_PROPS.cardModel,
            operationalMetrics: [{ id: 'rows', label: 'Rows', value: '3' }],
            operationalDetail: null,
          }}
          dataSampleInteractionLabel="Double-click or press Enter to open the result."
          onOpenDataSample={onOpenDataSample}
        />
      );
    });

    const rail = container.querySelector<HTMLButtonElement>(
      'button[data-slot="graph-node-operational-rail"]'
    );
    expect(rail).not.toBeNull();
    act(() => {
      fireEvent.doubleClick(rail!);
    });

    expect(onOpenDataSample).toHaveBeenCalledOnce();
  });
});
