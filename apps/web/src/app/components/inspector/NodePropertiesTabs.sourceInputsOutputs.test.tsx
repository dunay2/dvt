// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { NodePropertiesTabs } from './NodePropertiesTabs';
import type { NodePropertiesReadModel } from './nodePropertiesContracts';
import { buildNodePropertiesReadModel } from './nodePropertiesReadModel';

const sourceNode: CanonicalNode = {
  id: 'src-orders',
  name: 'Orders Source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
};

const genericNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const inputsOutputsModel: NodePropertiesReadModel = {
  nodeId: sourceNode.id,
  nodeName: sourceNode.name,
  sections: [
    {
      id: 'inputs-outputs',
      label: 'Inputs / Outputs',
      rows: [],
      tableRows: [
        {
          id: 'output:edge-1',
          cells: {
            direction: 'Output',
            node: 'Model 1',
            nodeId: 'model-1',
            relation: 'lineage',
          },
        },
      ],
    },
  ],
};

describe('NodePropertiesTabs Source Inputs / Outputs presentation', () => {
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
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  function render(node: CanonicalNode, model: NodePropertiesReadModel = inputsOutputsModel): void {
    act(() => {
      root.render(
        <NodePropertiesTabs
          node={node}
          model={{ ...model, nodeId: node.id, nodeName: node.name }}
          activeRunId={null}
          panels={[]}
          activeTab="inputs-outputs"
          primarySectionIds={['inputs-outputs']}
          moreLabel="More"
          surface="workbench"
          onActiveTabChange={vi.fn()}
          onHide={vi.fn()}
        />
      );
    });
  }

  it('uses the Source master/detail body without changing the tab count', () => {
    render(sourceNode);

    expect(container.querySelector('[data-slot="canvas-source-inputs-outputs"]')).not.toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(
      container.querySelector('[data-slot="node-inspector-tab-inputs-outputs"]')?.textContent
    ).toContain('1');
  });

  it('uses compact business relationship summaries for non-Source nodes', () => {
    render(genericNode);

    expect(container.querySelector('[data-slot="canvas-source-inputs-outputs"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-property-relationship-list"]')).not.toBeNull();
    expect(container.querySelector('table')).toBeNull();
    expect(
      container.querySelector('[data-slot="node-property-relationship-summary"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="node-property-relationship-node"]')?.textContent
    ).toBe('Model 1');
    expect(container.textContent).not.toContain('model-1');
  });

  it('keeps actual Input and Output edge identity private in the shared Model list', () => {
    const input = { ...sourceNode, id: 'private-input-identity', name: 'client' };
    const output = { ...genericNode, id: 'private-output-identity', name: 'published_orders' };
    const model = buildNodePropertiesReadModel({
      node: genericNode,
      nodes: [input, genericNode, output],
      edges: [
        {
          id: 'private-input-edge',
          sourceId: input.id,
          targetId: genericNode.id,
          relation: 'lineage',
        },
        {
          id: 'private-output-edge',
          sourceId: genericNode.id,
          targetId: output.id,
          relation: 'lineage',
        },
      ],
    });
    const original = structuredClone(model);
    render(genericNode, model);
    const rows = [
      ...container.querySelectorAll('[data-slot="node-property-relationship-summary"]'),
    ];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => [...row.children].map((cell) => cell.textContent))).toEqual([
      ['Input', 'client', 'lineage'],
      ['Output', 'published_orders', 'lineage'],
    ]);
    expect(container.textContent).not.toContain(input.id);
    expect(container.textContent).not.toContain(output.id);
    expect(container.textContent).not.toContain('private-input-edge');
    expect(container.textContent).not.toContain('private-output-edge');
    expect(model).toEqual(original);
  });
});
