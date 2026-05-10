// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportSourcesResult, IWarehouseSourceImportPort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import SourceImportWizard from './SourceImportWizard';

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

function buildWarehouseSourceImportPort(
  overrides?: Partial<IWarehouseSourceImportPort>
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () => [
      {
        id: 'conn-1',
        name: 'Snowflake PROD',
        type: 'snowflake',
        database: 'RAW',
      },
    ],
    listWarehouseTables: async () => [
      {
        database: 'RAW',
        schema: 'ERP',
        table: 'ORDERS',
        rowCount: 100,
      },
    ],
    importSources: async () => ({
      success: true,
      sourcesCreated: 1,
      tablesImported: 1,
      yamlFiles: ['models/sources/erp.yml'],
      importedNodeIds: ['src_erp_orders'],
      grouping: 'schema',
      options: {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    }),
    ...overrides,
  };
}

describe('SourceImportWizard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  async function renderWizard(args?: {
    warehouseSourceImport?: IWarehouseSourceImportPort;
    onClose?: () => void;
    onComplete?: (result: ImportSourcesResult) => void;
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
            open={true}
            onClose={args?.onClose ?? vi.fn()}
            onComplete={args?.onComplete}
          />
        </AppServicesProvider>
      );
    });
  }

  const findNextButton = (): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.trim().startsWith('Next')
    );

  const findButtonContaining = (text: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes(text)
    );

  const findClickableDivByText = (text: string): HTMLDivElement | undefined =>
    Array.from(document.querySelectorAll<HTMLDivElement>('div.cursor-pointer')).find((node) =>
      node.textContent?.includes(text)
    );

  const clickNext = async (): Promise<void> => {
    const button = requireElement(findNextButton(), 'EXPECTED_NEXT_BUTTON');
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const clickClickableDivByText = async (text: string): Promise<void> => {
    const node = requireElement(findClickableDivByText(text), `EXPECTED_CLICKABLE_DIV:${text}`);
    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const clickButtonContaining = async (text: string): Promise<void> => {
    const button = requireElement(findButtonContaining(text), `EXPECTED_BUTTON:${text}`);
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  it('navigates from source type to connection and selection steps', async () => {
    const onClose = vi.fn();

    await renderWizard({ onClose });

    expect(document.body.textContent).toContain('Choose data source type');

    await clickNext();

    expect(document.body.textContent).toContain('Choose database connection');
    expect(document.body.textContent).toContain('Snowflake PROD');

    await clickClickableDivByText('Snowflake PROD');
    await clickNext();

    expect(document.body.textContent).toContain('Select Tables');
    expect(document.body.textContent).toContain('ORDERS');
  });

  it('completes import flow, applies imported sources immediately, and renders a passive result step', async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    await renderWizard({ onClose, onComplete });

    await clickNext(); // sourceType -> connection

    await clickClickableDivByText('Snowflake PROD');

    await clickNext(); // connection -> selection

    await clickClickableDivByText('ORDERS');

    await clickNext(); // selection -> grouping
    await clickNext(); // grouping -> options
    await clickNext(); // options -> review

    await clickButtonContaining('Register data objects');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        importedNodeIds: ['src_erp_orders'],
      })
    );
    expect(document.body.textContent).toContain('Registry update complete');
    expect(document.body.textContent).toContain('Groups created:');
    expect(document.body.textContent).toContain('models/sources/erp.yml');
    expect(document.body.textContent).toContain(
      'Canvas queued the imported source ids and will focus them when protected draft authority refreshes'
    );
    expect(document.body.textContent).not.toContain('Add imported sources to canvas');

    await clickButtonContaining('Done');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('surfaces a no-op result when the selected sources already exist and does not fire the canvas handoff', async () => {
    const onComplete = vi.fn();

    await renderWizard({
      onComplete,
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources: async () => ({
          success: true,
          sourcesCreated: 0,
          tablesImported: 1,
          yamlFiles: ['models/sources/erp.yml'],
          importedNodeIds: [],
          grouping: 'schema',
          options: {
            includeColumns: false,
            addTests: false,
            addFreshness: false,
          },
        }),
      }),
    });

    await clickNext();

    await clickClickableDivByText('Snowflake PROD');

    await clickNext();

    await clickClickableDivByText('ORDERS');

    await clickNext();
    await clickNext();
    await clickNext();

    await clickButtonContaining('Register data objects');

    expect(onComplete).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('No new data objects were added');
    expect(document.body.textContent).toContain('Canvas stayed unchanged');
  });
});
