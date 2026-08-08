// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { DvtAuthoringFields } from './DvtAuthoringFields';

function buildDvtNode(
  kind: 'dvt:source' | 'dvt:sql_transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `dvt-${kind.replace('dvt:', '').replace('_', '-')}`,
    name: kind === 'dvt:sql_transform' ? 'Clean Orders' : 'Orders',
    pluginId: 'dvt',
    kind,
    role: kind === 'dvt:source' ? 'input' : kind === 'dvt:sink' ? 'output' : 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

function buildImportedWarehouseSourceNode(): CanonicalNode {
  return {
    id: 'src_warehouse_prod_analytics_erp_orders',
    name: 'src_warehouse_prod_analytics_erp_orders',
    description: 'Imported source for analytics.erp.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'erp'],
    path: 'models/sources/src_erp.yml',
    metadata: {
      sourceName: 'warehouse_prod_analytics_erp',
      tableName: 'orders',
      database: 'analytics',
      schema: 'erp',
      columns: [{ name: 'id', type: 'number', nullable: false }],
    },
  };
}

function buildEdge(sourceId: string, targetId: string): CanonicalEdge {
  return {
    id: `${sourceId}-${targetId}`,
    sourceId,
    targetId,
    relation: 'lineage',
  };
}

function DvtAuthoringFieldsHarness({
  node,
  nodes = [node],
  edges = [],
}: Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
}>): JSX.Element {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const errors = validateCanvasInspectorNodeDraft(draft);

  return (
    <>
      <DvtAuthoringFields
        node={node}
        nodes={nodes}
        edges={edges}
        disabled={false}
        draft={draft}
        errors={errors}
        onChange={setDraft}
      />
      <output data-slot="dvt-draft-json">{JSON.stringify(draft.dvt)}</output>
    </>
  );
}

describe('DvtAuthoringFields', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function renderFields(
    node: CanonicalNode,
    graph?: Readonly<{ nodes: readonly CanonicalNode[]; edges: readonly CanonicalEdge[] }>
  ): void {
    act(() => {
      root.render(
        <DvtAuthoringFieldsHarness node={node} nodes={graph?.nodes} edges={graph?.edges} />
      );
    });
  }

  function draftJson(): string {
    return container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
  }

  it('renders imported source target metadata and updates the source alias draft', () => {
    renderFields(buildImportedWarehouseSourceNode());

    const schemaInput = container.querySelector(
      'input[name="dvt-source-schema"]'
    ) as HTMLInputElement | null;
    const tableInput = container.querySelector(
      'input[name="dvt-source-table"]'
    ) as HTMLInputElement | null;
    const aliasInput = container.querySelector(
      'input[name="dvt-source-alias"]'
    ) as HTMLInputElement | null;

    expect(container.textContent).toContain('DVT source');
    expect(container.textContent).toContain('analytics.erp.orders');
    expect(schemaInput?.value).toBe('erp');
    expect(tableInput?.value).toBe('orders');
    expect(aliasInput?.value).toBe('warehouse_prod_analytics_erp');

    act(() => {
      fireEvent.input(aliasInput!, { target: { value: 'orders_src' } });
    });

    expect(draftJson()).toContain('"alias":"orders_src"');
  });

  it('renders SQL transform feedback and updates the SQL draft', () => {
    renderFields(
      buildDvtNode('dvt:sql_transform', {
        config: {
          sql: 'select * from public.orders',
        },
      })
    );

    const sqlTextarea = container.querySelector(
      'textarea[name="dvt-transform-sql"]'
    ) as HTMLTextAreaElement | null;

    expect(container.textContent).toContain('DVT SQL transform');
    expect(container.textContent).toContain('1 line');
    expect(sqlTextarea?.value).toBe('select * from public.orders');

    act(() => {
      fireEvent.input(sqlTextarea!, { target: { value: 'select id from public.orders' } });
    });

    expect(draftJson()).toContain('"sql":"select id from public.orders"');
  });

  it('renders connected source columns as selectable DVT transform inputs', () => {
    const source = buildImportedWarehouseSourceNode();
    const transform = buildDvtNode('dvt:sql_transform', {
      config: {
        sql: 'select id from analytics.erp.orders',
        selectedColumns: [`${source.id}.id`],
      },
    });

    renderFields(transform, {
      nodes: [source, transform],
      edges: [buildEdge(source.id, transform.id)],
    });

    const selectedColumn = container.querySelector(
      `input[name="dvt-transform-column"][value="${source.id}.id"]`
    ) as HTMLInputElement | null;

    expect(container.textContent).toContain('Columns (Input)');
    expect(container.textContent).toContain('src_warehouse_prod_analytics_erp_orders');
    expect(container.textContent).toContain('id');
    expect(container.textContent).toContain('number');
    expect(selectedColumn?.checked).toBe(true);

    act(() => {
      fireEvent.click(selectedColumn!);
    });

    expect(draftJson()).toContain('"selectedColumns":[]');
  });

  it('renders sink destination posture and updates materialization controls', () => {
    renderFields(
      buildDvtNode('dvt:sink', {
        config: {
          database: 'analytics_prod',
          schema: 'marts',
          table: 'orders_daily',
          materialization: 'view',
          writeMode: 'append',
          partitionStrategy: 'daily_by_order_date',
        },
      })
    );

    const databaseInput = container.querySelector(
      'input[name="dvt-sink-database"]'
    ) as HTMLInputElement | null;
    const materializationSelect = container.querySelector(
      'select[name="dvt-sink-materialization"]'
    ) as HTMLSelectElement | null;
    const writeModeSelect = container.querySelector(
      'select[name="dvt-sink-write-mode"]'
    ) as HTMLSelectElement | null;
    const partitionStrategyInput = container.querySelector(
      'input[name="dvt-sink-partition-strategy"]'
    ) as HTMLInputElement | null;

    expect(container.textContent).toContain('DVT sink');
    expect(container.textContent).toContain('analytics_prod.marts.orders_daily');
    expect(databaseInput?.value).toBe('analytics_prod');
    expect(materializationSelect?.value).toBe('view');
    expect(writeModeSelect?.value).toBe('append');
    expect(partitionStrategyInput?.value).toBe('daily_by_order_date');

    act(() => {
      fireEvent.input(databaseInput!, { target: { value: 'analytics_stage' } });
      fireEvent.change(materializationSelect!, { target: { value: 'table' } });
      fireEvent.change(writeModeSelect!, { target: { value: 'replace' } });
      fireEvent.input(partitionStrategyInput!, { target: { value: 'none' } });
    });

    expect(draftJson()).toContain('"database":"analytics_stage"');
    expect(draftJson()).toContain('"materialization":"table"');
    expect(draftJson()).toContain('"writeMode":"replace"');
    expect(draftJson()).toContain('"partitionStrategy":"none"');
  });
});
