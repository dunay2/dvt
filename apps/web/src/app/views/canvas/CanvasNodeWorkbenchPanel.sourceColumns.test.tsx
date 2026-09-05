// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';

const SOURCE: CanonicalNode = {
  id: 'source.orders',
  name: 'Orders Source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-prod',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/raw/orders',
    },
    schema: 'raw',
    tableName: 'orders',
    columns: [
      { name: 'order_id', type: 'uuid', nullable: false, primaryKey: true },
      { name: 'metadata', type: 'jsonb', nullable: true },
    ],
  },
};

const MODEL: CanonicalNode = {
  id: 'model.orders',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    columns: [
      { name: 'order_id', type: 'uuid', nullable: false },
      { name: 'total', type: 'numeric(12,2)', nullable: false },
    ],
  },
};

function renderNode(root: Root, node: CanonicalNode): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchPanel
        node={node}
        nodes={[node]}
        edges={[]}
        activeRunId={null}
        preferredTabId="columns"
        preferredTabRequestId={1}
        authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
        onClose={vi.fn()}
      />
    );
  });
}

describe('CanvasNodeWorkbenchPanel Source Columns integration', () => {
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

  it('uses the approved master/detail body and keeps the authoritative tab count for warehouse Source', () => {
    renderNode(root, SOURCE);

    const columnsTab = container.querySelector('[data-slot="canvas-node-workbench-tab-columns"]');
    expect(columnsTab?.textContent).toContain('Columns');
    expect(columnsTab?.textContent).toContain('2');
    expect(container.querySelector('[data-slot="canvas-source-columns"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-slot="canvas-source-column-row"]')).toHaveLength(2);
    expect(container.querySelector('[data-slot="node-property-column-record"]')).toBeNull();
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('uuid');
  });

  it('leaves non-Source Columns on the shared generic section renderer', () => {
    renderNode(root, MODEL);

    expect(container.querySelector('[data-slot="canvas-source-columns"]')).toBeNull();
    expect(container.querySelectorAll('[data-slot="node-property-column-record"]')).toHaveLength(2);
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('total');
  });
});
