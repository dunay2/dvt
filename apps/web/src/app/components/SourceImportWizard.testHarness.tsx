// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React, { act } from 'react';
import { vi } from 'vitest';
import {
  createTestQueryClient,
  waitForReactQuery,
  withTestQueryClient,
} from '../../testing/reactQueryHarness';

import type {
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  WarehouseConnection,
  RelationalSourceObject,
  SourceObject,
} from '../ports/workspace';
import type { SessionContextPort } from '../ports/sessionContext';
import type { SourceImportOptionContribution } from '../plugins/registry';
import { AppServicesProvider } from '../services/AppServicesContext';
import { buildGraphDraftSourceImportResult } from '../../testing/sourceImportTestFixtures';
import SourceImportWizard from './SourceImportWizard';
import type {
  SourceImportInitialSelection,
  SourceImportWizardProps,
} from './sourceImportWizard/types';
import {
  buildSourceImportTestMetricEvidence,
  buildSourceImportTestObject,
} from './sourceImportWizard/sourceImportWizard.testFixtures';

class TestResizeObserver implements ResizeObserver {
  observe(): void {
    return undefined;
  }

  unobserve(): void {
    return undefined;
  }

  disconnect(): void {
    return undefined;
  }
}

function requireElement<T>(value: T | undefined, errorCode: string): T {
  if (value === undefined) {
    throw new Error(errorCode);
  }

  return value;
}

export function buildSourceObjectCatalogResponder(sourceObjects: readonly SourceObject[]) {
  return async (
    _connectionId: string,
    request: Parameters<IWarehouseSourceImportPort['listSourceObjectCatalog']>[1]
  ): ReturnType<IWarehouseSourceImportPort['listSourceObjectCatalog']> => {
    if (request.kind === 'schema-list') {
      const counts = new Map<string, { catalog: string; schema: string; objectCount: number }>();
      sourceObjects.forEach((sourceObject) => {
        if (sourceObject.locator.kind !== 'relation') return;
        const key = JSON.stringify([sourceObject.locator.catalog, sourceObject.locator.schema]);
        const current = counts.get(key);
        counts.set(key, {
          catalog: sourceObject.locator.catalog,
          schema: sourceObject.locator.schema,
          objectCount: (current?.objectCount ?? 0) + 1,
        });
      });
      return { kind: 'schema-list', schemas: [...counts.values()], truncated: false };
    }
    const relationalObjects = sourceObjects.filter(
      (sourceObject): sourceObject is RelationalSourceObject =>
        sourceObject.locator.kind === 'relation'
    );
    const objects =
      request.kind === 'schema-page'
        ? relationalObjects.filter(
            (sourceObject) =>
              sourceObject.locator.catalog === request.catalog &&
              sourceObject.locator.schema === request.schema
          )
        : relationalObjects.filter((sourceObject) =>
            sourceObject.locator.name.toLowerCase().includes(request.name.toLowerCase())
          );
    return { kind: 'object-page', objects, truncated: false };
  };
}
export function buildWarehouseSourceImportPort(
  overrides?: Partial<IWarehouseSourceImportPort>
): IWarehouseSourceImportPort {
  let receipts: WarehouseConnection[] = [];
  const upsert = (connection: WarehouseConnection) => {
    receipts = [...receipts.filter((item) => item.id !== connection.id), connection];
    return connection;
  };
  return {
    listSourceObjectCatalog: buildSourceObjectCatalogResponder([
      buildSourceObject({
        database: 'RAW',
        schema: 'ERP',
        table: 'ORDERS',
        metricEvidence: buildSourceImportTestMetricEvidence(100, 4096),
      }),
    ]),
    testWarehouseConnection: async (connectionId) => ({
      connectionId,
      status: 'passed',
      checkedAt: '2026-06-08T00:00:00.000Z',
      objectCount: 1,
    }),
    validatePostgresTransformSql: async () => ({ status: 'valid' }),
    importSources: async (input) =>
      buildGraphDraftSourceImportResult({
        canvasId: input.canvasId,
        idempotencyKey: input.idempotencyKey,
        yamlFiles: ['models/sources/erp.yml'],
        options: {
          includeColumns: input.includeColumns,
          addTests: input.addTests,
          addFreshness: input.addFreshness,
        },
      }),
    ...overrides,
    listWarehouseConnections: async () => {
      const current = overrides?.listWarehouseConnections
        ? await overrides.listWarehouseConnections()
        : [
            {
              id: 'conn-1',
              name: 'Local Postgres proof',
              type: 'postgres' as const,
              database: 'dvt',
            },
          ];
      return [
        ...current.filter((item) => !receipts.some((receipt) => receipt.id === item.id)),
        ...receipts,
      ];
    },
    createWarehouseConnection: async (input) =>
      upsert(
        await (overrides?.createWarehouseConnection?.(input) ??
          Promise.resolve({
            id: 'conn-created',
            name: input.name,
            type: input.type,
            database: input.database,
          }))
      ),
    renameWarehouseConnection: async (id, input) =>
      upsert(
        await (overrides?.renameWarehouseConnection?.(id, input) ??
          Promise.resolve({ id, name: input.name, type: 'postgres' as const, database: 'dvt' }))
      ),
  };
}

