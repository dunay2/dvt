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
import { DbtAuthoringFields } from './DbtAuthoringFields';

function buildDbtSourceNode(id: string, name: string, sourceName: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dbt',
    kind: 'dbt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        sourceName,
        schemaName: 'raw',
        tableName: 'orders',
      },
    },
  };
}

function buildDbtModelNode(): CanonicalNode {
  return {
    id: 'model-orders',
    name: 'Orders Model',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        materialized: 'view',
      },
      columns: [
        { name: 'order_id', type: 'bigint' },
        { name: 'amount', type: 'numeric' },
      ],
    },
  };
}

function buildDbtTestNode(): CanonicalNode {
  return {
    id: 'test-orders-key',
    name: 'Orders key required',
    pluginId: 'dbt',
    kind: 'dbt:test',
    role: 'check',
    status: 'idle',
    tags: [],
  };
}

function DbtAuthoringFieldsHarness({
  node,
  nodes,
  edges,
}: Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>): JSX.Element {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const errors = validateCanvasInspectorNodeDraft(draft, { node, nodes, edges });

  return (
    <>
      <DbtAuthoringFields
        node={node}
        nodes={nodes}
        edges={edges}
        disabled={false}
        draft={draft}
        errors={errors}
        onChange={setDraft}
      />
      <output data-slot="dbt-draft-json">{JSON.stringify(draft)}</output>
    </>
  );
}

describe('DbtAuthoringFields', () => {
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
    nodes: readonly CanonicalNode[] = [node],
    edges: readonly CanonicalEdge[] = []
  ): void {
    act(() => {
      root.render(<DbtAuthoringFieldsHarness node={node} nodes={nodes} edges={edges} />);
    });
  }

  function draftJson(): string {
    return container.querySelector('[data-slot="dbt-draft-json"]')?.textContent ?? '';
  }

  it('renders dbt source identity fields and updates the table draft', () => {
    renderFields(buildDbtSourceNode('source-a', 'Raw Orders', 'raw_orders'));

    const sourceInput = container.querySelector('input[name="dbt-source"]') as HTMLInputElement;
    const schemaInput = container.querySelector('input[name="dbt-schema"]') as HTMLInputElement;
    const tableInput = container.querySelector('input[name="dbt-table"]') as HTMLInputElement;

    expect(container.textContent).toContain('dbt card');
    expect(sourceInput.value).toBe('raw_orders');
    expect(schemaInput.value).toBe('raw');
    expect(tableInput.value).toBe('orders');

    act(() => {
      fireEvent.input(tableInput, { target: { value: 'orders_archive' } });
    });

    expect(draftJson()).toContain('"tableName":"orders_archive"');
  });

  it('lets dbt models choose connected origins and materialization without Inspector coupling', () => {
    const sourceA = buildDbtSourceNode('source-a', 'Raw Orders', 'raw');
    const sourceB = buildDbtSourceNode('source-b', 'Staging Orders', 'staging');
    const model = buildDbtModelNode();
    const edges: readonly CanonicalEdge[] = [
      { id: 'edge-a-model', sourceId: sourceA.id, targetId: model.id, relation: 'lineage' },
      { id: 'edge-b-model', sourceId: sourceB.id, targetId: model.id, relation: 'lineage' },
    ];

    renderFields(model, [sourceA, sourceB, model], edges);

    const originSelect = container.querySelector('select[name="dbt-origin"]') as HTMLSelectElement;
    const materializedSelect = container.querySelector(
      'select[name="dbt-materialized"]'
    ) as HTMLSelectElement;

    expect(container.querySelector('[data-slot="dbt-generated-model-sql"]')).toBeNull();
    expect(originSelect.value).toBe('');
    expect(originSelect.selectedOptions[0]?.textContent).toBe('Select a connected origin');
    expect(materializedSelect.value).toBe('view');

    act(() => {
      fireEvent.change(originSelect, { target: { value: sourceB.id } });
      fireEvent.change(materializedSelect, { target: { value: 'table' } });
    });

    expect(draftJson()).toContain('"selectedSourceId":"source-b"');
    expect(draftJson()).toContain('"materialized":"table"');
  });

  it('authors an executable DBT validation against connected model columns', () => {
    const model = buildDbtModelNode();
    const test = buildDbtTestNode();
    const edges: readonly CanonicalEdge[] = [
      { id: 'edge-model-test', sourceId: model.id, targetId: test.id, relation: 'validation' },
    ];

    renderFields(test, [model, test], edges);

    const targetSelect = container.querySelector('select[name="dbt-test-target"]');
    const typeSelect = container.querySelector('select[name="dbt-test-type"]');
    const columnInput = container.querySelector('input[name="dbt-test-column"]');
    const severitySelect = container.querySelector('select[name="dbt-test-severity"]');

    expect(targetSelect).toBeInstanceOf(HTMLSelectElement);
    expect((targetSelect as HTMLSelectElement).value).toBe(model.id);
    expect(container.querySelector('option[value="order_id"]')).not.toBeNull();
    expect(container.querySelector('input[name="dbt-package"]')).toBeNull();

    act(() => {
      fireEvent.change(typeSelect as HTMLSelectElement, { target: { value: 'unique' } });
      fireEvent.input(columnInput as HTMLInputElement, { target: { value: 'order_id' } });
      fireEvent.change(severitySelect as HTMLSelectElement, { target: { value: 'warn' } });
    });

    expect(draftJson()).toContain(
      '"dbtTest":{"testType":"unique","targetModelId":"model-orders","targetColumn":"order_id","severity":"warn"}'
    );
  });

  it('revalidates an existing DBT test column when the connected target changes', () => {
    const ordersModel = buildDbtModelNode();
    const customersModel: CanonicalNode = {
      ...ordersModel,
      id: 'model-customers',
      name: 'Customers Model',
      metadata: {
        ...ordersModel.metadata,
        columns: [
          { name: 'order_id', type: 'bigint' },
          { name: 'customer_id', type: 'bigint' },
        ],
      },
    };
    const test = buildDbtTestNode();
    const edges: readonly CanonicalEdge[] = [ordersModel, customersModel].map((model) => ({
      id: `edge-${model.id}-${test.id}`,
      sourceId: model.id,
      targetId: test.id,
      relation: 'validation',
    }));

    renderFields(test, [ordersModel, customersModel, test], edges);

    const targetSelect = container.querySelector(
      'select[name="dbt-test-target"]'
    ) as HTMLSelectElement;
    const columnInput = container.querySelector(
      'input[name="dbt-test-column"]'
    ) as HTMLInputElement;

    act(() => {
      fireEvent.input(columnInput, { target: { value: 'amount' } });
      fireEvent.change(targetSelect, { target: { value: customersModel.id } });
    });

    expect(draftJson()).toContain('"targetColumn":"amount"');
    expect(container.querySelector('option[value="customer_id"]')).not.toBeNull();
    expect(container.querySelector('option[value="amount"]')).toBeNull();
    expect(container.textContent).toContain('Select a column declared by the connected DBT model.');

    act(() => {
      fireEvent.input(columnInput, { target: { value: 'order_id' } });
    });

    expect(container.textContent).not.toContain(
      'Select a column declared by the connected DBT model.'
    );
  });
});
