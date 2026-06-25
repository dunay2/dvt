// @vitest-environment jsdom

/** Owned concern: prove CanvasNodeWorkbenchPanel presents governed node metadata directly. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const SOURCE_NODE: CanonicalNode = {
  id: 'source.orders',
  name: 'Orders Source',
  description: 'Raw orders table',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['raw'],
  metadata: {
    database: 'analytics',
    schema: 'raw',
    tableName: 'orders',
    rowCount: 1500,
    sizeLabel: '42 MB',
    columns: [
      {
        name: 'order_id',
        type: 'integer',
        nullable: false,
        primaryKey: true,
        description: 'Warehouse order id',
      },
      {
        name: 'discount_code',
        type: 'text',
        nullable: true,
      },
    ],
    tests: [
      {
        name: 'not_null_orders_order_id',
        type: 'not_null',
        targetModel: 'orders',
        column: 'order_id',
        severity: 'error',
      },
    ],
  },
};

const MODEL_NODE: CanonicalNode = {
  id: 'model.orders',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const EDGES: readonly CanonicalEdge[] = [
  {
    id: 'edge-source-model',
    sourceId: SOURCE_NODE.id,
    targetId: MODEL_NODE.id,
    relation: 'lineage',
  },
];

function renderPanel(root: Root, preferredTabId: string | null = null): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchPanel
        node={SOURCE_NODE}
        nodes={[SOURCE_NODE, MODEL_NODE]}
        edges={EDGES}
        activeRunId={null}
        registeredPlugins={new Set()}
        preferredTabId={preferredTabId}
        preferredTabRequestId={1}
        authoring={{
          canEditNode: true,
          onApplyNodeDraft: vi.fn(),
        }}
        onClose={vi.fn()}
      />
    );
  });
}

describe('CanvasNodeWorkbenchPanel', () => {
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

  it('composes the shared node properties presentation component instead of duplicating it', () => {
    expect(CanvasNodeWorkbenchPanelSource).toContain('NodePropertiesTabs');
    expect(CanvasNodeWorkbenchPanelSource).not.toContain('function renderSectionBody');
    expect(CanvasNodeWorkbenchPanelSource).not.toContain('PRIMARY_NODE_WORKBENCH_SECTION_IDS');
  });

  it('renders primary text tabs and a More menu without tab icons', () => {
    renderPanel(root);

    const tabsList = container.querySelector('[data-slot="canvas-node-workbench-tabs-list"]');
    expect(tabsList).not.toBeNull();
    expect(tabsList?.querySelectorAll('svg')).toHaveLength(0);

    for (const label of ['General', 'Columns', 'Inputs / Outputs', 'Tests', 'Code', 'More']) {
      expect(tabsList?.textContent).toContain(label);
    }
  });

  it('shows column metadata, graph IO, and test target semantics from the node read model', () => {
    renderPanel(root, 'columns');

    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('integer');
    expect(container.textContent).toContain('not null');
    expect(container.textContent).toContain('Warehouse order id');

    renderPanel(root, 'inputs-outputs');
    expect(container.textContent).toContain('Output');
    expect(container.textContent).toContain('Orders Model');

    renderPanel(root, 'tests');
    expect(container.textContent).toContain('not_null_orders_order_id');
    expect(container.textContent).toContain('orders');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('error');
  });

  it('keeps editable node properties inside the workbench general section', () => {
    renderPanel(root, 'general');

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    expect(generalSection).not.toBeNull();
    expect(generalSection?.textContent).toContain('Name');
    expect(generalSection?.querySelector('input[name="node-name"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-node-workbench-authoring"]')).not.toBeNull();
  });
});
