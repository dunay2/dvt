// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
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

  it('does not expose execution selection when the inspector is read-only', async () => {
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

    expect(container.querySelector('[data-slot="node-inspector-modeler-actions"]')).toBeNull();
    expect(container.querySelector('[data-action-id="select-node-for-execution"]')).toBeNull();
    expect(container.querySelector('[data-action-id="duplicate-node"]')).toBeNull();
    expect(container.querySelector('[data-action-id="remove-node"]')).toBeNull();
    expect(onToggleNodeSelection).not.toHaveBeenCalled();
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

    await act(async () => {
      fireEvent.mouseDown(tabByText(container, 'History'), { button: 0 });
    });

    expect(tabByText(container, 'History').getAttribute('aria-selected')).toBe('true');

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

  it('shows active canvas properties when no node is selected and applies a rename', async () => {
    const onApplyCanvasPatch = vi.fn();
    const onDeleteCanvas = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={{
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            environmentId: 'dev',
            defaultPermission: 'write',
            executionEnvironmentOptions: [
              { value: 'dev', label: 'Development' },
              { value: 'prod', label: 'Production' },
            ],
            canEdit: true,
            canDelete: true,
            onApplyCanvasPatch,
            onDeleteCanvas,
          }}
        />
      );
    });

    const titleInput = container.querySelector(
      'input[name="canvas-title"]'
    ) as HTMLInputElement | null;
    const environmentSelect = container.querySelector(
      'select[name="canvas-environment"]'
    ) as HTMLSelectElement | null;

    expect(container.textContent).toContain('Canvas properties');
    expect(titleInput?.value).toBe('Modeling');
    expect(container.textContent).toContain('canvas-modeling');
    expect(environmentSelect?.value).toBe('dev');

    await act(async () => {
      if (titleInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(titleInput, 'Modeling v2');
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyCanvasPatch).toHaveBeenCalledWith({
      title: 'Modeling v2',
    });

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete')
    );

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDeleteCanvas).toHaveBeenCalledTimes(1);
  });

  it('lets the active canvas select its execution environment from the inspector', async () => {
    const onApplyCanvasPatch = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={{
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            environmentId: 'dev',
            defaultPermission: 'write',
            executionEnvironmentOptions: [
              { value: 'dev', label: 'Development' },
              { value: 'stage', label: 'Staging' },
              { value: 'prod', label: 'Production' },
            ],
            canEdit: true,
            canDelete: true,
            onApplyCanvasPatch,
            onDeleteCanvas: vi.fn(),
          }}
        />
      );
    });

    const environmentSelect = container.querySelector(
      'select[name="canvas-environment"]'
    ) as HTMLSelectElement | null;

    expect(environmentSelect?.value).toBe('dev');
    expect(
      Array.from(environmentSelect?.options ?? []).map((option) => option.textContent)
    ).toEqual(['Development', 'Staging', 'Production']);

    await act(async () => {
      if (environmentSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(environmentSelect, 'prod');
        environmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyCanvasPatch).toHaveBeenCalledWith({
      environmentId: 'prod',
    });
  });

  it('keeps canvas properties read-only when the route cannot mutate canvases', async () => {
    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={{
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            executionEnvironmentOptions: [{ value: 'dev', label: 'Development' }],
            canEdit: false,
            canDelete: false,
            onApplyCanvasPatch: vi.fn(),
            onDeleteCanvas: vi.fn(),
          }}
        />
      );
    });

    const titleInput = container.querySelector('input[name="canvas-title"]');
    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete')
    );

    expect(titleInput?.getAttribute('disabled')).not.toBeNull();
    expect(deleteButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('lets dbt model cards select origin and materialization through the route-owned draft', async () => {
    const onApplyNodeDraft = vi.fn();
    const sourceA = buildDbtSourceNode('source-raw-orders', 'Raw Orders', 'raw');
    const sourceB = buildDbtSourceNode('source-staging-orders', 'Staging Orders', 'staging');
    const model = buildDbtModelNode();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={model}
          nodes={[sourceA, sourceB, model]}
          edges={[
            {
              id: 'edge-raw-model',
              sourceId: sourceA.id,
              targetId: model.id,
              relation: 'lineage',
            },
            {
              id: 'edge-staging-model',
              sourceId: sourceB.id,
              targetId: model.id,
              relation: 'lineage',
            },
          ]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft,
          }}
        />
      );
    });

    const originSelect = container.querySelector(
      'select[name="dbt-origin"]'
    ) as HTMLSelectElement | null;
    const materializedSelect = container.querySelector(
      'select[name="dbt-materialized"]'
    ) as HTMLSelectElement | null;
    const generatedSqlPreview = container.querySelector('[data-slot="dbt-generated-model-sql"]');

    expect(generatedSqlPreview?.textContent).toContain("{{ source('raw', 'orders') }}");

    await act(async () => {
      if (originSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(originSelect, sourceB.id);
        originSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (materializedSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(materializedSelect, 'table');
        materializedSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(generatedSqlPreview?.textContent).toContain("{{ source('staging', 'orders') }}");

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dbt: expect.objectContaining({
          materialized: 'table',
          selectedSourceId: sourceB.id,
        }),
      })
    );
  });

  it('lets DVT source nodes configure source schema, table, and alias before preview', async () => {
    const onApplyNodeDraft = vi.fn();
    const sourceNode = buildDvtNode('dvt:source', {
      config: {
        schema: 'public',
        table: 'orders',
        alias: 'orders_raw',
      },
    });

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={sourceNode}
          nodes={[sourceNode]}
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
    expect(schemaInput?.value).toBe('public');
    expect(tableInput?.value).toBe('orders');
    expect(aliasInput?.value).toBe('orders_raw');

    await act(async () => {
      if (schemaInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(schemaInput, 'analytics');
        schemaInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dvt: {
          kind: 'source',
          schema: 'analytics',
          table: 'orders',
          alias: 'orders_raw',
        },
      })
    );
  });

  it('lets imported warehouse source nodes configure source schema, table, and alias before preview', async () => {
    const onApplyNodeDraft = vi.fn();
    const sourceNode = buildImportedWarehouseSourceNode();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={sourceNode}
          nodes={[sourceNode]}
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
    expect(schemaInput?.value).toBe('erp');
    expect(tableInput?.value).toBe('orders');
    expect(aliasInput?.value).toBe('warehouse_prod_analytics_erp');

    await act(async () => {
      if (aliasInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(aliasInput, 'orders_src');
        aliasInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dvt: {
          kind: 'source',
          schema: 'erp',
          table: 'orders',
          alias: 'orders_src',
        },
      })
    );
  });

  it('shows useful imported source metadata, columns, and graph context in the right panel', async () => {
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
    const tabsList = container.querySelector('[data-slot="node-inspector-core-tabs-list"]');
    expect(tabsList).not.toBeNull();
    expect(tabsList?.getAttribute('class')).toContain('border-b');
    expect(tabsList?.getAttribute('class')).not.toContain('rounded-lg');
    expect(container.querySelector('[data-slot="node-inspector-general-section"]')).not.toBeNull();
    expect(container.textContent).toContain('General');
    expect(container.textContent).toContain('Columns');
    expect(container.textContent).toContain('Summary');
    expect(container.textContent).toContain('Keys');
    expect(container.textContent).toContain('Indexes');
    expect(container.textContent).toContain('Foreign Keys');
    expect(container.textContent).toContain('Constraints');
    expect(container.textContent).not.toContain('Node details');
    expect(container.textContent).toContain('Editable properties');
    expect(container.textContent).toContain('Imported source for analytics.erp.orders');
    expect(container.textContent).toContain('models/sources/src_erp.yml');
    expect(container.textContent).toContain('warehouse_prod_analytics_erp');
    expect(container.textContent).toContain('analytics');
    expect(container.textContent).toContain('erp');
    expect(container.textContent).toContain('orders');
    expect(container.textContent).toContain('source');

    const columnsTab = container.querySelector<HTMLButtonElement>(
      '[data-slot="node-inspector-tab-columns"]'
    );
    expect(columnsTab).not.toBeNull();

    await act(async () => {
      fireEvent.mouseDown(columnsTab!, { button: 0, ctrlKey: false });
      fireEvent.click(columnsTab!);
    });

    expect(container.querySelector('[data-slot="node-inspector-columns-section"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="node-inspector-columns-section"] table')
    ).not.toBeNull();
    expect(container.textContent).toContain('id');
    expect(container.textContent).toContain('number');

    const summaryTab = container.querySelector<HTMLButtonElement>(
      '[data-slot="node-inspector-tab-summary"]'
    );
    expect(summaryTab).not.toBeNull();

    await act(async () => {
      fireEvent.mouseDown(summaryTab!, { button: 0, ctrlKey: false });
      fireEvent.click(summaryTab!);
    });

    expect(container.querySelector('[data-slot="node-inspector-summary-section"]')).not.toBeNull();
    expect(container.textContent).toContain('Downstream nodes');
    expect(container.textContent).toContain('Clean Orders');
    expect(container.textContent).not.toContain('No plugin inspector panels are registered');
  });

  it('keeps dbt inspector tabs compact without horizontal overflow chrome', async () => {
    const model = buildDbtModelNode();

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
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
    });

    const tabsList = container.querySelector('[data-slot="node-inspector-core-tabs-list"]');
    const generalTab = container.querySelector('[data-slot="node-inspector-tab-general"]');

    expect(container.textContent).toContain('General');
    expect(container.textContent).toContain('Summary');
    expect(container.textContent).toContain('Overview');
    expect(container.textContent).toContain('Config');
    expect(container.textContent).toContain('History');
    expect(tabsList?.getAttribute('class')).toContain('flex-wrap');
    expect(tabsList?.getAttribute('class')).toContain('gap-x-3');
    expect(tabsList?.getAttribute('class')).toContain('overflow-visible');
    expect(tabsList?.getAttribute('class')).not.toContain('overflow-x-auto');
    expect(generalTab?.getAttribute('class')).toContain('text-xs');
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

    const configTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Config')
    );
    expect(configTab).not.toBeUndefined();

    await act(async () => {
      fireEvent.mouseDown(configTab!, { button: 0, ctrlKey: false });
      fireEvent.click(configTab!);
    });

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

    const overviewTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Overview')
    );

    expect(overviewTab).not.toBeUndefined();

    await act(async () => {
      fireEvent.mouseDown(overviewTab!, { button: 0, ctrlKey: false });
      fireEvent.click(overviewTab!);
    });

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

  it('lets DVT SQL transform nodes edit SQL text in the route-owned draft', async () => {
    const onApplyNodeDraft = vi.fn();
    const transformNode = buildDvtNode('dvt:sql_transform', {
      config: {
        sql: 'select * from public.orders',
      },
    });

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={transformNode}
          nodes={[transformNode]}
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

    const sqlTextarea = container.querySelector(
      'textarea[name="dvt-transform-sql"]'
    ) as HTMLTextAreaElement | null;

    expect(container.textContent).toContain('DVT SQL transform');
    expect(sqlTextarea?.value).toBe('select * from public.orders');

    await act(async () => {
      if (sqlTextarea != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(sqlTextarea, 'select id from public.orders');
        sqlTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dvt: {
          kind: 'sql_transform',
          sql: 'select id from public.orders',
        },
      })
    );
  });

  it('lets DVT sink nodes configure materialization and write mode before preview', async () => {
    const onApplyNodeDraft = vi.fn();
    const sinkNode = buildDvtNode('dvt:sink', {
      config: {
        schema: 'marts',
        table: 'orders_daily',
        materialization: 'view',
        writeMode: 'append',
      },
    });

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={sinkNode}
          nodes={[sinkNode]}
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

    const materializationSelect = container.querySelector(
      'select[name="dvt-sink-materialization"]'
    ) as HTMLSelectElement | null;
    const writeModeSelect = container.querySelector(
      'select[name="dvt-sink-write-mode"]'
    ) as HTMLSelectElement | null;

    expect(container.textContent).toContain('DVT sink');
    expect(materializationSelect?.value).toBe('view');
    expect(writeModeSelect?.value).toBe('append');

    await act(async () => {
      if (materializationSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(materializationSelect, 'table');
        materializationSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (writeModeSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(writeModeSelect, 'replace');
        writeModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dvt: {
          kind: 'sink',
          schema: 'marts',
          table: 'orders_daily',
          materialization: 'table',
          writeMode: 'replace',
        },
      })
    );
  });
});
