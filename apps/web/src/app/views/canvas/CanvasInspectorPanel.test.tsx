// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { act } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { IRunsPort } from '../../ports/runs';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

function buildNode(): CanonicalNode {
  return {
    id: 'node_1',
    name: 'orders_source',
    description: 'Orders source table',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

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

function modelerActionButton(container: HTMLElement, actionId: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`[data-action-id="${actionId}"]`);

  if (!button) {
    throw new Error(`Modeler action button not found: ${actionId}`);
  }

  return button;
}

function tabByText(container: HTMLElement, label: string): HTMLButtonElement {
  const tab = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (candidate) => candidate.textContent?.trim() === label
  );

  if (!tab) {
    throw new Error(`Inspector tab not found: ${label}`);
  }

  return tab;
}

async function selectInspectorMoreItem(
  container: HTMLElement,
  itemId: string
): Promise<HTMLElement> {
  const trigger = container.querySelector<HTMLButtonElement>(
    '[data-slot="node-inspector-more-trigger"]'
  );

  expect(trigger).not.toBeNull();

  await act(async () => {
    fireEvent.mouseDown(trigger!, { button: 0, ctrlKey: false });
    fireEvent.pointerDown(trigger!);
    fireEvent.click(trigger!);
  });

  const selector = `[data-slot="node-inspector-more-item-${itemId}"]`;

  await waitFor(() => {
    expect(document.body.querySelector(selector)).not.toBeNull();
  });

  const item = document.body.querySelector<HTMLElement>(selector);

  await act(async () => {
    fireEvent.click(item!);
  });

  return item!;
}

