import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(process.cwd(), '../..');

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('warehouse source import command/query rails architecture', () => {
  it('keeps warehouse provider creation scoped to the supported provider catalog', () => {
    const port = read('apps/api/src/application/ports/warehouseSourceImport.ts');
    const routeModule = read('apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts');

    expect(port).toContain('SUPPORTED_WAREHOUSE_CONNECTION_TYPES');
    expect(port).toContain("['postgres'] as const");
    expect(port).not.toContain(
      "export type WarehouseConnectionType = 'snowflake' | 'bigquery' | 'redshift' | 'postgres'"
    );
    expect(routeModule).toContain('SUPPORTED_WAREHOUSE_CONNECTION_TYPES');
    expect(routeModule).not.toContain("input === 'snowflake'");
    expect(routeModule).not.toContain("input === 'bigquery'");
    expect(routeModule).not.toContain("input === 'redshift'");
  });

  it('catalogs the protected warehouse source import rails before route registration', () => {
    const vocabulary = read('apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts');
    const rails = read(
      'apps/api/src/application/ports/protectedRuntimeWorkspaceCommandQueryRails.ts'
    );

    expect(vocabulary).toContain('ListWarehouseConnections');
    expect(vocabulary).toContain('ListWarehouseConnectionTables');
    expect(vocabulary).toContain('CreateWarehouseConnection');
    expect(vocabulary).toContain('TestWarehouseConnection');
    expect(vocabulary).toContain('ImportWarehouseSources');
    expect(rails).toContain('warehouseSourceImport');
    expect(vocabulary).toContain('workspace:source-import:view');
    expect(vocabulary).toContain('workspace:source-connection:create');
    expect(vocabulary).toContain('workspace:source-connection:test');
    expect(vocabulary).toContain('workspace:source-import:import');
  });

  it('registers protected API routes instead of leaving the web adapter as authority', () => {
    const routeRegistration = read(
      'apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts'
    );
    const routeGroup = read('apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts');
    const routeModule = read('apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts');
    const webAdapter = read('apps/web/src/app/services/workspace/workspacePorts.api.ts');

    expect(routeRegistration).toContain('registerProtectedWarehouseSourceImportRouteGroup');
    expect(routeGroup).toContain('WorkspaceWarehouseConnectionCatalog');
    expect(routeGroup).toContain('LocalWorkspaceFileRepository');
    expect(routeGroup).not.toContain('createDefaultWarehouseConnectionCatalog');
    expect(routeGroup).not.toContain('InMemoryWarehouseConnectionCatalog');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.warehouseConnections');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.warehouseConnectionTables');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.warehouseConnectionTest');
    expect(routeModule).toContain('RUNTIME_ROUTE_PATH.warehouseSourcesImport');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceSourceImportView');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceSourceConnectionCreate');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceSourceConnectionTest');
    expect(routeModule).toContain('AUTHORIZATION_ACTION.workspaceSourceImportImport');
    expect(webAdapter).not.toContain('warehouseImportApiModeUnavailable');
    expect(webAdapter).not.toContain('sourceImportAvailable: false');
  });
});
