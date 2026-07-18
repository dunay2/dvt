// @vitest-environment jsdom

/** Owned concern: prove CanvasNodeWorkbenchPanel presents governed node metadata directly. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';
import type { CanvasNodeWorkbenchSectionPolicyId } from '../../plugins/canvasSurfaceStrategyContracts';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import {
  CanvasNodeWorkbenchPanel,
  type CanvasNodeWorkbenchPanelProps,
} from './CanvasNodeWorkbenchPanel';

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
  metadata: {
    columns: {
      order_id: {
        data_type: 'integer',
        tests: [
          {
            not_null: {
              severity: 'error',
              selectedForExecution: true,
              lastRunStatus: 'passed',
              lastRunDurationMs: 1200,
            },
          },
        ],
      },
    },
  },
};

const CONNECTED_TEST_NODE: CanonicalNode = {
  id: 'test.orders.order_id',
  name: 'not_null_orders_order_id',
  pluginId: 'dbt',
  kind: 'dbt:test',
  role: 'check',
  status: 'failed',
  lastDuration: 1.7,
  tags: [],
  metadata: {
    testType: 'not_null',
    testTargetColumn: 'order_id',
    severity: 'error',
    selectedForExecution: true,
  },
};

const DVT_TRANSFORM_NODE: CanonicalNode = {
  id: 'transform.orders',
  name: 'Clean Orders',
  pluginId: 'dvt',
  kind: 'dvt:sql_transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    config: {
      sql: 'select order_id from source.orders',
      selectedColumns: [`${SOURCE_NODE.id}.order_id`],
    },
  },
};

const DVT_SINK_NODE: CanonicalNode = {
  id: 'sink.orders',
  name: 'Orders Sink',
  pluginId: 'dvt',
  kind: 'dvt:sink',
  role: 'output',
  status: 'idle',
  tags: [],
  metadata: {
    config: {
      database: 'analytics',
      schema: 'mart',
      table: 'fct_orders',
      materialization: 'table',
      writeMode: 'replace',
      partitionStrategy: 'date_day',
    },
  },
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
  renderNodePanel(root, SOURCE_NODE, preferredTabId);
}

function renderNodePanel(
  root: Root,
  node: CanonicalNode,
  preferredTabId: string | null = null,
  authoring: CanvasNodeWorkbenchPanelProps['authoring'] = {
    canEditNode: true,
    onApplyNodeDraft: vi.fn(),
  },
  preferredTabRequestId = 1,
  primarySectionIds?: readonly CanvasNodeWorkbenchSectionPolicyId[]
): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchPanel
        node={node}
        nodes={[SOURCE_NODE, MODEL_NODE, CONNECTED_TEST_NODE, DVT_TRANSFORM_NODE, DVT_SINK_NODE]}
        edges={[
          ...EDGES,
          {
            id: 'edge-model-test',
            sourceId: MODEL_NODE.id,
            targetId: CONNECTED_TEST_NODE.id,
            relation: 'validation',
          },
          {
            id: 'edge-source-transform',
            sourceId: SOURCE_NODE.id,
            targetId: DVT_TRANSFORM_NODE.id,
            relation: 'lineage',
          },
        ]}
        activeRunId={null}
        registeredPlugins={new Set()}
        preferredTabId={preferredTabId}
        preferredTabRequestId={preferredTabRequestId}
        primarySectionIds={primarySectionIds}
        authoring={authoring}
        onClose={vi.fn()}
      />
    );
  });
}

function renderMovablePanel(root: Root): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchPanel
        node={SOURCE_NODE}
        nodes={[SOURCE_NODE]}
        edges={[]}
        activeRunId={null}
        authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        dragHandleProps={{
          'aria-label': 'Move node workbench',
          'data-slot': 'canvas-node-workbench-drag-handle',
          role: 'button',
          tabIndex: 0,
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

  it('keeps the accessible movement handle separate from the close command', () => {
    renderMovablePanel(root);

    const dragHandle = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-drag-handle"]'
    );
    const closeButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-close"]'
    );

    expect(dragHandle?.getAttribute('role')).toBe('button');
    expect(dragHandle?.tabIndex).toBe(0);
    expect(closeButton?.textContent).toBe('Close');
    expect(dragHandle?.contains(closeButton!)).toBe(false);
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

  it('shows dbt test meaning, execution selection, readiness impact and run history', () => {
    renderNodePanel(root, MODEL_NODE, 'tests');

    expect(container.textContent).toContain('not_null(order_id)');
    expect(container.textContent).toContain('Value is present');
    expect(container.textContent).toContain('selected');
    expect(container.textContent).toContain('blocks run');
    expect(container.textContent).toContain('passed in 1.2s');
  });

  it('shows connected downstream dbt test nodes when inspecting a model', () => {
    renderNodePanel(
      root,
      { ...MODEL_NODE, metadata: { columns: { order_id: { data_type: 'integer' } } } },
      'tests'
    );

    expect(container.textContent).toContain('not_null_orders_order_id');
    expect(container.textContent).toContain('Orders Model.order_id');
    expect(container.textContent).toContain('Value is present');
    expect(container.textContent).toContain('selected');
    expect(container.textContent).toContain('failed in 1.7s');
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

  it('keeps a read-only workbench factual without rendering disabled authoring controls', () => {
    renderNodePanel(root, SOURCE_NODE, 'general', {
      canEditNode: false,
      onApplyNodeDraft: vi.fn(),
    });

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const readonlyLabels = Array.from(generalSection?.querySelectorAll('dt') ?? []).map((label) =>
      label.textContent?.trim()
    );

    expect(container.querySelector('[data-slot="canvas-node-workbench-authoring"]')).toBeNull();
    expect(generalSection?.querySelector('input[name="node-name"]')).toBeNull();
    expect(generalSection?.textContent).not.toContain('Editable properties');
    expect(readonlyLabels).toEqual(expect.arrayContaining(['Database', 'Schema', 'Table']));
  });

  it('orders editable identity before readonly facts without repeating source target rows', () => {
    renderPanel(root, 'general');

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const editableName = generalSection?.querySelector('input[name="node-name"]');
    const firstReadonlyLabel = generalSection?.querySelector('dt');
    const readonlyLabels = Array.from(generalSection?.querySelectorAll('dt') ?? []).map((label) =>
      label.textContent?.trim()
    );

    expect(generalSection).not.toBeNull();
    expect(editableName).not.toBeNull();
    expect(firstReadonlyLabel).not.toBeNull();
    expect(
      Boolean(
        editableName!.compareDocumentPosition(firstReadonlyLabel!) &
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    ).toBe(true);
    expect(readonlyLabels).not.toContain('Name');
    expect(readonlyLabels).not.toContain('Database');
    expect(readonlyLabels).not.toContain('Schema');
    expect(readonlyLabels).not.toContain('Table');
    expect(readonlyLabels).not.toContain('Source');
    expect(generalSection?.textContent).toContain('Node ID');
    expect(generalSection?.textContent).toContain('Rows');
  });

  it('renders DVT transform column selection inside the Columns tab', () => {
    const onApplyNodeDraft = vi.fn();

    renderNodePanel(root, DVT_TRANSFORM_NODE, 'columns', {
      canEditNode: true,
      onApplyNodeDraft,
    });

    const columnsSection = container.querySelector(
      '[data-slot="canvas-node-workbench-columns-section"]'
    );
    const selectedColumn = columnsSection?.querySelector<HTMLInputElement>(
      `input[name="dvt-transform-column"][value="${SOURCE_NODE.id}.order_id"]`
    );

    expect(columnsSection).not.toBeNull();
    expect(selectedColumn).not.toBeNull();
    expect(selectedColumn?.checked).toBe(true);
    expect(container.querySelector('textarea[name="dvt-transform-sql"]')).toBeNull();

    act(() => {
      fireEvent.click(selectedColumn!);
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Apply'
    );

    expect(applyButton).toBeDefined();

    act(() => {
      fireEvent.click(applyButton!);
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dvt: expect.objectContaining({
          kind: 'sql_transform',
          selectedColumns: [],
        }),
      })
    );
  });

  it('renders DVT transform SQL editing inside the Code tab', () => {
    renderNodePanel(root, DVT_TRANSFORM_NODE, 'code');

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    const sqlEditor = codeSection?.querySelector<HTMLTextAreaElement>(
      'textarea[name="dvt-transform-sql"]'
    );

    expect(codeSection).not.toBeNull();
    expect(sqlEditor).not.toBeNull();
    expect(sqlEditor?.value).toBe('select order_id from source.orders');
    expect(codeSection?.querySelector('input[name="dvt-transform-column"]')).toBeNull();
  });

  it('renders DVT sink target editing in a dedicated Sink tab without duplicating it in General', () => {
    renderNodePanel(
      root,
      DVT_SINK_NODE,
      'general',
      {
        canEditNode: true,
        onApplyNodeDraft: vi.fn(),
      },
      1,
      dvtCanvasSurfaceStrategy.nodeWorkbench.sections
    );

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    expect(generalSection?.querySelector('input[name="dvt-sink-table"]')).toBeNull();

    renderNodePanel(
      root,
      DVT_SINK_NODE,
      'sink',
      {
        canEditNode: true,
        onApplyNodeDraft: vi.fn(),
      },
      2,
      dvtCanvasSurfaceStrategy.nodeWorkbench.sections
    );

    const tabsList = container.querySelector('[data-slot="canvas-node-workbench-tabs-list"]');
    const sinkSection = container.querySelector('[data-slot="canvas-node-workbench-sink-section"]');

    expect(tabsList?.textContent).toContain('Sink');
    expect(sinkSection?.textContent).toContain('analytics.mart.fct_orders');
    expect(sinkSection?.textContent).toContain('replace');
    expect(sinkSection?.querySelector('input[name="dvt-sink-table"]')).not.toBeNull();
    expect(sinkSection?.querySelector('select[name="dvt-sink-write-mode"]')).not.toBeNull();
  });

  it('preserves one DVT transform authoring draft across workbench section switches', () => {
    const onApplyNodeDraft = vi.fn();

    renderNodePanel(root, DVT_TRANSFORM_NODE, 'columns', {
      canEditNode: true,
      onApplyNodeDraft,
    });

    const selectedColumn = container.querySelector<HTMLInputElement>(
      `input[name="dvt-transform-column"][value="${SOURCE_NODE.id}.order_id"]`
    );
    expect(selectedColumn).not.toBeNull();

    act(() => {
      fireEvent.click(selectedColumn!);
    });

    renderNodePanel(
      root,
      DVT_TRANSFORM_NODE,
      'code',
      {
        canEditNode: true,
        onApplyNodeDraft,
      },
      2
    );

    const sqlEditor = container.querySelector<HTMLTextAreaElement>(
      'textarea[name="dvt-transform-sql"]'
    );
    expect(sqlEditor).not.toBeNull();

    act(() => {
      fireEvent.change(sqlEditor!, {
        target: { value: 'select customer from source.orders' },
      });
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Apply'
    );
    expect(applyButton).toBeDefined();

    act(() => {
      fireEvent.click(applyButton!);
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dvt: expect.objectContaining({
          kind: 'sql_transform',
          selectedColumns: [],
          sql: 'select customer from source.orders',
        }),
      })
    );
  });
});
