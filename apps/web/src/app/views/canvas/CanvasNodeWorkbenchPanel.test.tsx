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

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    language,
    onChange,
    path,
    value,
  }: {
    language: string;
    onChange: (value: string) => void;
    path?: string;
    value: string;
  }) => (
    <textarea
      data-language={language}
      data-path={path}
      data-testid="monaco-code-editor"
      onChange={(event) => onChange(event.currentTarget.value)}
      value={value}
    />
  ),
}));

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    language,
    path,
    value,
  }: {
    language: string;
    path?: string;
    value: string;
  }) => (
    <div data-language={language} data-path={path} data-testid="monaco-code-viewer">
      {value}
    </div>
  ),
}));

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
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-prod',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/dvt/raw/orders',
    },
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
    dbt: {
      selectedSourceId: SOURCE_NODE.id,
    },
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

const DVT_VISUAL_TRANSFORM_NODE: CanonicalNode = {
  ...DVT_TRANSFORM_NODE,
  metadata: {
    transformAuthoring: {
      version: 'v1',
      mode: 'visual',
      recipe: {
        version: 'v1',
        outputs: [
          {
            id: 'output:order_id',
            name: 'order_id',
            dataType: 'integer',
            expression: {
              inputs: [{ nodeId: SOURCE_NODE.id, columnName: 'order_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      },
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

  it('renders only source capabilities and keeps data-backed extras in More', () => {
    renderPanel(root);

    const tabsList = container.querySelector('[data-slot="canvas-node-workbench-tabs-list"]');
    expect(tabsList).not.toBeNull();
    expect(tabsList?.querySelectorAll('svg')).toHaveLength(0);

    for (const label of ['General', 'Columns', 'Inputs / Outputs', 'Tests', 'More']) {
      expect(tabsList?.textContent).toContain(label);
    }
    expect(tabsList?.textContent).not.toContain('Code');
    expect(tabsList?.textContent).not.toContain('Indexes');
  });

  it('does not mistake the read-model empty-columns description for a source capability', () => {
    renderNodePanel(
      root,
      {
        ...SOURCE_NODE,
        metadata: {
          ...SOURCE_NODE.metadata,
          columns: [],
        },
      },
      null,
      {
        canEditNode: false,
        onApplyNodeDraft: vi.fn(),
      }
    );

    const tabsList = container.querySelector('[data-slot="canvas-node-workbench-tabs-list"]');
    expect(tabsList).not.toBeNull();
    expect(tabsList?.textContent).not.toContain('Columns');
  });

  it('does not repeat an external code action when the node already supports inline authoring', () => {
    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={MODEL_NODE}
          nodes={[SOURCE_NODE, MODEL_NODE]}
          edges={EDGES}
          activeRunId={null}
          preferredTabId="general"
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
          onClose={vi.fn()}
        />
      );
    });

    const codeTab = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-tab-code"]'
    );
    expect(codeTab).not.toBeNull();
    expect(codeTab?.getAttribute('aria-selected')).toBe('false');

    act(() => {
      fireEvent.pointerDown(codeTab!, { button: 0, ctrlKey: false, pointerType: 'mouse' });
      fireEvent.mouseDown(codeTab!, { button: 0, ctrlKey: false });
      fireEvent.click(codeTab!);
    });

    expect(container.querySelector('[data-testid="monaco-code-editor"]')).not.toBeNull();
  });

  it('does not synthesize a duplicate code action for a file-backed node', () => {
    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={MODEL_NODE}
          nodes={[SOURCE_NODE, MODEL_NODE]}
          edges={EDGES}
          activeRunId={null}
          preferredTabId="code"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  });

  it('keeps the accessible movement handle separate from the close command', () => {
    renderMovablePanel(root);

    const panel = container.querySelector<HTMLElement>('[data-slot="canvas-node-workbench-panel"]');
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-slot="canvas-node-workbench-drag-handle"]'
    );
    const closeButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-close"]'
    );

    expect(panel?.className).toContain('min-w-0');
    expect(panel?.className).toContain('w-full');
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
    expect(generalSection?.querySelector('input[name="node-tags"]')).not.toBeNull();
    expect(generalSection?.querySelector('textarea[name="node-description"]')).not.toBeNull();
    expect(
      Array.from(generalSection?.querySelectorAll('h3') ?? [], (heading) =>
        heading.textContent?.trim()
      )
    ).not.toContain('General');
    expect(generalSection?.textContent).not.toContain('Editable properties');
    expect(generalSection?.textContent).not.toContain(
      'Name, tags, and description saved with this canvas.'
    );
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

  it('renders DVT transform upstream columns as read-only facts inside the Columns tab', () => {
    renderNodePanel(root, DVT_TRANSFORM_NODE, 'columns');

    const columnsSection = container.querySelector(
      '[data-slot="canvas-node-workbench-columns-section"]'
    );
    const columnRows = columnsSection?.querySelectorAll('tbody tr');
    expect(columnsSection).not.toBeNull();
    expect(columnRows).toHaveLength(2);
    expect(columnRows?.[0]?.textContent).toContain('Orders Source');
    expect(columnRows?.[0]?.textContent).toContain('order_id');
    expect(columnsSection?.textContent).toContain('integer');
    expect(columnsSection?.querySelector('input[name="dvt-transform-column"]')).toBeNull();
    expect(
      columnsSection?.querySelector('[data-slot="canvas-node-workbench-authoring"]')
    ).toBeNull();
    expect(container.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  });

  it('renders DVT transform SQL editing inside the Code tab', () => {
    renderNodePanel(root, DVT_TRANSFORM_NODE, 'code');

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    const sqlEditor = codeSection?.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );

    expect(codeSection).not.toBeNull();
    expect(sqlEditor).not.toBeNull();
    expect(sqlEditor?.value).toBe('select order_id from source.orders');
    expect(sqlEditor?.dataset.language).toBe('sql');
    expect(sqlEditor?.dataset.path).toBe('canvas/transform.orders.sql');
    expect(codeSection?.querySelector('[data-testid="monaco-code-viewer"]')).toBeNull();
    expect(codeSection?.querySelector('input[name="dvt-transform-column"]')).toBeNull();
  });

  it('shows visual transform generated SQL in the shared read-only Monaco surface', () => {
    renderNodePanel(root, DVT_VISUAL_TRANSFORM_NODE, 'code');

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    expect(codeSection?.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    const codeViewer = codeSection?.querySelector<HTMLElement>(
      '[data-testid="monaco-code-viewer"]'
    );
    expect(codeViewer).not.toBeNull();
    expect(codeViewer?.dataset.language).toBe('sql');
    expect(codeViewer?.dataset.path).toBe('models/transform-orders.sql');
    expect(codeViewer?.textContent).toBe(
      [
        'select',
        '  "orders"."order_id" as "order_id"',
        'from "raw"."orders" as "orders";',
        '',
      ].join('\n')
    );
    expect(codeSection?.querySelector('pre')).toBeNull();
  });

  it('requires explicit confirmation before transferring visual authority to generated SQL', () => {
    const onConvertVisualTransformToSql = vi.fn();
    const authoring = {
      canEditNode: true,
      onApplyNodeDraft: vi.fn(),
      onConvertVisualTransformToSql,
    };
    const generatedSql = [
      'select',
      '  "orders"."order_id" as "order_id"',
      'from "raw"."orders" as "orders";',
      '',
    ].join('\n');

    renderNodePanel(root, DVT_VISUAL_TRANSFORM_NODE, 'code', authoring);

    const convertButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Convert to SQL'
    );
    expect(convertButton).toBeDefined();

    act(() => {
      fireEvent.click(convertButton!);
    });

    expect(document.body.textContent).toContain('Convert this visual transform to SQL?');
    expect(document.body.textContent).toContain('Returning from SQL to Visual is not automatic.');
    expect(onConvertVisualTransformToSql).not.toHaveBeenCalled();

    const cancelButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancel'
    );
    act(() => {
      fireEvent.click(cancelButton!);
    });
    expect(onConvertVisualTransformToSql).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(convertButton!);
    });
    const dialog = document.body.querySelector('[data-slot="alert-dialog-content"]');
    const confirmButton = Array.from(dialog?.querySelectorAll('button') ?? []).find(
      (button) => button.textContent?.trim() === 'Convert to SQL'
    );
    act(() => {
      fireEvent.click(confirmButton!);
    });

    expect(onConvertVisualTransformToSql).toHaveBeenCalledOnce();
    expect(onConvertVisualTransformToSql).toHaveBeenCalledWith(generatedSql);
  });

  it('renders one DBT model editor in Code without duplicating passive generated SQL', () => {
    renderNodePanel(root, MODEL_NODE, 'code');

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    const sqlEditor = codeSection?.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );

    expect(codeSection).not.toBeNull();
    expect(sqlEditor?.value).toContain('select *');
    expect(sqlEditor?.value).toContain('{{ source(');
    expect(sqlEditor?.dataset.language).toBe('sql');
    expect(sqlEditor?.dataset.path).toBe('models/orders_model.sql');
    expect(codeSection?.querySelector('pre')).toBeNull();
    expect(codeSection?.querySelectorAll('[data-testid="monaco-code-editor"]')).toHaveLength(1);
    expect(codeSection?.textContent).not.toContain('No properties are recorded for this section.');
  });

  it('preserves an empty DBT SQL draft across equivalent graph-node projections', () => {
    renderNodePanel(root, MODEL_NODE, 'code');

    const sqlEditor = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(sqlEditor?.value).toContain('select *');

    act(() => {
      fireEvent.change(sqlEditor!, { target: { value: '' } });
    });

    expect(sqlEditor?.value).toBe('');

    renderNodePanel(
      root,
      {
        ...MODEL_NODE,
        metadata: { ...MODEL_NODE.metadata },
      },
      'code',
      {
        canEditNode: true,
        onApplyNodeDraft: vi.fn(),
      },
      2
    );

    expect(
      container.querySelector<HTMLTextAreaElement>('[data-testid="monaco-code-editor"]')?.value
    ).toBe('');

    renderNodePanel(
      root,
      {
        ...MODEL_NODE,
        metadata: {
          ...MODEL_NODE.metadata,
          config: { materialized: 'table' },
        },
      },
      'code',
      {
        canEditNode: true,
        onApplyNodeDraft: vi.fn(),
      },
      3
    );

    expect(
      container.querySelector<HTMLTextAreaElement>('[data-testid="monaco-code-editor"]')?.value
    ).toBe('');
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

    renderNodePanel(root, DVT_TRANSFORM_NODE, 'code', {
      canEditNode: true,
      onApplyNodeDraft,
    });

    const sqlEditor = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(sqlEditor).not.toBeNull();

    act(() => {
      fireEvent.input(sqlEditor!, {
        target: { value: 'select customer from source.orders' },
      });
    });

    renderNodePanel(
      root,
      DVT_TRANSFORM_NODE,
      'columns',
      {
        canEditNode: true,
        onApplyNodeDraft,
      },
      2
    );

    expect(container.querySelector('input[name="dvt-transform-column"]')).toBeNull();

    renderNodePanel(
      root,
      DVT_TRANSFORM_NODE,
      'code',
      {
        canEditNode: true,
        onApplyNodeDraft,
      },
      3
    );

    const restoredSqlEditor = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="monaco-code-editor"]'
    );
    expect(restoredSqlEditor?.value).toBe('select customer from source.orders');

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
          sql: 'select customer from source.orders',
        }),
      })
    );
  });
});