export function buildSourceObject(
  overrides: Parameters<typeof buildSourceImportTestObject>[0] = {}
): RelationalSourceObject {
  return buildSourceImportTestObject({
    metricEvidence: buildSourceImportTestMetricEvidence(100, 4096),
    columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
    ...overrides,
  });
}

export function createSourceImportWizardHarness() {
  const queryClient = createTestQueryClient();
  let container = document.createElement('div');
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
      ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  (
    globalThis as typeof globalThis & {
      ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
    }
  ).ResizeObserver = TestResizeObserver as unknown as new (
    callback: ResizeObserverCallback
  ) => ResizeObserver;

  async function renderWizard(args?: {
    open?: boolean;
    canvasId?: string;
    warehouseSourceImport?: IWarehouseSourceImportPort;
    sessionContext?: SessionContextPort;
    onClose?: () => void;
    onComplete?: (result: ImportSourcesResult) => void;
    onConnectionRenamed?: SourceImportWizardProps['onConnectionRenamed'];
    sourceImportOptions?: readonly SourceImportOptionContribution[];
    initialSelection?: SourceImportInitialSelection | null;
  }): Promise<void> {
    const node = (
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          ...(args?.sessionContext ? { sessionContext: args.sessionContext } : {}),
          warehouseSourceImport: args?.warehouseSourceImport ?? buildWarehouseSourceImportPort(),
        }}
      >
        <SourceImportWizard
          open={args?.open ?? true}
          canvasId={args?.canvasId ?? 'canvas-orders'}
          onClose={args?.onClose ?? vi.fn()}
          onComplete={args?.onComplete}
          onConnectionRenamed={args?.onConnectionRenamed}
          sourceImportOptions={args?.sourceImportOptions}
          initialSelection={args?.initialSelection}
        />
      </AppServicesProvider>
    );
    if (mounted) await mounted.render(node);
    else {
      mounted = await withTestQueryClient(node, queryClient);
      container = mounted.container;
    }
    if (
      args?.open !== false &&
      (args?.initialSelection == null || args.initialSelection.kind === 'dbt-source-binding')
    ) {
      await waitForReactQuery(
        () => container.querySelector('[data-slot="source-import-connection-summary"]') != null,
        {
          description: 'connection query presentation',
          ...(vi.isFakeTimers()
            ? {
                tick: async () => {
                  await vi.advanceTimersByTimeAsync(0);
                },
              }
            : {}),
        }
      );
    }
  }

  async function flushPendingWork(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  const findNextButton = (): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.trim().startsWith('Next')
    );

  const findTab = (name: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((button) =>
      button.textContent?.includes(name)
    );

  const findButtonContaining = (text: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes(text)
    );

  const findButtonByLabel = (label: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.getAttribute('aria-label') === label
    );

  const findInputByLabel = (label: string): HTMLInputElement | undefined =>
    document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`) ?? undefined;

  const findSelectByLabel = (label: string): HTMLSelectElement | undefined =>
    document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`) ?? undefined;

  const findConnectionOption = (text: string): HTMLButtonElement | undefined =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-slot="source-import-connection-option"]')
    ).find((button) => button.textContent?.includes(text));

  const findSourceObjectInspectionButton = (text: string): HTMLButtonElement | undefined =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-source-import-object] button')
    ).find((button) => button.textContent?.includes(text));

  const findSourceObjectSelectionCheckbox = (objectId: string): HTMLButtonElement | undefined =>
    document.querySelector<HTMLButtonElement>(`[data-source-import-object-select="${objectId}"]`) ??
    undefined;

  const findDatabaseSelection = (database: string): HTMLButtonElement | undefined =>
    document.querySelector<HTMLButtonElement>(
      `[data-source-import-database="${database}"] [role="checkbox"]`
    ) ?? undefined;

  async function expandCollapsedSourceSchemas(): Promise<void> {
    const disclosures = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[data-source-import-schema] [data-slot="collapsible-trigger"][aria-expanded="false"]'
      )
    );
    if (disclosures.length === 0) {
      return;
    }
    await act(async () => {
      disclosures.forEach((disclosure) => {
        disclosure.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    });
  }

  async function clickTab(name: string): Promise<void> {
    const tab = requireElement(findTab(name), `EXPECTED_TAB:${name}`);
    await act(async () => {
      tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickSourceObjectInspectionButton(text: string): Promise<void> {
    if (!findSourceObjectInspectionButton(text)) {
      await expandCollapsedSourceSchemas();
    }
    const node = requireElement(
      findSourceObjectInspectionButton(text),
      `EXPECTED_SOURCE_OBJECT_INSPECTION:${text}`
    );
    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickSourceObjectSelectionCheckbox(objectId: string): Promise<void> {
    if (!findSourceObjectSelectionCheckbox(objectId)) {
      await expandCollapsedSourceSchemas();
    }
    const checkbox = requireElement(
      findSourceObjectSelectionCheckbox(objectId),
      `EXPECTED_SOURCE_OBJECT_SELECTION:${objectId}`
    );
    await act(async () => {
      checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickDatabaseSelection(database: string): Promise<void> {
    const databaseSelection = requireElement(
      findDatabaseSelection(database),
      `EXPECTED_DATABASE_SELECTION:${database}`
    );
    await act(async () => {
      databaseSelection.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickConnectionOption(text: string): Promise<void> {
    const button = requireElement(findConnectionOption(text), `EXPECTED_CONNECTION_OPTION:${text}`);
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickButtonContaining(text: string): Promise<void> {
    const button = requireElement(findButtonContaining(text), `EXPECTED_BUTTON:${text}`);
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickButtonByLabel(label: string): Promise<void> {
    const button = requireElement(findButtonByLabel(label), `EXPECTED_BUTTON_LABEL:${label}`);
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function fillInputByLabel(label: string, value: string): Promise<void> {
    const input = requireElement(findInputByLabel(label), `EXPECTED_INPUT_LABEL:${label}`);
    await act(async () => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function selectByLabel(label: string, value: string): Promise<void> {
    const select = requireElement(findSelectByLabel(label), `EXPECTED_SELECT_LABEL:${label}`);
    await act(async () => {
      select.value = value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  async function cleanup(): Promise<void> {
    await mounted?.cleanup();
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }

  return {
    get container() {
      return container;
    },
    renderWizard,
    flushPendingWork,
    findNextButton,
    findTab,
    findButtonContaining,
    findButtonByLabel,
    findConnectionOption,
    clickTab,
    clickConnectionOption,
    expandCollapsedSourceSchemas,
    clickSourceObjectInspectionButton,
    clickDatabaseSelection,
    clickSourceObjectSelectionCheckbox,
    clickButtonContaining,
    clickButtonByLabel,
    fillInputByLabel,
    selectByLabel,
    cleanup,
  };
}
