// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { vi } from 'vitest';

import type {
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  RelationalSourceObject,
} from '../ports/workspace';
import type { SourceImportOptionContribution } from '../plugins/registry';
import { AppServicesProvider } from '../services/AppServicesContext';
import SourceImportWizard from './SourceImportWizard';
import type { SourceImportInitialSelection } from './sourceImportWizard/types';
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

export function buildWarehouseSourceImportPort(
  overrides?: Partial<IWarehouseSourceImportPort>
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () => [
      {
        id: 'conn-1',
        name: 'Local Postgres proof',
        type: 'postgres',
        database: 'dvt',
      },
    ],
    listSourceObjects: async () => [
      buildSourceObject({
        database: 'RAW',
        schema: 'ERP',
        table: 'ORDERS',
        metricEvidence: buildSourceImportTestMetricEvidence(100, 4096),
      }),
    ],
    createWarehouseConnection: async (input) => ({
      id: 'conn-created',
      name: input.name,
      type: input.type,
      database: input.database,
    }),
    testWarehouseConnection: async (connectionId) => ({
      connectionId,
      status: 'passed',
      checkedAt: '2026-06-08T00:00:00.000Z',
      objectCount: 1,
    }),
    importSources: async (input) => ({
      success: true,
      draftRevision: 'draft-revision-2',
      sourcesCreated: 1,
      objectsImported: 1,
      yamlFiles: ['models/sources/erp.yml'],
      importedNodeIds: ['src_erp_orders'],
      grouping: 'schema',
      options: {
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
      },
    }),
    ...overrides,
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
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
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
    warehouseSourceImport?: IWarehouseSourceImportPort;
    onClose?: () => void;
    onComplete?: (result: ImportSourcesResult) => void;
    sourceImportOptions?: readonly SourceImportOptionContribution[];
    initialSelection?: SourceImportInitialSelection | null;
  }): Promise<void> {
    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{
            ...createAppServicesTestOverrides(),
            warehouseSourceImport: args?.warehouseSourceImport ?? buildWarehouseSourceImportPort(),
          }}
        >
          <SourceImportWizard
            open={args?.open ?? true}
            onClose={args?.onClose ?? vi.fn()}
            onComplete={args?.onComplete}
            sourceImportOptions={args?.sourceImportOptions}
            initialSelection={args?.initialSelection}
          />
        </AppServicesProvider>
      );
    });
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

  async function clickTab(name: string): Promise<void> {
    const tab = requireElement(findTab(name), `EXPECTED_TAB:${name}`);
    await act(async () => {
      tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickSourceObjectInspectionButton(text: string): Promise<void> {
    const node = requireElement(
      findSourceObjectInspectionButton(text),
      `EXPECTED_SOURCE_OBJECT_INSPECTION:${text}`
    );
    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function clickSourceObjectSelectionCheckbox(objectId: string): Promise<void> {
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

  function cleanup(): void {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }

  return {
    container,
    renderWizard,
    flushPendingWork,
    findNextButton,
    findTab,
    findButtonContaining,
    findButtonByLabel,
    findConnectionOption,
    clickTab,
    clickConnectionOption,
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
