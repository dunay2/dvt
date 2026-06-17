// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDvtInspectorNode,
  buildImportedSourceEdges,
  buildImportedWarehouseSourceNode,
  renderInspectorPanel,
} from './CanvasInspectorPanel.test.support';

describe('CanvasInspectorPanel metadata composition', () => {
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

  it('composes imported source metadata with the route-owned authoring surface', async () => {
    const sourceNode = buildImportedWarehouseSourceNode();
    const transformNode = buildDvtInspectorNode('dvt:sql_transform', {
      config: {
        sql: 'select id from {{ source("warehouse_prod_analytics_erp", "orders") }}',
      },
    });
    const sinkNode = buildDvtInspectorNode('dvt:sink', {
      config: {
        schema: 'marts',
        table: 'orders_clean',
      },
    });

    await act(async () => {
      renderInspectorPanel(root, {
        node: sourceNode,
        nodes: [sourceNode, transformNode, sinkNode],
        edges: buildImportedSourceEdges(sourceNode, transformNode, sinkNode),
        authoring: {
          canEditNode: true,
          onApplyNodeDraft: vi.fn(),
        },
      });
    });

    expect(container.querySelector('[data-slot="node-inspector-core-tabs"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="node-inspector-general-section"]')).not.toBeNull();
    expect(container.textContent).toContain('Editable properties');
    expect(container.textContent).toContain('Imported source for analytics.erp.orders');
    expect(container.textContent).toContain('models/sources/src_erp.yml');
    expect(container.textContent).toContain('warehouse_prod_analytics_erp');
    expect(container.textContent).toContain('analytics');
    expect(container.textContent).toContain('erp');
    expect(container.textContent).toContain('orders');
    expect(container.textContent).not.toContain('No plugin inspector panels are registered');
  });
});
