import { describe, expect, it } from 'vitest';

import type { WorkspaceFileEntry } from '../../ports/workspace';
import { ApiError } from '../api/createApiClient';
import { createMockWorkspaceService, createMockWorkspaceState } from './workspaceService.mock';
import { createApiWorkspaceService } from './workspaceService.api';
import { createWorkspaceService } from './workspaceService';
import { WorkspaceFileLoadError, WORKSPACE_HTTP_ERROR_REASON } from './workspaceErrors';

function flattenWorkspaceEntries(entries: readonly WorkspaceFileEntry[]): string[] {
  return entries.flatMap((entry) => [
    entry.path,
    ...(entry.children ? flattenWorkspaceEntries(entry.children) : []),
  ]);
}

describe('workspaceService source import', () => {
  it('imports selected warehouse tables into the mock workspace graph', async () => {
    const service = createWorkspaceService('mock');
    const before = await service.getGraphSnapshot();

    const result = await service.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'FINANCE',
          table: 'INVOICES',
          rowCount: 1200,
          columns: [
            { name: 'invoice_id', type: 'INTEGER', nullable: false },
            { name: 'customer_id', type: 'INTEGER', nullable: false },
          ],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const after = await service.getGraphSnapshot();
    const importedNode = after.nodes.find((node) => node.id === 'src_finance_invoices');

    expect(result.success).toBe(true);
    expect(result.sourcesCreated).toBe(1);
    expect(result.tablesImported).toBe(1);
    expect(result.yamlFiles).toEqual(['models/sources/src_finance.yml']);
    expect(after.nodes).toHaveLength(before.nodes.length + 1);
    expect(importedNode).toMatchObject({
      id: 'src_finance_invoices',
      type: 'SOURCE',
      path: 'models/sources/src_finance.yml',
    });
    expect(importedNode?.columns).toEqual([
      { name: 'invoice_id', type: 'INTEGER', nullable: false },
      { name: 'customer_id', type: 'INTEGER', nullable: false },
    ]);
  });

  it('isolates graph mutations between default mock service instances', async () => {
    const firstService = createWorkspaceService('mock');
    const secondService = createWorkspaceService('mock');
    const secondBefore = await secondService.getGraphSnapshot();

    await firstService.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'OPERATIONS',
          table: 'SHIPMENTS',
          rowCount: 6400,
          columns: [{ name: 'shipment_id', type: 'INTEGER', nullable: false }],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const firstAfter = await firstService.getGraphSnapshot();
    const secondAfter = await secondService.getGraphSnapshot();

    expect(firstAfter.nodes.some((node) => node.id === 'src_operations_shipments')).toBe(true);
    expect(secondAfter.nodes.some((node) => node.id === 'src_operations_shipments')).toBe(false);
    expect(secondAfter.nodes).toHaveLength(secondBefore.nodes.length);
  });

  it('shares mutable mock workspace state only when explicitly requested', async () => {
    const sharedState = createMockWorkspaceState();
    const firstService = createMockWorkspaceService(sharedState);
    const secondService = createMockWorkspaceService(sharedState);

    await firstService.importSources({
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'SUPPORT',
          table: 'TICKETS',
          rowCount: 1500,
          columns: [{ name: 'ticket_id', type: 'INTEGER', nullable: false }],
        },
      ],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });

    const secondAfter = await secondService.getGraphSnapshot();

    expect(secondAfter.nodes.some((node) => node.id === 'src_support_tickets')).toBe(true);
  });

  it('keeps file-content edits local to each default mock service instance', async () => {
    const firstService = createWorkspaceService('mock');
    const secondService = createWorkspaceService('mock');
    const original = await secondService.getFileContent('README.md');

    await firstService.saveFileContent('README.md', '# Mutated in first instance only');

    const firstAfter = await firstService.getFileContent('README.md');
    const secondAfter = await secondService.getFileContent('README.md');

    expect(firstAfter.content).toBe('# Mutated in first instance only');
    expect(secondAfter.content).toBe(original.content);
  });

  it('returns a unique default file tree without duplicated workspace paths', async () => {
    const service = createWorkspaceService('mock');

    const fileTree = flattenWorkspaceEntries(await service.listFiles());

    expect(fileTree).toContain('models/staging');
    expect(fileTree).toContain('models/marts');
    expect(fileTree).toContain('models/staging/stg_orders.sql');
    expect(fileTree).toContain('models/staging/stg_customers.sql');
    expect(fileTree).toContain('models/marts/dim_store.sql');
    expect(new Set(fileTree).size).toBe(fileTree.length);
  });

  it('adds newly saved files to the instance-local file tree', async () => {
    const firstService = createWorkspaceService('mock');
    const secondService = createWorkspaceService('mock');
    const newFilePath = 'models/generated/new_model.sql';

    await firstService.saveFileContent(newFilePath, 'select 1 as id');

    const firstTree = flattenWorkspaceEntries(await firstService.listFiles());
    const secondTree = flattenWorkspaceEntries(await secondService.listFiles());
    const firstFile = await firstService.getFileContent(newFilePath);

    expect(firstTree).toContain('models/generated');
    expect(firstTree).toContain(newFilePath);
    expect(secondTree).not.toContain(newFilePath);
    expect(firstFile.content).toBe('select 1 as id');
  });

  it('maps missing mock files to a typed workspace file load error', async () => {
    const service = createWorkspaceService('mock');

    await expect(service.getFileContent('models/missing.sql')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceFileLoadError>>({
        name: 'WorkspaceFileLoadError',
        kind: 'not_found',
        path: 'models/missing.sql',
      })
    );
  });

  it('maps canonical workspace file-not-found envelopes to a typed workspace file load error', async () => {
    const service = createApiWorkspaceService({
      baseUrl: '',
      requestRaw: async () => {
        throw new Error('not used in this test');
      },
      getJson: async () => {
        throw new ApiError({
          message: 'Request to /workspace/files/models%2Fmissing.sql failed (404)',
          endpoint: '/workspace/files/models%2Fmissing.sql',
          statusCode: 404,
          category: 'client',
          responseBody: {
            error: {
              type: 'not_found',
              reason: WORKSPACE_HTTP_ERROR_REASON.fileNotFound,
            },
          },
        });
      },
      postJson: async () => {
        throw new Error('not used in this test');
      },
    });

    await expect(service.getFileContent('models/missing.sql')).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceFileLoadError>>({
        name: 'WorkspaceFileLoadError',
        kind: 'not_found',
        path: 'models/missing.sql',
      })
    );
  });

  it('does not collapse unrelated not-found envelopes into workspace file load errors', async () => {
    const unrelatedNotFound = new ApiError({
      message: 'Request to /workspace/files/models%2Fmissing.sql failed (404)',
      endpoint: '/workspace/files/models%2Fmissing.sql',
      statusCode: 404,
      category: 'client',
      responseBody: {
        error: {
          type: 'not_found',
          reason: 'run_not_found',
        },
      },
    });

    const service = createApiWorkspaceService({
      baseUrl: '',
      requestRaw: async () => {
        throw new Error('not used in this test');
      },
      getJson: async () => {
        throw unrelatedNotFound;
      },
      postJson: async () => {
        throw new Error('not used in this test');
      },
    });

    await expect(service.getFileContent('models/missing.sql')).rejects.toBe(unrelatedNotFound);
  });

  it('fails explicitly in api mode until the backend endpoint exists', async () => {
    const service = createWorkspaceService('api');

    await expect(service.listWarehouseConnections()).rejects.toThrow(
      'Warehouse source import is not available in API mode'
    );
    await expect(
      service.importSources({
        connectionId: 'conn-1',
        tables: [],
        groupingStrategy: 'schema',
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      })
    ).rejects.toThrow('Warehouse source import is not available in API mode');
  });
});