describe('CanvasInspectorPanel', () => {
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

  it('exposes a route-owned editable properties form and applies validated changes', async () => {
    const onApplyNodeDraft = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={buildNode()}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft,
          }}
        />
      );
    });

    const nameInput = container.querySelector('input[name="node-name"]') as HTMLInputElement | null;
    const descriptionInput = container.querySelector(
      'textarea[name="node-description"]'
    ) as HTMLTextAreaElement | null;
    const tagsInput = container.querySelector('input[name="node-tags"]') as HTMLInputElement | null;

    expect(nameInput?.value).toBe('orders_source');
    expect(descriptionInput?.value).toBe('Orders source table');
    expect(tagsInput?.value).toBe('');

    await act(async () => {
      if (nameInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(nameInput, 'orders_source_v2');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (tagsInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(tagsInput, 'finance, critical');
        tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    expect(container.textContent).toContain('Apply');
    expect(container.textContent).toContain('Cancel');

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith({
      name: 'orders_source_v2',
      description: 'Orders source table',
      tags: ['finance', 'critical'],
      dvt: {
        kind: 'source',
        schema: 'public',
        table: 'orders_source',
        alias: 'orders_source',
      },
    });
  });

  it('runs modeler actions from the properties panel through route-owned node handlers', async () => {
    const node = buildDbtModelNode();
    const onDuplicateNode = vi.fn();
    const onToggleNodeSelection = vi.fn();
    const onRemoveNode = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={node}
          nodes={[node]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
            modelerActions: {
              selectedForExecution: false,
              onDuplicateNode,
              onToggleNodeSelection,
              onRemoveNode,
            },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).not.toBeNull();

    await act(async () => {
      fireEvent.click(modelerActionButton(container, 'select-node-for-execution'));
      fireEvent.click(modelerActionButton(container, 'duplicate-node'));
      fireEvent.click(modelerActionButton(container, 'remove-node'));
    });

    expect(onToggleNodeSelection).toHaveBeenCalledWith(node.id, true);
    expect(onDuplicateNode).toHaveBeenCalledWith(node.id);
    expect(onRemoveNode).toHaveBeenCalledWith(node.id);
  });

  it('keeps execution selection available when graph editing is read-only', async () => {
    const node = buildDbtModelNode();
    const onToggleNodeSelection = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={node}
          nodes={[node]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
            modelerActions: {
              selectedForExecution: false,
              onDuplicateNode: vi.fn(),
              onToggleNodeSelection,
              onRemoveNode: vi.fn(),
            },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).not.toBeNull();
    expect(container.querySelector('[data-action-id="select-node-for-execution"]')).not.toBeNull();
    expect(container.querySelector('[data-action-id="duplicate-node"]')).toBeNull();
    expect(container.querySelector('[data-action-id="remove-node"]')).toBeNull();

    await act(async () => {
      fireEvent.click(modelerActionButton(container, 'select-node-for-execution'));
    });

    expect(onToggleNodeSelection).toHaveBeenCalledWith(node.id, true);
  });

  it('does not expose modeler actions when read-only execution selection is unavailable', async () => {
    const node = buildDbtModelNode();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={node}
          nodes={[node]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
            modelerActions: {
              selectedForExecution: false,
              onDuplicateNode: vi.fn(),
              onRemoveNode: vi.fn(),
            },
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).toBeNull();
    expect(container.querySelector('[data-action-id="select-node-for-execution"]')).toBeNull();
    expect(container.querySelector('[data-action-id="duplicate-node"]')).toBeNull();
    expect(container.querySelector('[data-action-id="remove-node"]')).toBeNull();
  });

  it('falls back to general details when the selected node does not expose the active plugin tab', async () => {
    const dbtNode = buildDbtModelNode();
    const dvtNode = buildNode();
    const runsService: IRunsPort = {
      listRunSummaries: vi.fn(async () => []),
      getRunSnapshot: vi.fn(async () => null),
      startRun: vi.fn(async () => ({
        runId: 'run-created',
        accepted: true,
      })),
      listRunEvents: vi.fn(async () => ({ events: [] })),
    };
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const renderInspector = (node: CanonicalNode): JSX.Element => (
      <QueryClientProvider client={queryClient}>
        <AppServicesProvider overrides={{ ...createAppServicesTestOverrides(), runsService }}>
          <CanvasInspectorPanel
            node={node}
            nodes={[dbtNode, dvtNode]}
            edges={[]}
            activeRunId={null}
            onHide={vi.fn()}
            authoring={{
              canEditNode: false,
              onApplyNodeDraft: vi.fn(),
            }}
          />
        </AppServicesProvider>
      </QueryClientProvider>
    );

    await act(async () => {
      root.render(renderInspector(dbtNode));
    });

    await selectInspectorMoreItem(container, 'dbt.history');

    expect(container.querySelector('[data-slot="node-inspector-more-trigger"]')?.textContent).toBe(
      'More: History'
    );

    await act(async () => {
      root.render(renderInspector(dvtNode));
    });

    const tabLabels = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).map(
      (tab) => tab.textContent?.trim()
    );

    expect(tabLabels).not.toContain('History');
    expect(tabByText(container, 'General').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps the form read-only when the route cannot mutate node properties', async () => {
    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={buildNode()}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
    });

    const nameInput = container.querySelector('input[name="node-name"]');
    const tagsInput = container.querySelector('input[name="node-tags"]');
    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    expect(nameInput?.getAttribute('disabled')).not.toBeNull();
    expect(tagsInput?.getAttribute('disabled')).not.toBeNull();
    expect(applyButton).toBeUndefined();
  });

  it('does not flash apply controls when switching the selected node', async () => {
    const firstNode = {
      ...buildDvtNode('dvt:source', {
        config: {
          schema: 'raw',
          table: 'orders',
          alias: 'orders',
        },
      }),
      id: 'source-orders',
      name: 'Orders Source',
    };
    const secondNode = {
      ...buildDvtNode('dvt:source', {
        config: {
          schema: 'raw',
          table: 'customers',
          alias: 'customers',
        },
      }),
      id: 'source-customers',
      name: 'Customers Source',
    };
    const onApplyNodeDraft = vi.fn();
    const renderPanel = (node: CanonicalNode): JSX.Element => (
      <CanvasInspectorPanel
        node={node}
        nodes={[firstNode, secondNode]}
        edges={[]}
        activeRunId={null}
        onHide={vi.fn()}
        authoring={{
          canEditNode: true,
          onApplyNodeDraft,
        }}
      />
    );

    await act(async () => {
      root.render(renderPanel(firstNode));
    });

    const schemaInput = container.querySelector(
      'input[name="dvt-source-schema"]'
    ) as HTMLInputElement | null;

    await act(async () => {
      if (schemaInput != null) {
        fireEvent.input(schemaInput, { target: { value: 'analytics' } });
      }
    });

    expect(container.textContent).toContain('Apply');

    act(() => {
      flushSync(() => {
        root.render(renderPanel(secondNode));
      });

      expect(container.textContent).toContain('Customers Source');
      expect(container.textContent).not.toContain('Apply');
      expect(container.textContent).not.toContain('Cancel');
    });
  });

  it('composes imported source metadata with the route-owned authoring surface', async () => {
    const sourceNode = buildImportedWarehouseSourceNode();
    const transformNode = buildDvtNode('dvt:sql_transform', {
      config: {
        sql: 'select id from {{ source("warehouse_prod_analytics_erp", "orders") }}',
      },
    });
    const sinkNode = buildDvtNode('dvt:sink', {
      config: {
        schema: 'marts',
        table: 'orders_clean',
      },
    });
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'edge-source-transform',
        sourceId: sourceNode.id,
        targetId: transformNode.id,
        relation: 'lineage',
      },
      {
        id: 'edge-transform-sink',
        sourceId: transformNode.id,
        targetId: sinkNode.id,
        relation: 'lineage',
      },
    ];

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={sourceNode}
          nodes={[sourceNode, transformNode, sinkNode]}
          edges={edges}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
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

  it('falls back to general details when the selected plugin tab is unavailable for the next node', async () => {
    const dbtModel = buildDbtModelNode();
    const dvtNode = buildNode();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={dbtModel}
          nodes={[dbtModel, dvtNode]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
    });

    await selectInspectorMoreItem(container, 'dbt.config');

    expect(container.querySelector('[data-slot="node-inspector-general-section"]')).toBeNull();
    expect(container.textContent).toContain('"materialized": "table"');

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={dvtNode}
          nodes={[dbtModel, dvtNode]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
    });

    expect(container.querySelector('[data-slot="node-inspector-general-section"]')).not.toBeNull();
    expect(container.textContent).toContain('orders_source');
    expect(container.textContent).toContain('Node ID');
  });

  it('lets dbt overview tags be edited through the route-owned node draft', async () => {
    const onApplyNodeDraft = vi.fn();
    const model = {
      ...buildDbtModelNode(),
      tags: ['authoring'],
    };

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={model}
          nodes={[model]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft,
          }}
        />
      );
    });

    await selectInspectorMoreItem(container, 'dbt.overview');

    const tagsEditor = container.querySelector('[data-slot="node-inspector-overview-tags-editor"]');
    const newTagInput = tagsEditor?.querySelector(
      'input[name="node-overview-new-tag"]'
    ) as HTMLInputElement | null;

    expect(tagsEditor).not.toBeNull();
    expect(tagsEditor?.textContent).toContain('authoring');
    expect(newTagInput?.value).toBe('');

    await act(async () => {
      if (newTagInput != null) {
        fireEvent.input(newTagInput, { target: { value: 'finance' } });
      }
    });

    const addTagButton = Array.from(tagsEditor?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Add tag')
    );

    expect(addTagButton).not.toBeUndefined();

    await act(async () => {
      addTagButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(tagsEditor?.textContent).toContain('finance');

    const applyButton = Array.from(tagsEditor?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Apply tags')
    );

    expect(applyButton).not.toBeUndefined();

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['authoring', 'finance'],
        dbt: expect.objectContaining({
          packageName: 'analytics',
        }),
      })
    );
  });
});
