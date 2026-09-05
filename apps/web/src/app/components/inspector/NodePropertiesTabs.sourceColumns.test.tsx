// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { NodePropertiesTabs } from './NodePropertiesTabs';
import type { NodePropertiesReadModel } from './nodePropertiesReadModel';

const sourceNode: CanonicalNode = {
  id: 'src-orders',
  name: 'Orders Source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [
      { name: 'id', type: 'uuid', nullable: false },
      { name: 'payload', type: 'jsonb', nullable: true },
    ],
    constraints: [{ kind: 'primary-key', columns: ['id'] }],
  },
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

const columnsModel: NodePropertiesReadModel = {
  nodeId: sourceNode.id,
  nodeName: sourceNode.name,
  sections: [
    {
      id: 'columns',
      label: 'Columns',
      rows: [],
      tableRows: [
        { id: 'id', cells: { name: 'id', type: 'uuid', nullable: 'not null', key: 'PK' } },
        { id: 'payload', cells: { name: 'payload', type: 'jsonb', nullable: 'nullable' } },
      ],
    },
  ],
};

describe('NodePropertiesTabs Source Columns presentation', () => {
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

  function render(node: CanonicalNode): void {
    act(() => {
      root.render(
        <NodePropertiesTabs
          node={node}
          model={{ ...columnsModel, nodeId: node.id, nodeName: node.name }}
          activeRunId={null}
          panels={[]}
          activeTab="columns"
          primarySectionIds={['columns']}
          moreLabel="More"
          surface="workbench"
          onActiveTabChange={vi.fn()}
          onHide={vi.fn()}
        />
      );
    });
  }

  it('hard-cuts imported Source Columns to scanner/detail without changing tab count', () => {
    render(sourceNode);

    expect(container.querySelector('[data-slot="canvas-source-columns"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-property-column-disclosure"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-tab-columns"]')?.textContent).toContain(
      '2'
    );
  });

  it('preserves the shared accordion presentation for non-Source workbench columns', () => {
    render(genericNode);

    expect(container.querySelector('[data-slot="canvas-source-columns"]')).toBeNull();
    expect(container.querySelector('[data-slot="node-property-column-disclosure"]')).not.toBeNull();
  });
});
