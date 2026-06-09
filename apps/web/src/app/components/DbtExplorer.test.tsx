// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE,
  buildCanvasWorkspaceResourceGroups,
  serializeCanvasWorkspaceResourceDragPayload,
} from './canvasWorkspaceExplorerModel';
import DbtExplorer from './DbtExplorer';
import type { IWarehouseSourceImportPort, WarehouseTable } from '../ports/workspace';
import type { CanonicalNode } from '../types/canonical';
import { buildTestNodeKind } from '../views/canvas/canvasKindRegistration.testSupport';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());

vi.mock('../plugins/nodeTypeRegistry', () => ({
  resolveNodeKindRegistration: mockResolveNodeKindRegistration,
}));

function buildNode(): CanonicalNode {
  return {
    id: 'node.orders',
    name: 'orders',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform' as const,
    status: 'idle' as const,
    tags: [],
  };
}

function dispatchDragStart(target: Element, dataTransfer: DataTransfer): void {
  const event = new Event('dragstart', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: dataTransfer,
  });
  target.dispatchEvent(event);
}

function flushPendingWork(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    button.textContent?.includes(label)
  );
}

function buildWarehouseTable(overrides: Partial<WarehouseTable>): WarehouseTable {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    rowCount: 100,
    columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
    ...overrides,
  };
}

function buildWarehouseSourceImportPort(
  tables: readonly WarehouseTable[] = [
    buildWarehouseTable({ table: 'ORDERS', rowCount: 125000 }),
    buildWarehouseTable({
      table: 'CUSTOMERS',
      rowCount: 45000,
      columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
    }),
  ]
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: vi.fn(async () => [
      {
        id: 'conn-1',
        name: 'Production Warehouse',
        type: 'snowflake' as const,
        database: 'RAW',
      },
    ]),
    listWarehouseTables: vi.fn(async () => tables.map((table) => ({ ...table }))),
    createWarehouseConnection: vi.fn(async (input) => ({
      id: 'conn-created',
      name: input.name,
      type: input.type,
      database: input.database,
    })),
    testWarehouseConnection: vi.fn(async (connectionId) => ({
      connectionId,
      status: 'passed' as const,
      checkedAt: '2026-06-08T00:00:00.000Z',
      tableCount: tables.length,
    })),
    importSources: vi.fn(),
  };
}

