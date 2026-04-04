// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import SourceImportWizard from './SourceImportWizard';

function buildWorkspaceService(overrides?: Partial<IWorkspacePort>): IWorkspacePort {
  return {
    getGraphSnapshot: async () => ({ nodes: [], edges: [] }),
    getDiffChanges: async () => [],
    getPlugins: async () => [],
    getRoles: async () => [],
    getAuditLog: async () => [],
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
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  const findNextButton = (): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.trim().startsWith('Next')
    ) as HTMLButtonElement | undefined;

  const findClickableDivByText = (text: string): HTMLDivElement | undefined =>
    Array.from(document.querySelectorAll('div.cursor-pointer')).find((node) =>
      node.textContent?.includes(text)
    ) as HTMLDivElement | undefined;

  it('navigates from source type to connection and selection steps', async () => {
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{
            mode: 'mock',
            workspaceService: buildWorkspaceService(),
          }}
        >
          <SourceImportWizard open={true} onClose={onClose} />
        </AppServicesProvider>
      );
    });

    expect(document.body.textContent).toContain('Choose data source type');

    const nextButton = findNextButton();
    expect(nextButton).toBeTruthy();

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Choose database connection');
    expect(document.body.textContent).toContain('Snowflake PROD');

    const connectionCard = findClickableDivByText('Snowflake PROD');
    expect(connectionCard).toBeTruthy();

    await act(async () => {
      connectionCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const nextButtonAfterConnection = findNextButton();
    await act(async () => {
      nextButtonAfterConnection?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Select Tables');
    expect(document.body.textContent).toContain('ORDERS');
  });

  it('completes import flow and renders result step', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{
            mode: 'mock',
            workspaceService: buildWorkspaceService(),
          }}
        >
          <SourceImportWizard open={true} onClose={vi.fn()} />
        </AppServicesProvider>
      );
    });

    const clickNext = async (): Promise<void> => {
      const button = findNextButton();
      expect(button).toBeTruthy();
      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    };

    await clickNext(); // sourceType -> connection

    const connectionCard = findClickableDivByText('Snowflake PROD');
    expect(connectionCard).toBeTruthy();
    await act(async () => {
      connectionCard?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await clickNext(); // connection -> selection

    const tableRow = findClickableDivByText('ORDERS');
    expect(tableRow).toBeTruthy();
    await act(async () => {
      tableRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await clickNext(); // selection -> grouping
    await clickNext(); // grouping -> options
    await clickNext(); // options -> review

    const registerButton = Array.from(document.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('Register data objects')
    );
    expect(registerButton).toBeTruthy();
    await act(async () => {
      registerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Registry update complete');
    expect(document.body.textContent).toContain('Groups created:');
    expect(document.body.textContent).toContain('models/sources/erp.yml');
  });
});
