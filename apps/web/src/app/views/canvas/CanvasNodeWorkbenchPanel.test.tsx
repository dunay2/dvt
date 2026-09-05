// @vitest-environment jsdom

/** Owned concern: prove CanvasNodeWorkbenchPanel presents governed node metadata directly. */
import React, { act } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';
import type { CanvasNodeWorkbenchSectionPolicyId } from '../../plugins/canvasSurfaceStrategyContracts';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
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
      },
      {
        name: 'discount_code',
        type: 'text',
        nullable: true,
      },
    ],
    constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
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
  pluginId: 'dvt',
  kind: 'dvt:transform',
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
    dbtTest: {
      testType: 'not_null',
      targetModelId: MODEL_NODE.id,
      targetColumn: 'order_id',
      severity: 'error',
    },
    selectedForExecution: true,
  },
};

const DVT_TRANSFORM_NODE: CanonicalNode = {
  id: 'transform.orders',
  name: 'Clean Orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    config: {
      selectedColumns: [`${SOURCE_NODE.id}.order_id`],
    },
  },
};

const DVT_SUBSTRAIT_TRANSFORM_NODE: CanonicalNode = (() => {
  const source = resolveDvtSubstraitProjectionSource(SOURCE_NODE);
  if (source == null) throw new Error('Expected a connected PostgreSQL source fixture.');
  return applyDvtSubstraitSemanticDocument(
    DVT_TRANSFORM_NODE,
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: DVT_TRANSFORM_NODE.id,
        outputs: [{ fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' }],
      })
    )
  );
})();

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
  primarySectionIds?: readonly CanvasNodeWorkbenchSectionPolicyId[],
  graph?: Readonly<{
    nodes?: readonly CanonicalNode[];
    edges?: readonly CanonicalEdge[];
  }>
): void {
  act(() => {
    root.render(
      <CanvasNodeWorkbenchPanel
        node={node}
        nodes={
          graph?.nodes ?? [
            SOURCE_NODE,
            MODEL_NODE,
            CONNECTED_TEST_NODE,
            DVT_TRANSFORM_NODE,
            DVT_SINK_NODE,
          ]
        }
        edges={
          graph?.edges ?? [
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
          ]
        }
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

  it('renders the approved Source tabs without an overflow bucket', () => {
    renderPanel(root);

    const tabsList = container.querySelector('[data-slot="canvas-node-workbench-tabs-list"]');
    expect(tabsList).not.toBeNull();
    expect(tabsList?.querySelectorAll('svg')).toHaveLength(0);

    for (const label of ['Overview', 'Columns', 'Inputs / Outputs']) {
      expect(tabsList?.textContent).toContain(label);
    }
    for (const rejectedLabel of ['General', 'Tests', 'More', 'Code', 'Indexes']) {
      expect(tabsList?.textContent).not.toContain(rejectedLabel);
    }
    expect(container.textContent).toContain('PostgreSQL');
    expect(container.querySelector('[data-slot="canvas-source-provider-icon"] svg')).not.toBeNull();
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

  it('keeps the Source columns tab factual without Transform filter authoring', () => {
    renderPanel(root, 'columns');

    expect(container.querySelector('[data-slot="dvt-filter-authoring"]')).toBeNull();
    expect(container.textContent).toContain('order_id');
  });

  it('does not repeat an external code action when the node already supports an inline projection', () => {
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

    expect(container.querySelector('[data-testid="monaco-code-viewer"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
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

  it('shows Source column metadata and Canvas graph IO from the node read model', () => {
    renderPanel(root, 'columns');

    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('integer');
    expect(container.textContent).toContain('Not null');
    expect(container.textContent).toContain('Primary key');

    renderPanel(root, 'inputs-outputs');
    expect(container.textContent).toContain('Output');
    expect(container.textContent).toContain('Orders Model');
    expect(container.textContent).not.toContain('not_null_orders_order_id');
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

  it('renders the warehouse Source Overview without permanent CRUD controls', () => {
    renderPanel(root, 'general');

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const overview = generalSection?.querySelector('[data-slot="canvas-source-overview"]');

    expect(generalSection).not.toBeNull();
    expect(overview).not.toBeNull();
    expect(overview?.textContent).toContain('Source metadata');
    expect(overview?.textContent).toContain('DVT metadata');
    expect(overview?.querySelector('input[name="node-name"]')).toBeNull();
    expect(overview?.querySelector('input[name="node-tags"]')).toBeNull();
    expect(overview?.querySelector('textarea[name="node-description"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-node-workbench-authoring"]')).toBeNull();
    expect(container.textContent).not.toContain('Apply');
    expect(container.textContent).not.toContain('Autosaved');
  });

  it('projects saved business tags to the card only after Apply', () => {
    const node = { ...DVT_TRANSFORM_NODE, tags: ['authoring'] };
    const onApplyNodeDraft = vi.fn();
    renderNodePanel(root, node, 'general', { canEditNode: true, onApplyNodeDraft });

    const tagsInput = container.querySelector<HTMLInputElement>('input[name="node-tags"]');
    expect(tagsInput).not.toBeNull();
    expect(
      mapCanonicalNodeToCanvasNode({
        canonicalNode: node,
        index: 0,
        showColumns: false,
        locale: 'es',
      }).data.displayTags
    ).toEqual([{ value: 'authoring', label: 'En edición' }]);

    act(() => {
      fireEvent.input(tagsInput!, { target: { value: 'finance, critical' } });
    });

    expect(onApplyNodeDraft).not.toHaveBeenCalled();

    const applyButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Apply'
    );
    expect(applyButton).toBeDefined();

    act(() => {
      fireEvent.click(applyButton!);
    });

    const submittedDraft = onApplyNodeDraft.mock.calls[0]?.[0];
    expect(submittedDraft).toBeDefined();
    const appliedNode = applyCanvasInspectorNodeDraft(node, submittedDraft);
    expect(
      mapCanonicalNodeToCanvasNode({
        canonicalNode: appliedNode,
        index: 0,
        showColumns: false,
        locale: 'es',
      }).data.displayTags
    ).toEqual([
      { value: 'authoring', label: 'En edición' },
      { value: 'finance', label: 'finance' },
      { value: 'critical', label: 'critical' },
    ]);
  });

  it('keeps the read-only Source Overview factual without disabled authoring controls', () => {
    renderNodePanel(root, SOURCE_NODE, 'general', {
      canEditNode: false,
      onApplyNodeDraft: vi.fn(),
    });

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const external = generalSection?.querySelector('[data-slot="canvas-source-overview-external"]');
    const readonlyLabels = Array.from(external?.querySelectorAll('dt') ?? []).map((label) =>
      label.textContent?.trim()
    );

    expect(container.querySelector('[data-slot="canvas-node-workbench-authoring"]')).toBeNull();
    expect(generalSection?.querySelector('input')).toBeNull();
    expect(generalSection?.querySelector('textarea')).toBeNull();
    expect(readonlyLabels).toEqual(expect.arrayContaining(['Kind', 'Schema', 'Table', 'Columns']));
    expect(generalSection?.textContent).toContain('read-only');
  });

  it('separates external Source authority from DVT-owned metadata without a Summary overflow', () => {
    renderPanel(root, 'general');

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const external = generalSection?.querySelector('[data-slot="canvas-source-overview-external"]');
    const dvt = generalSection?.querySelector('[data-slot="canvas-source-overview-dvt"]');

    expect(generalSection).not.toBeNull();
    expect(external).not.toBeNull();
    expect(dvt).not.toBeNull();
    expect(external?.textContent).toContain('Schema');
    expect(external?.textContent).toContain('raw');
    expect(external?.textContent).toContain('orders');
    expect(dvt?.textContent).toContain('Name');
    expect(dvt?.textContent).toContain('Tags');
    expect(dvt?.textContent).toContain('Description');
    expect(external?.textContent).not.toContain('Node ID');
    expect(external?.textContent).not.toContain('Plugin');
    expect(container.querySelector('[data-slot="canvas-node-workbench-more-trigger"]')).toBeNull();

    renderPanel(root, 'summary');
    expect(
      container.querySelector('[data-slot="canvas-node-workbench-summary-section"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-source-overview"]')).not.toBeNull();
  });

  it('renders DVT transform upstream columns as read-only facts inside the Columns tab', () => {
    renderNodePanel(root, DVT_TRANSFORM_NODE, 'columns');

    const columnsSection = container.querySelector(
      '[data-slot="canvas-node-workbench-columns-section"]'
    );
    const columnRecords = columnsSection?.querySelectorAll(
      '[data-slot="node-property-column-record"]'
    );
    expect(columnsSection).not.toBeNull();
    expect(columnRecords).toHaveLength(2);
    expect(columnRecords?.[0]?.textContent).toContain('Orders Source');
    expect(columnRecords?.[0]?.textContent).toContain('order_id');
    expect(columnsSection?.querySelector('table')).toBeNull();
    expect(columnsSection?.textContent).toContain('integer');
    expect(columnsSection?.querySelector('input[name="dvt-transform-column"]')).toBeNull();
    expect(
      columnsSection?.querySelector('[data-slot="canvas-node-workbench-authoring"]')
    ).toBeNull();
    expect(container.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
  });

  it('shows Substrait first and derives PostgreSQL SQL only after explicit output selection', async () => {
    renderNodePanel(root, DVT_SUBSTRAIT_TRANSFORM_NODE, 'code');

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    const outputSelector = codeSection?.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-transform-output-view-selector"]'
    );
    const canonicalViewer = codeSection?.querySelector<HTMLElement>(
      '[data-testid="monaco-code-viewer"]'
    );

    expect(outputSelector?.value).toBe('substrait');
    expect(canonicalViewer?.dataset.language).toBe('json');
    expect(canonicalViewer?.textContent).toContain('dvt-substrait-semantic-document.v1');
    expect(codeSection?.textContent).not.toContain('Convert to SQL');

    await act(async () => {
      fireEvent.change(outputSelector!, { target: { value: 'postgres-sql' } });
      await Promise.resolve();
    });

    await waitFor(() => {
      const sqlViewer = codeSection?.querySelector<HTMLElement>(
        '[data-testid="monaco-code-viewer"]'
      );
      expect(sqlViewer?.dataset.language).toBe('sql');
      expect(sqlViewer?.textContent?.replaceAll(/\s+/g, ' ').toLowerCase()).toContain(
        'select order_id from raw.orders'
      );
    });
    expect(outputSelector?.value).toBe('postgres-sql');
  });

  it('keeps canonical code scrolling inside Monaco without a nested workbench scrollbar', () => {
    renderNodePanel(root, DVT_SUBSTRAIT_TRANSFORM_NODE, 'code');

    expect(
      container.querySelector('[data-slot="canvas-node-workbench-contained-body"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeNull();
    expect(container.querySelector('[data-testid="monaco-code-viewer"]')).not.toBeNull();

    renderNodePanel(
      root,
      DVT_SUBSTRAIT_TRANSFORM_NODE,
      'general',
      { canEditNode: true, onApplyNodeDraft: vi.fn() },
      2
    );

    expect(
      container.querySelector('[data-slot="canvas-node-workbench-contained-body"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="scroll-area"]')).not.toBeNull();
  });

  it('renders one read-only DBT SQL projection in Code', () => {
    renderNodePanel(root, MODEL_NODE, 'code');

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    const sqlViewer = codeSection?.querySelector<HTMLElement>('[data-testid="monaco-code-viewer"]');

    expect(codeSection).not.toBeNull();
    expect(sqlViewer?.textContent).toContain('origin."order_id" as "order_id"');
    expect(sqlViewer?.textContent).toContain('origin."discount_code" as "discount_code"');
    expect(sqlViewer?.textContent).not.toContain('select *');
    expect(sqlViewer?.textContent).toContain('{{ source(');
    expect(sqlViewer?.dataset.language).toBe('sql');
    expect(sqlViewer?.dataset.path).toBe('models/orders_model.sql');
    expect(codeSection?.querySelector('pre')).toBeNull();
    expect(codeSection?.querySelector('[data-testid="monaco-code-editor"]')).toBeNull();
    expect(codeSection?.querySelectorAll('[data-testid="monaco-code-viewer"]')).toHaveLength(1);
    expect(codeSection?.textContent).toContain('read-only projection');
    expect(codeSection?.textContent).not.toContain('No properties are recorded for this section.');
  });

  it('persists DBT model selections immediately without Apply or Cancel controls', () => {
    const alternateSource: CanonicalNode = {
      ...SOURCE_NODE,
      id: 'source.customers',
      name: 'Customers Source',
      metadata: {
        ...SOURCE_NODE.metadata,
        tableName: 'customers',
      },
    };
    const onApplyNodeDraft = vi.fn();

    renderNodePanel(
      root,
      MODEL_NODE,
      'general',
      { canEditNode: true, onApplyNodeDraft },
      1,
      undefined,
      {
        nodes: [SOURCE_NODE, alternateSource, MODEL_NODE],
        edges: [
          ...EDGES,
          {
            id: 'edge-alternate-model',
            sourceId: alternateSource.id,
            targetId: MODEL_NODE.id,
            relation: 'lineage',
          },
        ],
      }
    );

    const materializedSelect = container.querySelector(
      'select[name="dbt-materialized"]'
    ) as HTMLSelectElement;
    const originSelect = container.querySelector('select[name="dbt-origin"]') as HTMLSelectElement;

    act(() => {
      fireEvent.change(materializedSelect, { target: { value: 'incremental' } });
    });

    expect(onApplyNodeDraft).toHaveBeenCalledTimes(1);
    expect(onApplyNodeDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dbt: expect.objectContaining({ materialized: 'incremental' }),
      })
    );

    act(() => {
      fireEvent.change(originSelect, { target: { value: alternateSource.id } });
    });

    expect(onApplyNodeDraft).toHaveBeenCalledTimes(2);
    expect(onApplyNodeDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dbt: expect.objectContaining({
          materialized: 'incremental',
          selectedSourceId: alternateSource.id,
        }),
      })
    );

    const packageInput = container.querySelector('input[name="dbt-package"]') as HTMLInputElement;
    act(() => {
      fireEvent.focus(packageInput);
      fireEvent.input(packageInput, { target: { value: 'finance' } });
    });
    expect(
      Array.from(container.querySelectorAll('button')).some((button) =>
        ['Apply', 'Cancel'].includes(button.textContent?.trim() ?? '')
      )
    ).toBe(false);

    act(() => {
      fireEvent.focusOut(packageInput);
    });
    expect(onApplyNodeDraft).toHaveBeenCalledTimes(3);
    expect(onApplyNodeDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dbt: expect.objectContaining({
          packageName: 'finance',
          materialized: 'incremental',
          selectedSourceId: alternateSource.id,
        }),
      })
    );
  });

  it('shows the connected origin schema consistently in the DBT model inspector', () => {
    const source: CanonicalNode = {
      ...SOURCE_NODE,
      metadata: {
        ...SOURCE_NODE.metadata,
        schema: 'dvt',
      },
    };
    const model: CanonicalNode = {
      ...MODEL_NODE,
      metadata: {
        ...MODEL_NODE.metadata,
        config: { schema: 'raw', table: 'model_1', materialized: 'view' },
        dbt: { schemaName: 'raw', tableName: 'model_1', materialized: 'view' },
      },
    };

    renderNodePanel(
      root,
      model,
      'general',
      { canEditNode: true, onApplyNodeDraft: vi.fn() },
      1,
      undefined,
      { nodes: [source, model], edges: EDGES }
    );

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const originSelect = generalSection?.querySelector(
      'select[name="dbt-origin"]'
    ) as HTMLSelectElement;

    expect(originSelect.value).toBe(source.id);
    expect(generalSection?.textContent).toContain('Schema');
    expect(generalSection?.textContent).toContain('dvt');
    expect(generalSection?.textContent).not.toContain('Select a connected origin');
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
});