describe('DbtExplorer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockResolveNodeKindRegistration.mockImplementation(() => ({
      label: 'Model',
      minimapColor: '#22c55e',
      icon: () => <span data-testid="kind-icon" />,
    }));
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function buildResourceGroups(
    nodes: CanonicalNode[]
  ): ReturnType<typeof buildCanvasWorkspaceResourceGroups> {
    return buildCanvasWorkspaceResourceGroups({ nodes });
  }

  it('keeps drag affordances and import guidance when graph edits are allowed', async () => {
    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([buildNode()])}
          canEditGraph={true}
          onHide={vi.fn()}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });

    const draggableNode = container.querySelector('[draggable="true"]');

    expect(container.textContent).toContain('Drag resources into the graph');
    expect(container.textContent).toContain('Add data');
    expect(draggableNode).not.toBeNull();
    expect(draggableNode?.className).toContain('cursor-move');
  });

  it('removes drag affordances and disables import action when graph edits are gated', async () => {
    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([buildNode()])}
          canEditGraph={false}
          onHide={vi.fn()}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });

    const draggableNode = container.querySelector('[draggable="false"]');
    const addDataButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add data')
    );

    expect(container.textContent).toContain('Inspect available project resources');
    expect(addDataButton).not.toBeNull();
    expect(addDataButton?.getAttribute('disabled')).not.toBeNull();
    expect(draggableNode?.getAttribute('draggable')).toBe('false');
    expect(draggableNode?.className).toContain('cursor-default');
  });

  it('keeps Add data action visible even with an empty workspace', async () => {
    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={[]}
          canEditGraph={true}
          onHide={vi.fn()}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });

    const addDataButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add data')
    );

    expect(addDataButton).not.toBeNull();
    expect(addDataButton?.getAttribute('disabled')).toBeNull();
  });

  it('lets authors inspect, search, select, and hand off warehouse source objects', async () => {
    const warehouseSourceImport = buildWarehouseSourceImportPort();
    const onOpenDataRegistry = vi.fn();

    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([buildNode()])}
          canEditGraph={true}
          warehouseSourceImport={warehouseSourceImport}
          onOpenDataRegistry={onOpenDataRegistry}
        />
      );
    });
    await flushPendingWork();

    expect(container.textContent).toContain('Warehouse sources');
    expect(container.textContent).toContain('Production Warehouse');
    expect(container.textContent).toContain('ORDERS');
    expect(container.textContent).toContain('CUSTOMERS');

    const search = container.querySelector<HTMLInputElement>(
      '[aria-label="Search warehouse source objects"]'
    );
    expect(search).not.toBeNull();

    await act(async () => {
      if (search) {
        search.value = 'customer';
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'customer' }));
    });

    expect(container.textContent).not.toContain('ORDERS');
    expect(container.textContent).toContain('CUSTOMERS');

    const customerRow = Array.from(
      container.querySelectorAll<HTMLElement>('[data-source-table]')
    ).find((row) => row.textContent?.includes('CUSTOMERS'));
    expect(customerRow).toBeDefined();

    await act(async () => {
      customerRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const registerSelected = findButton(container, 'Register selected');
    expect(registerSelected).toBeDefined();

    await act(async () => {
      registerSelected?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenDataRegistry).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      tables: [
        expect.objectContaining({
          database: 'RAW',
          schema: 'ERP',
          table: 'CUSTOMERS',
        }),
      ],
    });
  });

  it('creates a governed warehouse connection from the source explorer', async () => {
    const warehouseSourceImport = buildWarehouseSourceImportPort();

    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([buildNode()])}
          canEditGraph={true}
          warehouseSourceImport={warehouseSourceImport}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });
    await flushPendingWork();

    await act(async () => {
      findButton(container, 'New connection')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    const nameInput = container.querySelector<HTMLInputElement>('[aria-label="Connection name"]');
    const databaseInput = container.querySelector<HTMLInputElement>('[aria-label="Database name"]');
    const credentialRefInput = container.querySelector<HTMLInputElement>(
      '[aria-label="Credential reference"]'
    );

    await act(async () => {
      if (nameInput) {
        nameInput.value = 'Analytics Postgres';
      }
      nameInput?.dispatchEvent(new InputEvent('input', { bubbles: true }));

      if (databaseInput) {
        databaseInput.value = 'analytics';
      }
      databaseInput?.dispatchEvent(new InputEvent('input', { bubbles: true }));

      if (credentialRefInput) {
        credentialRefInput.value = 'env:ANALYTICS_DATABASE_URL';
      }
      credentialRefInput?.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });

    await act(async () => {
      findButton(container, 'Create connection')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });
    await flushPendingWork();

    expect(warehouseSourceImport.createWarehouseConnection).toHaveBeenCalledWith({
      name: 'Analytics Postgres',
      type: 'postgres',
      database: 'analytics',
      credentialRef: 'env:ANALYTICS_DATABASE_URL',
    });
    expect(container.textContent).toContain('Analytics Postgres');
    expect(container.textContent).toContain('Connection created');
  });

  it('tests the active warehouse connection through the governed command rail', async () => {
    const warehouseSourceImport = buildWarehouseSourceImportPort();

    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([buildNode()])}
          canEditGraph={true}
          warehouseSourceImport={warehouseSourceImport}
          onOpenDataRegistry={vi.fn()}
        />
      );
    });
    await flushPendingWork();

    await act(async () => {
      findButton(container, 'Test connection')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });
    await flushPendingWork();

    expect(warehouseSourceImport.testWarehouseConnection).toHaveBeenCalledWith('conn-1');
    expect(container.textContent).toContain('Connection test passed');
  });

  it('keeps warehouse discovery readable but blocks registration in read-only canvases', async () => {
    const warehouseSourceImport = buildWarehouseSourceImportPort();
    const onOpenDataRegistry = vi.fn();

    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([buildNode()])}
          canEditGraph={false}
          warehouseSourceImport={warehouseSourceImport}
          onOpenDataRegistry={onOpenDataRegistry}
        />
      );
    });
    await flushPendingWork();

    expect(container.textContent).toContain('Warehouse sources');
    expect(container.textContent).toContain('ORDERS');
    expect(findButton(container, 'Register selected')?.getAttribute('disabled')).not.toBeNull();
    expect(onOpenDataRegistry).not.toHaveBeenCalled();
  });

  it('keeps node-kind creation out of the project-resource explorer', async () => {
    const nodeKind = buildTestNodeKind();
    const onCreateAuthoringNode = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(DbtExplorer as React.ComponentType<Record<string, unknown>>, {
          resourceGroups: buildResourceGroups([buildNode()]),
          canEditGraph: true,
          nodeKinds: [nodeKind],
          onCreateAuthoringNode,
        })
      );
    });

    const createButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Source')
    );

    expect(container.textContent).not.toContain('Add node');
    expect(createButton).toBeUndefined();
    expect(onCreateAuthoringNode).not.toHaveBeenCalled();
  });

  it('serializes schema resources with the project resource drag payload', async () => {
    await act(async () => {
      root.render(
        <DbtExplorer
          resourceGroups={buildResourceGroups([
            {
              ...buildNode(),
              metadata: {
                config: {
                  schema: 'mart',
                },
              },
            },
          ])}
          canEditGraph={true}
        />
      );
    });

    const schemaRow = Array.from(container.querySelectorAll('[draggable="true"]')).find((row) =>
      row.textContent?.includes('mart')
    );
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: '',
      setData,
    } as unknown as DataTransfer;

    expect(schemaRow).toBeDefined();
    dispatchDragStart(schemaRow as Element, dataTransfer);

    expect(setData).toHaveBeenCalledWith(
      CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE,
      serializeCanvasWorkspaceResourceDragPayload({
        resourceId: 'schema:mart',
        resourceType: 'schema',
        schemaName: 'mart',
        label: 'mart',
      })
    );
  });
});
