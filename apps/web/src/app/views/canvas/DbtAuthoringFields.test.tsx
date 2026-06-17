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
    },
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
  const errors = validateCanvasInspectorNodeDraft(draft);

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
      <output data-slot="dbt-draft-json">{JSON.stringify(draft.dbt)}</output>
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

    expect(container.querySelector('[data-slot="dbt-generated-model-sql"]')?.textContent).toContain(
      "{{ source('raw', 'orders') }}"
    );
    expect(originSelect.value).toBe(sourceA.id);
    expect(materializedSelect.value).toBe('view');

    act(() => {
      fireEvent.change(originSelect, { target: { value: sourceB.id } });
      fireEvent.change(materializedSelect, { target: { value: 'table' } });
    });

    expect(container.querySelector('[data-slot="dbt-generated-model-sql"]')?.textContent).toContain(
      "{{ source('staging', 'orders') }}"
    );
    expect(draftJson()).toContain('"selectedSourceId":"source-b"');
    expect(draftJson()).toContain('"materialized":"table"');
  });
});
